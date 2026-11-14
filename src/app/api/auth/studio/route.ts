import { NextResponse } from 'next/server';
import { getAdminPassword } from '@/services/deployment/auth-config';

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const correctPassword = getAdminPassword();

    if (password === correctPassword) {
      const response = NextResponse.json({ success: true });
      response.cookies.set('studio_access_token', 'unlocked_studio_session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
      return response;
    }

    return NextResponse.json({ error: 'Mật khẩu không chính xác' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }
}
