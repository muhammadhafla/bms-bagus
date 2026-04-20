import { create } from 'zustand';
import { createClient, User } from '@supabase/supabase-js';
import { safeQuery } from '@/lib/api/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js/2.x',
    },
  },
});

interface Profile {
  id: string;
  nama: string;
  email?: string;
  role: 'admin' | 'staff';
  created_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  isRefreshing: boolean;
  sessionExpiryTime: number | null;
  sessionWarningShown: boolean;
  supabase: typeof supabase;
  authSubscription: { unsubscribe: () => void } | null;
  isAdmin: () => boolean;
  isStaff: () => boolean;
  refreshLock: () => void;
  releaseRefreshLock: () => void;
  setSessionExpiry: (expiryTimestamp: number) => void;
  refreshSession: () => Promise<boolean>;
  checkAndRefreshSession: () => Promise<boolean>;
  initialize: () => Promise<void>;
  cleanup: () => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  _setProfileIfLatest: (fetchId: number, profile: Profile | null, userId: string) => void;
}

// Module-level fetch ID counter to prevent stale profile overwrites
let profileFetchSeq = 0;

const fetchProfile = async (userId: string): Promise<Profile | null> => {
  try {
    console.log('[fetchProfile] Attempting to fetch profile for userId:', userId);
    
    const result = await safeQuery<Profile>(async () => {
      const response = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      return { 
        data: response.data as Profile | null, 
        error: response.error as Error | null 
      };
    });

    if (result.error) {
      console.error('[fetchProfile] Error fetching profile:', result.error);
      return null;
    }

    console.log('[fetchProfile] Success:', result.data);
    return result.data;
  } catch (err) {
    console.error('[fetchProfile] Exception:', err);
    return null;
  }
};

const MAX_RETRY = 3;
const RETRY_DELAY = 1000;

