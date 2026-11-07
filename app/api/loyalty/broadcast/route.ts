import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Konfigurasi server Supabase tidak lengkap' },
        { status: 500 },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sesi login tidak sah' }, { status: 401 });
    }

    const body = await request.json();
    const { title, message, tierId, promoUrl } = body;

    if (!title || !title.trim() || !message || !message.trim()) {
      return NextResponse.json(
        { error: 'Judul dan isi pesan broadcast wajib diisi' },
        { status: 400 },
      );
    }

    // Ambil token FCM dari tabel member_fcm_tokens
    let fcmQuery = supabaseAdmin
      .from('member_fcm_tokens')
      .select('fcm_token, member_id, members!inner(id, tier_id)');

    if (tierId && tierId !== 'all') {
      fcmQuery = fcmQuery.eq('members.tier_id', tierId);
    }

    const { data: tokenRows, error: tokenErr } = await fcmQuery;

    if (tokenErr) {
      console.error('Error fetching FCM tokens:', tokenErr);
      return NextResponse.json(
        { error: 'Gagal mengambil data perangkat member: ' + tokenErr.message },
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
                title: title.trim(),
                body: message.trim(),
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

    return NextResponse.json({
      success: true,
      message: `Broadcast berhasil dikirim ke ${sentCount} perangkat${
        failedCount > 0 ? ` (${failedCount} gagal)` : ''
      }.`,
      sentCount,
      failedCount,
      totalTargets: uniqueTokens.length,
      sampleErrors: errors.slice(0, 3),
    });
  } catch (error: any) {
    console.error('Broadcast handler error:', error);
    return NextResponse.json(
      { error: error?.message || 'Terjadi kesalahan saat memproses broadcast' },
      { status: 500 },
    );
  }
}
