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

const createUserSchema = z.object({
  email: z.email({ message: 'Format email tidak valid' }),
  password: z
    .string()
    .min(8, { message: 'Password minimal 8 karakter' })
    .max(128, { message: 'Password maksimal 128 karakter' }),
  nama: z
    .string()
    .trim()
    .min(1, { message: 'Nama wajib diisi' })
    .max(120, { message: 'Nama terlalu panjang' }),
  username: z.string().trim().max(50).nullable().optional(),
  roles: z.array(z.enum(ALLOWED_ROLES)).min(1).optional(),
  default_gudang_id: z
    .union([z.uuid(), z.literal(''), z.null()])
    .optional()
    .transform((val) => (val ? val : null)),
});

export async function POST(request: Request) {
  try {
    const { error: authError } = await verifyAdmin(request);
    if (authError) return authError;

    const rawBody = await request.json().catch(() => null);
    const parsed = createUserSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Payload tidak valid' },
        { status: 400 },
      );
    }

    const { email, password, nama, username, roles, default_gudang_id } = parsed.data;
    const assignedRoles: string[] = roles && roles.length > 0 ? roles : ['kasir', 'staff_gudang'];

    const requiresBranch =
      !assignedRoles.includes('admin') && assignedRoles.some((r) => r !== 'finance');
    if (requiresBranch && !default_gudang_id) {
      return NextResponse.json(
        { error: 'Cabang default wajib dipilih untuk role operasional cabang' },
        { status: 400 },
      );
    }

    const normalizedUsername = username
      ? username.toLowerCase().replace(/[^a-z0-9_.]/g, '') || null
      : null;

    const supabaseAdmin = createAdminClient();

    if (normalizedUsername) {
      const { data: existingUsername } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', normalizedUsername)
        .maybeSingle();

      if (existingUsername) {
        return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
      }
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      console.error('Create auth user error:', createError);
      const isDuplicate =
        createError?.message?.toLowerCase().includes('already') ||
        createError?.message?.toLowerCase().includes('registered');
      return NextResponse.json(
        { error: isDuplicate ? 'Email sudah terdaftar' : 'Gagal membuat akun user' },
        { status: 400 },
      );
    }

    const { error: upsertError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: newUser.user.id,
        nama,
        username: normalizedUsername,
        roles: assignedRoles,
        default_gudang_id: default_gudang_id ?? null,
      },
      { onConflict: 'id' },
    );

    if (upsertError) {
      console.error('Upsert profile rollback triggered:', upsertError);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json(
        { error: 'Gagal menyimpan profil user. Pembuatan akun dibatalkan.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      user: { id: newUser.user.id, email: newUser.user.email },
    });
  } catch (err: unknown) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
