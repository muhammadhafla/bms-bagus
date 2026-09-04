import { useEffect, useRef } from 'react';
import { useQueryClient, QueryKey } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

interface UseRealtimeQueryOptions {
  table: string;
  schema?: string;
  filter?: string;
  queryKeys: QueryKey[];
  enabled?: boolean;
}

/**
 * Hook untuk berlangganan Supabase Realtime (postgres_changes)
 * yang otomatis meng-invalidate cache React Query tanpa memory leak.
 */
export function useRealtimeQuery({
  table,
  schema = 'public',
  filter,
  queryKeys,
  enabled = true,
}: UseRealtimeQueryOptions) {
  const queryClient = useQueryClient();
  const queryKeysRef = useRef(queryKeys);

  useEffect(() => {
    queryKeysRef.current = queryKeys;
  }, [queryKeys]);

  useEffect(() => {
    if (!enabled) return;

    const channelName = `realtime-${table}${filter ? `-${filter.replace(/[^a-zA-Z0-9]/g, '_')}` : ''}-${Math.random().toString(36).substring(2, 9)}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: '*',
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        () => {
          queryKeysRef.current.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, filter, enabled, queryClient]);
}
