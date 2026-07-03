import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function verifyAuth(request: Request): Promise<
  | { user: { id: string; email?: string }; error: null }
  | { user: null; error: NextResponse }
> {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, error: null };
}
