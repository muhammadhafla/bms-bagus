import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getAdminClient(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Unauthorized', status: 401 };
  }
  const token = authHeader.split(' ')[1];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
    return { error: 'Konfigurasi server tidak lengkap', status: 500 };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { supabaseAdmin, token };
}

async function verifyAdmin(supabaseAdmin: any, token: string) {
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { error: 'Unauthorized', status: 401 };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single();

  const requesterRoles: string[] = profile?.roles || [];
  if (!requesterRoles.includes('admin')) {
    return { error: 'Forbidden. Hanya Admin yang diizinkan.', status: 403 };
  }

  return { user };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const clientRes = getAdminClient(request);
    if (clientRes.error || !clientRes.supabaseAdmin)
      return NextResponse.json({ error: clientRes.error }, { status: clientRes.status || 500 });

    const supabaseAdmin = clientRes.supabaseAdmin;
    const adminRes = await verifyAdmin(supabaseAdmin, clientRes.token!);
    if (adminRes.error)
      return NextResponse.json({ error: adminRes.error }, { status: adminRes.status });

    const body = await request.json();
    const { nama, roles, default_gudang_id, password, username } = body;
    const userId = (await params).id;

    if (!userId) return NextResponse.json({ error: 'User ID tidak ditemukan' }, { status: 400 });
    if (!nama) return NextResponse.json({ error: 'Nama wajib diisi' }, { status: 400 });

    const assignedRoles: string[] | undefined = Array.isArray(roles) && roles.length > 0
      ? roles
      : undefined;

    const updatePayload: any = { nama };

    if (assignedRoles) {
      updatePayload.roles = assignedRoles;
    }

    if (default_gudang_id !== undefined) {
      updatePayload.default_gudang_id = default_gudang_id || null;
    }

    if (username !== undefined) {
      updatePayload.username = username ? username.toLowerCase().replace(/[^a-z0-9_.]/g, '') : null;
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message || 'Gagal memperbarui profil' },
        { status: 400 },
      );
    }

    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password baru minimal 6 karakter' }, { status: 400 });
      }
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      });
      if (passwordError) {
        return NextResponse.json(
          { error: passwordError.message || 'Profil terupdate, tapi gagal mereset password' },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ success: true, message: 'User berhasil diperbarui' });
  } catch (err: unknown) {
    console.error('Update user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const clientRes = getAdminClient(request);
    if (clientRes.error || !clientRes.supabaseAdmin)
      return NextResponse.json({ error: clientRes.error }, { status: clientRes.status || 500 });

    const supabaseAdmin = clientRes.supabaseAdmin;
    const adminRes = await verifyAdmin(supabaseAdmin, clientRes.token!);
    if (adminRes.error)
      return NextResponse.json({ error: adminRes.error }, { status: adminRes.status });

    const userId = (await params).id;
    if (!userId) return NextResponse.json({ error: 'User ID tidak ditemukan' }, { status: 400 });

    // Hapus user dari Supabase Auth (akan menghapus profiles jika ON DELETE CASCADE, atau kita hapus manual)
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      return NextResponse.json(
        { error: deleteAuthError.message || 'Gagal menghapus user' },
        { status: 400 },
      );
    }

    // Juga hapus dari profiles untuk memastikan (meskipun ada cascade, ini fallback aman)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    return NextResponse.json({ success: true, message: 'User berhasil dihapus' });
  } catch (err: unknown) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
