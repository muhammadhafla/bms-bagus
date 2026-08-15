import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  onlineUsers: string[];
  channel: RealtimeChannel | null;
  initializePresence: (userId: string) => Promise<void>;
  cleanupPresence: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: [],
  channel: null,

  initializePresence: async (userId: string) => {
    // Cleanup existing channel if any
    const existingChannel = get().channel;
    if (existingChannel) {
      await existingChannel.unsubscribe();
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers = Object.keys(state);
        set({ onlineUsers: activeUsers });
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        set((state) => ({
          onlineUsers: Array.from(new Set([...state.onlineUsers, key])),
        }));
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        // Only remove if this was the last connection for this user
        // (handled gracefully by sync, but we can do it here optimistically)
        const state = channel.presenceState();
        const activeUsers = Object.keys(state);
        set({ onlineUsers: activeUsers });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    set({ channel });
  },

  cleanupPresence: () => {
    const { channel } = get();
    if (channel) {
      channel.unsubscribe();
    }
    set({ channel: null, onlineUsers: [] });
  },
}));
