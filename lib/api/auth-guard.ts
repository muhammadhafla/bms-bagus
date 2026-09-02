import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function verifyAuth(
  request: Request,
): Promise<
  { user: { id: string; email?: string }; error: null } | { user: null; error: NextResponse }
> {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = createAdminClient();
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user) {
    return { user: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { user, error: null };
}

export async function verifyAdmin(
  request: Request,
): Promise<
  { user: { id: string; email?: string }; profile: { id: string; roles: string[] }; error: null } | { user: null; profile: null; error: NextResponse }
> {
  const { user, error: authError } = await verifyAuth(request);
  if (authError || !user) {
    return { user: null, profile: null, error: authError };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, roles')
    .eq('id', user.id)
    .single();

  const userRoles: string[] = profile?.roles || [];
  if (profileError || !userRoles.includes('admin')) {
    return {
      user: null,
      profile: null,
      error: NextResponse.json(
        { error: 'Forbidden. Akses khusus Administrator.' },
        { status: 403 },
      ),
    };
  }

  return { user, profile: { id: profile.id, roles: userRoles }, error: null };
}

export async function verifyRoles(
  request: Request,
  allowedRoles: string[],
): Promise<
  { user: { id: string; email?: string }; profile: { id: string; roles: string[] }; error: null } | { user: null; profile: null; error: NextResponse }
> {
  const { user, error: authError } = await verifyAuth(request);
  if (authError || !user) {
    return { user: null, profile: null, error: authError };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('id, roles')
    .eq('id', user.id)
    .single();

  const userRoles: string[] = profile?.roles || [];
  const hasAllowedRole = userRoles.includes('admin') || allowedRoles.some((r) => userRoles.includes(r));

  if (profileError || !hasAllowedRole) {
    return {
      user: null,
      profile: null,
      error: NextResponse.json(
        { error: 'Forbidden. Anda tidak memiliki izin untuk tindakan ini.' },
        { status: 403 },
      ),
    };
  }

  return { user, profile: { id: profile.id, roles: userRoles }, error: null };
}

