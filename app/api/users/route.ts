import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
      return NextResponse.json(
        { error: 'Konfigurasi server tidak lengkap. Hubungi administrator.' },
        { status: 500 },
      );
    }

    // Initialize admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify requester
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if requester is admin
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden. Hanya Admin yang bisa membuat akun.' },
        { status: 403 },
      );
    }

    // Parse payload
    const body = await request.json();
    const { email, password, nama, username, role } = body;

    if (!email || !password || !nama) {
      return NextResponse.json({ error: 'Email, Password, dan Nama wajib diisi' }, { status: 400 });
    }

    // Check if username already exists
    if (username) {
      const { data: existingUsername } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (existingUsername) {
        return NextResponse.json({ error: 'Username sudah digunakan' }, { status: 400 });
      }
    }

    // Create user in Auth
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      return NextResponse.json(
        { error: createError?.message || 'Gagal membuat user' },
        { status: 400 },
      );
    }

    // Add profile data (Wait slightly to let database trigger create the profile first)
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        nama,
        username: username || null,
        role: role?.toLowerCase() === 'admin' ? 'admin' : 'staff',
      })
      .eq('id', newUser.user.id);

    // If update fails, insert fallback
    if (updateError) {
      await supabaseAdmin.from('profiles').insert({
        id: newUser.user.id,
        nama,
        username: username || null,
        role: role?.toLowerCase() === 'admin' ? 'admin' : 'staff',
      });
    }

    return NextResponse.json({ success: true, user: newUser.user });
  } catch (err: unknown) {
    console.error('Create user error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
