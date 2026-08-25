import { NextResponse } from 'next/server';
import { verifyAuth, createAdminClient } from '@/lib/api/auth-guard';
import { z } from 'zod';

const unsubscriptionSchema = z.object({
  endpoint: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const { user, error: authError } = await verifyAuth(request);
    if (authError) return authError;

    const body = await request.json();
    const validatedData = unsubscriptionSchema.parse(body);

    const supabase = createAdminClient();

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', validatedData.endpoint);

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
