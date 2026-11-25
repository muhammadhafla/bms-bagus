import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';

const unsubscriptionSchema = z.object({
  endpoint: z.url(),
});

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError) return authError;

    const rawBody = await request.json().catch(() => null);
    const parsed = unsubscriptionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid unsubscription payload' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', parsed.data.endpoint);

    if (dbError) {
      console.error('Failed to delete subscription:', dbError);
      return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unsubscription error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
