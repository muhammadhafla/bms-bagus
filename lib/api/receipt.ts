import { supabase } from './client';
import { safeQuery } from './utils';

export interface ReceiptTemplate {
  id: string;
  name: string;
  type: 'SALE' | 'RETURN';
  template: {
    header?: string[];
    body?: {
      show_discount?: boolean;
    };
    footer?: string[];
    logo?: {
      enabled: boolean;
      mode: 'bitmap' | 'url';
      path?: string;
      bucket?: string;
    };
  };
  is_active: boolean;
  created_at: string;
}

export interface ReceiptLogo {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
}

export const receiptApi = {
  async getAllTemplates() {
    return safeQuery<ReceiptTemplate[]>(async () => {
      const result = await supabase.from('receipt_templates').select('*').order('name');
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getActiveTemplate(type: 'SALE' | 'RETURN' = 'SALE') {
    const query = supabase.from('receipt_templates').select('*').eq('is_active', true).eq('type', type).limit(1);
    const result = await safeQuery<ReceiptTemplate[]>(async () => {
      const result = await query;
      return { data: result.data, error: result.error as Error | null };
    });
    if (result.error || !result.data || result.data.length === 0) {
      return { data: null, error: null };
    }
    return { data: result.data[0], error: null };
  },

  async createTemplate(data: {
    name: string;
    type: 'SALE' | 'RETURN';
    template?: ReceiptTemplate['template'];
    is_active?: boolean;
  }) {
    const payload = {
      name: data.name,
      type: data.type,
      template: data.template || {
        header: [],
        body: { show_discount: data.type === 'SALE' },
        footer: [],
        logo: { enabled: false, mode: 'bitmap' }
      },
      is_active: data.is_active,
    };
    return safeQuery(async () => {
      const result = await supabase.from('receipt_templates').insert(payload).select().single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async updateTemplate(
    id: string,
    data: {
      name?: string;
      type?: 'SALE' | 'RETURN';
      template?: ReceiptTemplate['template'];
      is_active?: boolean;
    }
  ) {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.type !== undefined) payload.type = data.type;
    if (data.is_active !== undefined) payload.is_active = data.is_active;
    if (data.template !== undefined) payload.template = data.template;
    
    return safeQuery(async () => {
      const result = await supabase.from('receipt_templates').update(payload).eq('id', id).select().single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async setActiveTemplate(id: string) {
    const resetResult = await safeQuery<any>(async () => {
      const result = await supabase.from('receipt_templates').update({ is_active: false }).eq('is_active', true);
      return { data: result.data, error: result.error as Error | null };
    });
    if (resetResult.error) {
      return safeQuery(async () => {
        const result = await supabase.from('receipt_templates').update({ is_active: true }).eq('id', id).select().single();
        return { data: result.data, error: result.error as Error | null };
      });
    }
    return safeQuery(async () => {
      const result = await supabase.from('receipt_templates').update({ is_active: true }).eq('id', id).select().single();
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async deleteTemplate(id: string) {
    return safeQuery(async () => {
      const result = await supabase.from('receipt_templates').delete().eq('id', id);
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async getAllLogos() {
    return safeQuery(async () => {
      const result = await supabase.from('receipt_logos').select('*').order('name');
      return { data: result.data, error: result.error as Error | null };
    });
  },

  async uploadLogo(file: File) {
    const fileName = `logo/${Date.now()}_${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) return { data: null, error: { message: uploadError.message, details: uploadError.name } };

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(fileName);

    return { 
      data: { 
        path: fileName, 
        publicUrl: urlData.publicUrl,
        bucket: 'assets'
      }, 
      error: null 
    };
  },

  async deleteLogo(id: string) {
    return safeQuery(async () => {
      const result = await supabase.from('receipt_logos').delete().eq('id', id);
      return { data: result.data, error: result.error as Error | null };
    });
  },
};