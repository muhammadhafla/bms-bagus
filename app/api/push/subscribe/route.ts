import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';

const subscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    auth: z.string().min(1),
    p256dh: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError) return authError;

    const rawBody = await request.json().catch(() => null);
    const parsed = subscriptionSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
    }
    const validatedData = parsed.data;

    const supabase = createAdminClient();

    // Upsert subscription
    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint: validatedData.endpoint,
          auth_key: validatedData.keys.auth,
          p256dh_key: validatedData.keys.p256dh,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' },
      );

    if (dbError) {
      console.error('Failed to save subscription:', dbError);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
