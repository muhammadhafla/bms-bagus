import { supabase } from './client';
import { safeQuery } from './utils';
import { HelpArticle } from '@/app/(main)/help/types';

export const helpDocsApi = {
  async getAll(options?: { publishedOnly?: boolean }) {
    return safeQuery<HelpArticle[]>(async () => {
      let query = supabase.from('help_articles').select('*').order('order_index', { ascending: true });
      if (options?.publishedOnly !== false) {
        query = query.eq('is_published', true);
      }
      const result = await query;
      return { data: (result.data as HelpArticle[]) || [], error: result.error as Error | null };
    });
  },

  async getBySlug(slug: string) {
    return safeQuery<HelpArticle>(async () => {
      const result = await supabase
        .from('help_articles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();
      return { data: result.data as HelpArticle | null, error: result.error as Error | null };
    });
  },

  async getById(id: string) {
    return safeQuery<HelpArticle>(async () => {
      const result = await supabase
        .from('help_articles')
        .select('*')
        .eq('id', id)
        .single();
      return { data: result.data as HelpArticle | null, error: result.error as Error | null };
    });
  },

  async create(article: Omit<HelpArticle, 'id' | 'created_at' | 'updated_at'>) {
    return safeQuery<HelpArticle>(async () => {
      const result = await supabase
        .from('help_articles')
        .insert({
          slug: article.slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-'),
          title: article.title.trim(),
          category: article.category,
          content_md: article.content_md,
          storage_path: article.storage_path || null,
          icon_name: article.icon_name || 'IconFileText',
          order_index: article.order_index ?? 0,
          is_published: article.is_published ?? true,
        })
        .select()
        .single();
      return { data: result.data as HelpArticle | null, error: result.error as Error | null };
    });
  },

  async update(id: string, article: Partial<HelpArticle>) {
    return safeQuery<HelpArticle>(async () => {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };
      if (article.slug) updateData.slug = article.slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '-');
      if (article.title) updateData.title = article.title.trim();
      if (article.category) updateData.category = article.category;
      if (article.content_md !== undefined) updateData.content_md = article.content_md;
      if (article.storage_path !== undefined) updateData.storage_path = article.storage_path;
      if (article.icon_name) updateData.icon_name = article.icon_name;
      if (article.order_index !== undefined) updateData.order_index = article.order_index;
      if (article.is_published !== undefined) updateData.is_published = article.is_published;

      const result = await supabase
        .from('help_articles')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      return { data: result.data as HelpArticle | null, error: result.error as Error | null };
    });
  },

  async delete(id: string) {
    return safeQuery<boolean>(async () => {
      const result = await supabase.from('help_articles').delete().eq('id', id);
      return { data: !result.error, error: result.error as Error | null };
    });
  },

  async uploadMarkdownFile(file: File, path?: string) {
    return safeQuery<{ path: string; publicUrl: string }>(async () => {
      const fileName = path || `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const uploadRes = await supabase.storage.from('help-docs').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (uploadRes.error) {
        return { data: null, error: uploadRes.error as Error };
      }

      const { data: publicUrlData } = supabase.storage.from('help-docs').getPublicUrl(uploadRes.data.path);
      return {
        data: {
          path: uploadRes.data.path,
          publicUrl: publicUrlData.publicUrl,
        },
        error: null,
      };
    });
  },
};