async function retryWithBackoff<T>(fn: () => Promise<T>, retries = MAX_RETRY): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
      }
    }
  }
  throw lastError;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  isRefreshing: false,
  sessionExpiryTime: null,
  sessionWarningShown: false,
  supabase,
  authSubscription: null,

  isAdmin: () => {
    const profile = get().profile;
    return profile?.role?.toLowerCase() === 'admin';
  },

  isStaff: () => {
    const profile = get().profile;
    return profile?.role?.toLowerCase() === 'staff';
  },

  refreshLock: () => {
    set({ isRefreshing: true });
  },

  releaseRefreshLock: () => {
    set({ isRefreshing: false });
  },

  // Internal: set profile only if this fetch is the latest
  _setProfileIfLatest: (fetchId: number, profile: Profile | null, userId: string) => {
    // Check if this fetch is still the latest
    if (fetchId !== profileFetchSeq) {
      console.log(`Stale profile fetch ignored (id=${fetchId}, latest=${profileFetchSeq})`);
      return;
    }
    const currentUser = get().user;
    if (!profile) {
      console.error('Profile fetch returned null for user', userId);
      return;
    }
    if (!currentUser || currentUser.id !== userId) {
      console.log('Profile fetch user mismatch', { fetchUserId: userId, currentUserId: currentUser?.id });
      return;
    }
    console.log(`Setting profile (id=${fetchId}):`, profile.role);
    set({ profile });
  },

  setSessionExpiry: (expiryTimestamp: number) => {
    const { sessionWarningShown } = get();
    set({ sessionExpiryTime: expiryTimestamp });

    // Schedule warning 5 minutes before expiry
    const warningTime = expiryTimestamp - (5 * 60 * 1000);
    const now = Date.now();

    if (warningTime > now && !sessionWarningShown) {
      setTimeout(() => {
        const currentExpiry = get().sessionExpiryTime;
        if (currentExpiry === expiryTimestamp && !get().sessionWarningShown) {
          // Use custom event to show toast from UI layer
          window.dispatchEvent(new CustomEvent('auth:session-warning', {
            detail: { message: 'Sesi Anda akan berakhir dalam 5 menit. Silakan refresh halaman.' }
          }));
          set({ sessionWarningShown: true });
        }
      }, warningTime - now);
    }
  },

  refreshSession: async () => {
    const { isRefreshing } = get();
    
    // If already refreshing, wait a bit and check if it succeeded
    if (isRefreshing) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const { user } = get();
      return !!user;
    }

    set({ isRefreshing: true });

    try {
      // Use explicit refreshSession instead of getSession
      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.error('Session refresh failed:', error);
        set({ user: null, profile: null, isRefreshing: false, initialized: true });
        return false;
      }

      // Fetch profile with guard
      const fetchId = ++profileFetchSeq;
      const profile = await fetchProfile(data.session.user.id);
      get()._setProfileIfLatest(fetchId, profile, data.session.user.id);

      // Always update user and session expiry
      set({ 
        user: data.session.user, 
        isRefreshing: false,
        initialized: true 
      });

      if (data.session.expires_at) {
        get().setSessionExpiry(data.session.expires_at * 1000);
      }

      return true;
    } catch (error) {
      console.error('Session refresh exception:', error);
      set({ user: null, profile: null, isRefreshing: false, initialized: true });
      return false;
    }
  },

  checkAndRefreshSession: async () => {
    const { user, isRefreshing } = get();

    // If no user, try to refresh to restore session
    if (!user) {
      if (isRefreshing) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return !!get().user;
      }
      return await get().refreshSession();
    }

    // User exists, check session status
    try {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        // Session invalid, force refresh
        return await get().refreshSession();
      }

      // Session exists and belongs to current user
      if (data.session.user.id !== user.id) {
        const profile = await fetchProfile(data.session.user.id);
        set({ user: data.session.user, profile });
      }

      // Update expiry tracking
      if (data.session.expires_at) {
        const expiresAt = data.session.expires_at * 1000;
        get().setSessionExpiry(expiresAt);

        // If session expires within 1 minute, proactively refresh
        const timeLeft = expiresAt - Date.now();
        if (timeLeft < 60 * 1000) {
          console.log('Session expiring soon, refreshing...', { timeLeft: Math.round(timeLeft/1000) + 's' });
          return await get().refreshSession();
        }
      }

      return true;
    } catch (error) {
      console.error('Session check failed:', error);
      return await get().refreshSession();
    }
  },

  cleanup: () => {
    const { authSubscription } = get();
    if (authSubscription) {
      authSubscription.unsubscribe();
    }
    set({ 
      authSubscription: null, 
      isRefreshing: false,
      sessionExpiryTime: null,
      sessionWarningShown: false 
    });
  },

  initialize: async () => {
    // Guard: prevent re-initialization if already done
    const { initialized } = get();
    if (initialized) return;

    try {
      // Unsubscribe existing subscription before creating new one
      const existingSubscription = get().authSubscription;
      if (existingSubscription) {
        existingSubscription.unsubscribe();
      }

      // Track last user ID to prevent stale event updates
      let lastUserId: string | null = null;

      // Set up auth state change listener - fires immediately with current session
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth event:', event, session?.user?.id);
          const eventUserId = session?.user?.id || null;

          // Prevent stale events from previous user
          if (eventUserId && lastUserId && eventUserId !== lastUserId) {
            console.log('Ignoring stale event for previous user:', lastUserId);
            return;
          }

          switch (event) {
            case 'SIGNED_OUT':
              lastUserId = null;
              set({ user: null, profile: null, initialized: true, isRefreshing: false });
              break;

            case 'TOKEN_REFRESHED':
              if (!session) {
                lastUserId = null;
                set({ user: null, profile: null });
                return;
              }
              // Token refreshed, update user
              set({ user: session.user });
              if (session.expires_at) {
                get().setSessionExpiry(session.expires_at * 1000);
              }
              // Fetch profile with guard
              const fetchId = ++profileFetchSeq;
              fetchProfile(session.user.id).then(profile => {
                get()._setProfileIfLatest(fetchId, profile, session.user.id);
              }).catch(err => {
                console.error('Profile fetch error (TOKEN_REFRESHED):', err);
              });
              break;

            case 'SIGNED_IN':
            case 'INITIAL_SESSION':
              if (session?.user) {
                lastUserId = session.user.id;
                const userId = session.user.id;
                // Set user and initialized immediately to unblock UI
                set({ 
                  user: session.user, 
                  initialized: true, 
                  isRefreshing: false 
                });
                // Set session expiry tracking
                if (session.expires_at) {
                  get().setSessionExpiry(session.expires_at * 1000);
                }
                // Fetch profile with guard
                const fetchId = ++profileFetchSeq;
                fetchProfile(userId).then(profile => {
                  get()._setProfileIfLatest(fetchId, profile, userId);
                }).catch(err => {
                  console.error('Profile fetch error (SIGNED_IN):', err);
                });
              } else {
                lastUserId = null;
                set({ user: null, profile: null, initialized: true, isRefreshing: false });
              }
              break;

            case 'USER_UPDATED':
              if (session?.user) {
                const userId = session.user.id;
                const fetchId = ++profileFetchSeq;
                const profile = await fetchProfile(userId);
                get()._setProfileIfLatest(fetchId, profile, userId);
                // Always update user
                set({ user: session.user });
                if (session.expires_at) {
                  get().setSessionExpiry(session.expires_at * 1000);
                }
              }
              break;

            case 'MFA_CHALLENGE_VERIFIED':
              if (session?.user) {
                lastUserId = session.user.id;
                const userId = session.user.id;
                const fetchId = ++profileFetchSeq;
                const profile = await fetchProfile(userId);
                get()._setProfileIfLatest(fetchId, profile, userId);
                // Always update user
                set({ user: session.user });
                if (session.expires_at) {
                  get().setSessionExpiry(session.expires_at * 1000);
                }
              }
              break;

            default:
              console.warn('Unhandled auth event:', event);
              lastUserId = null;
              set({ user: null, profile: null, initialized: true, isRefreshing: false });
          }
        }
      );

      set({ authSubscription: subscription });

      // Safety timeout: if initialization hasn't completed within 10 seconds, force ready state
      setTimeout(() => {
        if (!get().initialized) {
          console.warn('Auth initialization timeout - forcing initialized');
          set({ initialized: true, user: null, profile: null });
        }
      }, 10000);

    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, profile: null, initialized: true, isRefreshing: false });
    }
  },

  signIn: async (email: string, password: string) => {
    const { isRefreshing } = get();
    
    // Prevent concurrent sign-ins
    if (isRefreshing || get().loading) {
      return { success: false, error: 'Masih memproses permintaan sebelumnya' };
    }

    set({ loading: true, isRefreshing: true });

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ loading: false, isRefreshing: false });
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Fetch profile with guard
        const fetchId = ++profileFetchSeq;
        const profile = await fetchProfile(data.user.id);
        
        const baseState = { 
          user: data.user, 
          loading: false, 
          isRefreshing: false,
          initialized: true 
        };
        
        // Set session expiry tracking
        if (data.session?.expires_at) {
          get().setSessionExpiry(data.session.expires_at * 1000);
        }
        
        if (profile) {
          get()._setProfileIfLatest(fetchId, profile, data.user.id);
        } else {
          console.error('Failed to fetch profile in signIn for user', data.user.id);
        }
        
        // Always set user and other state
        set(baseState);
      }

      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      set({ loading: false, isRefreshing: false });
      return { success: false, error: 'Terjadi kesalahan saat login' };
    }
  },

  signOut: async () => {
    const { authSubscription } = get();

    // Unsubscribe first to prevent auth state updates during signout
    if (authSubscription) {
      authSubscription.unsubscribe();
      set({ authSubscription: null, isRefreshing: true });
    }

    const logout = async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    };

    try {
      await retryWithBackoff(logout);

      // Clear state only on successful signout
      set({
        user: null,
        profile: null,
        loading: false,
        initialized: true,
        authSubscription: null,
        isRefreshing: false,
        sessionExpiryTime: null,
        sessionWarningShown: false
      });
    } catch (error) {
      console.warn('Sign out failed, forcing local logout:', error);

      // Force local logout even if server signout failed
      try {
        if (typeof window !== 'undefined') {
          const projectRef = supabaseUrl.split('//')[1]?.split('.')[0] || 'auth';

          // Remove all Supabase auth tokens (based on Supabase storageKey pattern)
          const keysToRemove = [
            `sb-${projectRef}-auth-token`,
            `sb-${projectRef}-refresh-token`,
            `sb-${projectRef}-persisted-session`,
            'supabase.auth.token'
          ];

          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          });
        }
      } catch (e) {
        console.error('Failed to clear auth storage:', e);
      }

      set({
        user: null,
        profile: null,
        loading: false,
        initialized: true,
        authSubscription: null,
        isRefreshing: false,
        sessionExpiryTime: null,
        sessionWarningShown: false
      });
    }
  },
}));
