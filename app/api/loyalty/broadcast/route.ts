import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { createAdminClient, verifyAdmin } from '@/lib/api/auth-guard';

const broadcastSchema = z.object({
  title: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(1000),
  tierId: z.union([z.literal('all'), z.uuid()]).optional().default('all'),
  promoUrl: z
    .string()
    .trim()
    .max(500)
    .refine(
      (val) => {
        if (val.startsWith('/') && !val.startsWith('//')) return true;
        try {
          const parsed = new URL(val);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'URL promo harus berupa path internal atau protokol http/https.' },
    )
    .optional(),
});

function getFirebaseCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'toko-bagus-kawan-bagus';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Tangani escape sequence newline \n jika didefinisikan dalam single-line env
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Kredensial Firebase FCM belum lengkap di server. Pastikan FIREBASE_CLIENT_EMAIL dan FIREBASE_PRIVATE_KEY telah diatur di environment variable.',
    );
  }

  return { projectId, clientEmail, privateKey };
}

/**
 * Generate Google OAuth2 Access Token for FCM v1 using built-in Node.js crypto
 */
async function getGoogleFcmAccessToken(): Promise<string> {
  const creds = getFirebaseCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  const claimSet = {
    iss: creds.clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const base64UrlEncode = (obj: object | string) => {
    const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedClaimSet = base64UrlEncode(claimSet);
  const unsignedToken = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  const signature = signer
    .sign(creds.privateKey)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gagal mendapatkan OAuth token FCM: ${errorText}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function POST(request: Request) {
  try {
    const { error: adminError } = await verifyAdmin(request);
    if (adminError) return adminError;

    const rawBody = await request.json().catch(() => null);
    const parsed = broadcastSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Payload broadcast tidak valid. Periksa judul, isi pesan, tier, atau URL promo.' },
        { status: 400 },
      );
    }

    const { title, message, tierId, promoUrl } = parsed.data;
    const supabaseAdmin = createAdminClient();

    // Ambil token FCM dari tabel member_fcm_tokens
    let fcmQuery = supabaseAdmin
      .from('member_fcm_tokens')
      .select('fcm_token, member_id, members!inner(id, tier_id)');

    if (tierId !== 'all') {
      fcmQuery = fcmQuery.eq('members.tier_id', tierId);
    }

    const { data: tokenRows, error: tokenErr } = await fcmQuery;

    if (tokenErr) {
      console.error('Error fetching FCM tokens:', tokenErr);
      return NextResponse.json(
        { error: 'Gagal mengambil data perangkat member.' },
        { status: 500 },
      );
    }

    if (!tokenRows || tokenRows.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tidak ada perangkat aktif yang sesuai dengan kriteria target.',
        sentCount: 0,
        failedCount: 0,
      });
    }

    // Unique tokens
    const uniqueTokens = Array.from(new Set(tokenRows.map((r: any) => r.fcm_token).filter(Boolean)));

    // Ambil kredensial dan OAuth Token Google FCM
    const creds = getFirebaseCredentials();
    const accessToken = await getGoogleFcmAccessToken();

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Kirim pesan ke masing-masing token
    await Promise.all(
      uniqueTokens.map(async (fcmToken) => {
        try {
          const fcmPayload = {
            message: {
              token: fcmToken,
              notification: {
                title,
                body: message,
              },
              data: {
                click_action: 'FLUTTER_NOTIFICATION_CLICK',
                promoUrl: promoUrl || '',
                type: 'loyalty_broadcast',
              },
              android: {
                priority: 'HIGH',
                notification: {
                  channelId: 'kawan_bagus_receipts',
                  sound: 'default',
                  defaultSound: true,
                  defaultVibrateTimings: true,
                },
              },
            },
          };

          const fcmRes = await fetch(
            `https://fcm.googleapis.com/v1/projects/${creds.projectId}/messages:send`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(fcmPayload),
            },
          );

          if (fcmRes.ok) {
            sentCount++;
          } else {
            failedCount++;
            const errRes = await fcmRes.json();
            errors.push(errRes?.error?.message || 'Gagal kirim');
          }
        } catch (err: any) {
          failedCount++;
          errors.push(err?.message || 'Error koneksi');
        }
      }),
    );

    if (errors.length > 0) {
      console.warn('[loyalty/broadcast] Sebagian pengiriman FCM gagal:', errors.slice(0, 5));
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast berhasil dikirim ke ${sentCount} perangkat${
        failedCount > 0 ? ` (${failedCount} gagal)` : ''
      }.`,
      sentCount,
      failedCount,
      totalTargets: uniqueTokens.length,
    });
  } catch (error: unknown) {
    console.error('Broadcast handler error:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal saat memproses broadcast.' },
      { status: 500 },
    );
  }
}
