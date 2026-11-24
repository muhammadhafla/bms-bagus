import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, verifyAdmin } from '@/lib/api/auth-guard';

const ALLOWED_ROLES = [
  'admin',
  'kepala_cabang',
  'kepala_gudang',
  'staff_gudang',
  'kasir',
  'finance',
] as const;

const updateUserSchema = z.object({
  nama: z
    .string()
    .trim()
    .min(1, { message: 'Nama wajib diisi' })
    .max(120, { message: 'Nama terlalu panjang' }),
  roles: z.array(z.enum(ALLOWED_ROLES)).min(1).optional(),
  default_gudang_id: z
    .union([z.uuid(), z.literal(''), z.null()])
    .optional()
    .transform((val) => (val === undefined ? undefined : val || null)),
  password: z.string().max(128).optional().nullable(),
  username: z.string().trim().max(50).optional().nullable(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error: authError } = await verifyAdmin(request);
    if (authError) return authError;

    const rawId = (await params).id;
    const idParsed = z.uuid().safeParse(rawId);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'User ID tidak valid' }, { status: 400 });
    }
    const userId = idParsed.data;

    const rawBody = await request.json().catch(() => null);
    const parsed = updateUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Payload tidak valid' },
        { status: 400 },
      );
    }

    const { nama, roles, default_gudang_id, password, username } = parsed.data;

    if (password && password.trim() !== '' && password.length < 8) {
      return NextResponse.json({ error: 'Password baru minimal 8 karakter' }, { status: 400 });
    }

    const updatePayload: Record<string, unknown> = { nama };

    if (roles && roles.length > 0) {
      updatePayload.roles = roles;
    }

    if (default_gudang_id !== undefined) {
      updatePayload.default_gudang_id = default_gudang_id;
    }

    if (username !== undefined) {
      updatePayload.username = username
        ? username.toLowerCase().replace(/[^a-z0-9_.]/g, '') || null
        : null;
    }

    const supabaseAdmin = createAdminClient();
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (profileError) {
      console.error('Update profile error:', profileError);
      return NextResponse.json({ error: 'Gagal memperbarui profil user' }, { status: 400 });
    }

    if (password && password.trim() !== '') {
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      });
      if (passwordError) {
        console.error('Update user password error:', passwordError);
        return NextResponse.json(
          { error: 'Profil terupdate, tetapi gagal mereset password' },
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
    const { user, error: authError } = await verifyAdmin(request);
    if (authError || !user) return authError!;

    const rawId = (await params).id;
    const idParsed = z.uuid().safeParse(rawId);
    if (!idParsed.success) {
      return NextResponse.json({ error: 'User ID tidak valid' }, { status: 400 });
    }
    const userId = idParsed.data;

    if (userId === user.id) {
      return NextResponse.json(
        { error: 'Tidak dapat menghapus akun Anda sendiri' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error('Delete auth user error:', deleteAuthError);
      return NextResponse.json({ error: 'Gagal menghapus user' }, { status: 400 });
    }

    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    return NextResponse.json({ success: true, message: 'User berhasil dihapus' });
  } catch (err: unknown) {
    console.error('Delete user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
