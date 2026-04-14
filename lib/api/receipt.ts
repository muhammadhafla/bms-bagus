import { supabase } from './client';
import { safeQuery, queryToPromise } from './utils';

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
    return safeQuery<ReceiptTemplate[]>(queryToPromise(supabase.from('receipt_templates').select('*').order('name')));
  },

  async getActiveTemplate(type: 'SALE' | 'RETURN' = 'SALE') {
    return safeQuery<ReceiptTemplate>(queryToPromise(supabase.from('receipt_templates').select('*').eq('is_active', true).eq('type', type).single()));
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
    return safeQuery(queryToPromise(supabase.from('receipt_templates').insert(payload).select().single()));
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
    
    return safeQuery(queryToPromise(supabase.from('receipt_templates').update(payload).eq('id', id).select().single()));
  },

  async setActiveTemplate(id: string) {
    const resetResult = await supabase.from('receipt_templates').update({ is_active: false }).eq('is_active', true);
    if (resetResult.error) {
      return safeQuery(queryToPromise(supabase.from('receipt_templates').update({ is_active: true }).eq('id', id).select().single()));
    }
    return safeQuery(queryToPromise(supabase.from('receipt_templates').update({ is_active: true }).eq('id', id).select().single()));
  },

  async deleteTemplate(id: string) {
    return safeQuery(queryToPromise(supabase.from('receipt_templates').delete().eq('id', id)));
  },

  async getAllLogos() {
    return safeQuery(queryToPromise(supabase.from('receipt_logos').select('*').order('name')));
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
    return safeQuery(queryToPromise(supabase.from('receipt_logos').delete().eq('id', id)));
  },
};