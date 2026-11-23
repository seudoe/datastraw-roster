import { NextResponse } from 'next/server';
import { getCurrentRole, ROLE_COOKIE_NAME } from '@/server/auth';
import { z } from 'zod';

const roleSchema = z.object({
  role: z.enum(['OPS_MANAGER', 'POD_LEAD', 'VIEWER']),
});

export async function GET() {
  const role = await getCurrentRole();
  return NextResponse.json({ role });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = roleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid role specified' }, { status: 400 });
    }

    const response = NextResponse.json({ role: parsed.data.role, success: true });
    response.cookies.set(ROLE_COOKIE_NAME, parsed.data.role, {
      path: '/',
      httpOnly: false, // Accessible by UI client
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}
