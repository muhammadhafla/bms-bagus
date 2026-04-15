import { create } from 'zustand';
import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  created_at: string;
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  supabase: typeof supabase;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  isAdmin: () => boolean;
  isStaff: () => boolean;
}

const fetchProfile = async (userId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return data as Profile | null;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: false,
  initialized: false,
  supabase,

  isAdmin: () => {
    const profile = get().profile;
    return profile?.role === 'admin';
  },

  isStaff: () => {
    const profile = get().profile;
    return profile?.role === 'staff';
  },

  initialize: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          console.error('Sign out error:', signOutError);
        }
        set({ user: null, profile: null, initialized: true });
        return;
      }

      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        set({ user: session.user, profile, initialized: true });
      } else {
        set({ user: null, profile: null, initialized: true });
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          set({ user: session.user, profile });
        } else {
          set({ user: null, profile: null });
        }
      });

    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ user: null, profile: null, initialized: true });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    set({ loading: false });

    if (error) {
      return { success: false, error: error.message };
    }
    
    const profile = await fetchProfile(data.user.id);
    set({ user: data.user, profile });
    
    return { success: true };
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase sign out error:', error);
    }
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('auth') || key.includes('supabase'))) {
        localStorage.removeItem(key);
      }
    }
    
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('auth') || key.includes('supabase'))) {
        sessionStorage.removeItem(key);
      }
    }
    
    set({ user: null, profile: null, loading: false, initialized: true });
    window.location.replace('/login');
  },
}));
