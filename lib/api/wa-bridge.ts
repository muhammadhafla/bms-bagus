import { supabase } from './client';
import { safeQuery } from './utils';
import { WaBridgeStatus, WaOutboxItem, WaOutboxFilter, WaSettings } from '@/types/wa-bridge';

export const waBridgeApi = {
  /**
   * Mengambil status bridge WhatsApp terbaru (global atau per gudang)
   */
  async getBridgeStatus(gudangId?: string | null) {
    return safeQuery<WaBridgeStatus | null>(async () => {
      let query = supabase.from('wa_bridge_status').select('*');
      if (gudangId) {
        query = query.eq('id_gudang', gudangId);
      } else {
        query = query.is('id_gudang', null);
      }

      const result = await query.limit(1).maybeSingle();
      return { data: result.data as WaBridgeStatus | null, error: result.error as Error | null };
    });
  },

  /**
   * Mengambil konfigurasi WA (promo footer, pengaturan inaktivitas)
   */
  async getSettings() {
    return safeQuery<WaSettings | null>(async () => {
      const result = await supabase
        .from('wa_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return { data: result.data as WaSettings | null, error: result.error as Error | null };
    });
  },

  /**
   * Memperbarui konfigurasi WA
   */
  async updateSettings(payload: Partial<WaSettings>) {
    return safeQuery<WaSettings>(
      async () => {
        const { data: existing } = await supabase.from('wa_settings').select('id').limit(1).maybeSingle();
        
        let result;
        if (existing?.id) {
          result = await supabase
            .from('wa_settings')
            .update({ ...payload, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
        } else {
          result = await supabase
            .from('wa_settings')
            .insert({ ...payload, updated_at: new Date().toISOString() })
            .select()
            .single();
        }

        return { data: result.data as WaSettings, error: result.error as Error | null };
      },
      { isMutation: true }
    );
  },

  /**
   * Mengambil riwayat pengiriman outbox dari semua cabang dengan filter & pagination
   */
  async getOutboxHistory(filter: WaOutboxFilter = {}) {
    return safeQuery<{ items: WaOutboxItem[]; total: number }>(async () => {
      const page = filter.page || 1;
      const limit = filter.limit || 20;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('wa_outbox')
        .select('*, gudang:id_gudang(id, kode_gudang, nama)', { count: 'exact' });

      // Exclude internal system commands from user transaction history view
      query = query.neq('type', 'system_command');

      if (filter.gudangId && filter.gudangId !== 'all') {
        query = query.eq('id_gudang', filter.gudangId);
      }

      if (filter.status && filter.status !== 'all') {
        query = query.eq('status', filter.status);
      }

      if (filter.search && filter.search.trim()) {
        const s = filter.search.trim();
        query = query.or(`phone.ilike.%${s}%,message.ilike.%${s}%,reference_id.ilike.%${s}%`);
      }

      query = query.order('created_at', { ascending: false }).range(from, to);

      const result = await query;
      return {
        data: {
          items: (result.data as unknown as WaOutboxItem[]) || [],
          total: result.count || 0,
        },
        error: result.error as Error | null,
      };
    });
  },

  /**
   * Mengirimkan perintah sistem jarak jauh (RESET_SESSION atau LOGOUT)
   */
  async sendSystemCommand(command: 'RESET_SESSION' | 'LOGOUT', gudangId?: string | null) {
    return safeQuery<boolean>(
      async () => {
        const { error } = await supabase.from('wa_outbox').insert({
          phone: 'system',
          message: command,
          type: 'system_command',
          source: 'bms_web',
          status: 'pending',
          id_gudang: gudangId || null,
        });

        return { data: !error, error: error as Error | null };
      },
      { isMutation: true }
    );
  },

  /**
   * Mengirimkan pesan uji coba ke nomor tujuan
   */
  async sendTestMessage(phone: string, text: string) {
    return safeQuery<boolean>(
      async () => {
        const { error } = await supabase.from('wa_outbox').insert({
          phone,
          message: text,
          type: 'text',
          source: 'bms_web',
          status: 'pending',
        });

        return { data: !error, error: error as Error | null };
      },
      { isMutation: true }
    );
  },

  /**
   * Mengulang pengiriman pesan yang gagal (Retry)
   */
  async retryMessage(id: string) {
    return safeQuery<boolean>(
      async () => {
        const { error } = await supabase
          .from('wa_outbox')
          .update({
            status: 'pending',
            error_message: null,
          })
          .eq('id', id);

        return { data: !error, error: error as Error | null };
      },
      { isMutation: true }
    );
  },

  /**
   * Mereset tanggal inaktivitas HP ke hari ini (setelah Owner membuka HP)
   */
  async resetInactivityDate() {
    return safeQuery<boolean>(
      async () => {
        const today = new Date().toISOString().split('T')[0];
        const res = await waBridgeApi.updateSettings({ last_phone_active_date: today });
        return { data: !res.error, error: res.error as Error | null };
      },
      { isMutation: true }
    );
  },

  /**
   * Mengambil daftar gudang untuk dropdown filter cabang
   */
  async getGudangList() {
    return safeQuery<{ id: string; kode_gudang: string; nama: string }[]>(async () => {
      const result = await supabase
        .from('gudang')
        .select('id, kode_gudang, nama')
        .order('nama', { ascending: true });

      return {
        data: (result.data as { id: string; kode_gudang: string; nama: string }[]) || [],
        error: result.error as Error | null,
      };
    });
  },
};
