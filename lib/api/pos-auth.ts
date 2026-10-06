import { supabase } from './client';
import { safeQuery } from './utils';
import { PosAuthorization, PosAuthFilter } from '@/types/pos-auth';

export const posAuthApi = {
  /**
   * Mengambil semua permohonan otorisasi yang sedang aktif (pending dan belum kedaluwarsa)
   */
  async getActiveRequests() {
    return safeQuery<PosAuthorization[]>(async () => {
      const now = new Date().toISOString();
      const result = await supabase
        .from('pos_authorizations')
        .select('*')
        .eq('status', 'pending')
        .gt('expires_at', now)
        .order('created_at', { ascending: false });

      return { data: result.data as PosAuthorization[] | null, error: result.error as Error | null };
    });
  },

  /**
   * Menarik permohonan otorisasi oleh admin/kepala gudang (Claim Task)
   */
  async claim(id: string) {
    return safeQuery<{ success: boolean; pin_code: string; claimed_by_name: string; message: string }>(
      async () => {
        const { data, error } = await supabase.rpc('claim_pos_authorization', {
          p_id: id,
        });

        return {
          data: data as { success: boolean; pin_code: string; claimed_by_name: string; message: string } | null,
          error: error as Error | null,
        };
      },
      { isMutation: true }
    );
  },

  /**
   * Melepas tugas otorisasi kembali ke antrean umum (Release Task)
   */
  async release(id: string) {
    return safeQuery<{ success: boolean; message: string }>(
      async () => {
        const { data, error } = await supabase.rpc('release_pos_authorization', {
          p_id: id,
        });

        return {
          data: data as { success: boolean; message: string } | null,
          error: error as Error | null,
        };
      },
      { isMutation: true }
    );
  },

  /**
   * Mengambil alih tugas dari admin lain (Take Over Task)
   */
  async takeover(id: string) {
    return safeQuery<{ success: boolean; pin_code: string; claimed_by_name: string; message: string }>(
      async () => {
        const { data, error } = await supabase.rpc('takeover_pos_authorization', {
          p_id: id,
        });

        return {
          data: data as { success: boolean; pin_code: string; claimed_by_name: string; message: string } | null,
          error: error as Error | null,
        };
      },
      { isMutation: true }
    );
  },

  /**
   * Mengambil riwayat permohonan otorisasi dengan paginasi dan filter
   */
  async getHistory(filter?: PosAuthFilter) {
    return safeQuery<{ data: PosAuthorization[]; count: number }>(async () => {
      const page = filter?.page || 1;
      const limit = filter?.limit || 15;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('pos_authorizations')
        .select('*', { count: 'exact' });

      if (filter?.status && filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }

      if (filter?.action_type && filter.action_type !== 'all') {
        query = query.eq('action_type', filter.action_type);
      }

      if (filter?.search) {
        query = query.or(
          `cashier_name.ilike.%${filter.search}%,gudang_name.ilike.%${filter.search}%,device_name.ilike.%${filter.search}%,claimed_by_name.ilike.%${filter.search}%`
        );
      }

      query = query
        .order('created_at', { ascending: false })
        .range(from, to);

      const result = await query;
      return {
        data: {
          data: (result.data || []) as PosAuthorization[],
          count: result.count || 0,
        },
        error: result.error as Error | null,
      };
    });
  },

  /**
   * Menolak permohonan otorisasi secara langsung oleh Admin / Kepala Gudang
   */
  async rejectRequest(id: string) {
    return safeQuery<{ success: boolean; message: string }>(
      async () => {
        const { data, error } = await supabase.rpc('reject_pos_authorization', {
          p_id: id,
        });

        return { data: data as { success: boolean; message: string } | null, error: error as Error | null };
      },
      { isMutation: true }
    );
  },

  /**
   * Meminta otorisasi baru (digunakan oleh kasir)
   */
  async requestAuthorization(
    actionType: string = 'access_settings',
    gudangId?: string,
    deviceName?: string,
    actionMetadata?: Record<string, any>
  ) {
    return safeQuery<{ success: boolean; request_id: string; expires_at: string; message: string }>(
      async () => {
        const { data, error } = await supabase.rpc('request_pos_authorization', {
          p_action_type: actionType,
          p_gudang_id: gudangId || null,
          p_device_name: deviceName || null,
          p_action_metadata: actionMetadata || {},
        });

        return {
          data: data as { success: boolean; request_id: string; expires_at: string; message: string } | null,
          error: error as Error | null,
        };
      },
      { isMutation: true }
    );
  },

  /**
   * Verifikasi PIN otorisasi
   */
  async verifyPin(pin: string, actionType: string = 'access_settings', gudangId?: string) {
    return safeQuery<{ success: boolean; message: string; attempts_remaining?: number; is_blocked?: boolean }>(
      async () => {
        const { data, error } = await supabase.rpc('verify_pos_authorization', {
          p_pin: pin,
          p_action_type: actionType,
          p_gudang_id: gudangId || null,
        });

        return {
          data: data as { success: boolean; message: string; attempts_remaining?: number; is_blocked?: boolean } | null,
          error: error as Error | null,
        };
      },
      { isMutation: true }
    );
  },
};
