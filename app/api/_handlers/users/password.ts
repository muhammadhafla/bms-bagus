import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient, verifyAdmin } from '@/lib/api/auth-guard';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: 'Password baru minimal 8 karakter' })
    .max(128, { message: 'Password maksimal 128 karakter' }),
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
    const parsed = resetPasswordSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Payload tidak valid' },
        { status: 400 },
      );
    }

    const supabaseAdmin = createAdminClient();
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: parsed.data.password,
    });

    if (updateError) {
      console.error('Reset password auth error:', updateError);
      return NextResponse.json({ error: 'Gagal mereset password user' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Password berhasil direset' });
  } catch (err: unknown) {
    console.error('Reset password error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
