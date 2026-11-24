import { timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function safeTimingEqual(a: string | null | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Konfigurasi Supabase admin client belum lengkap.');
  }
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

export async function verifyWebhookOrAuth(
  request: Request,
): Promise<{ authorized: true; error: null } | { authorized: false; error: NextResponse }> {
  const expectedCronSecret = process.env.CRON_SECRET;
  const expectedWebhookSecret = process.env.WEBHOOK_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!expectedCronSecret && !expectedWebhookSecret && !serviceKey) {
    console.error('[auth-guard] Webhook verification failed: no server secrets configured.');
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
    };
  }

  const secretHeader = request.headers.get('x-webhook-secret');
  if (
    safeTimingEqual(secretHeader, expectedCronSecret) ||
    safeTimingEqual(secretHeader, expectedWebhookSecret)
  ) {
    return { authorized: true, error: null };
  }

  const authHeader = request.headers.get('authorization');
  if (serviceKey && serviceKey.length > 10 && safeTimingEqual(authHeader, `Bearer ${serviceKey}`)) {
    return { authorized: true, error: null };
  }

  return {
    authorized: false,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}

export function verifyWaBridgeSecret(
  request: Request,
): { authorized: true; error: null } | { authorized: false; error: NextResponse } {
  const expectedSecret = process.env.WA_BRIDGE_SECRET || process.env.WEBHOOK_SECRET;
  if (!expectedSecret) {
    console.error('[auth-guard] WA Bridge verification failed: WA_BRIDGE_SECRET is not configured.');
    return {
      authorized: false,
      error: NextResponse.json({ error: 'Server misconfigured' }, { status: 500 }),
    };
  }

  const bridgeHeader = request.headers.get('x-wa-bridge-secret');
  if (safeTimingEqual(bridgeHeader, expectedSecret)) {
    return { authorized: true, error: null };
  }

  return {
    authorized: false,
    error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
  };
}

