import { NextResponse } from 'next/server';
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';
import { z } from 'zod';

const subscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const validatedData = subscriptionSchema.parse(body);

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
        { onConflict: 'endpoint' }
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
