import { cookies } from 'next/headers';

export type UserRole = 'OPS_MANAGER' | 'POD_LEAD' | 'VIEWER';

export const ROLE_COOKIE_NAME = 'roster_iq_role';
export const DEFAULT_ROLE: UserRole = 'OPS_MANAGER';

export async function getCurrentRole(): Promise<UserRole> {
  const cookieStore = await cookies();
  const role = cookieStore.get(ROLE_COOKIE_NAME)?.value as UserRole;
  if (role === 'OPS_MANAGER' || role === 'POD_LEAD' || role === 'VIEWER') {
    return role;
  }
  return DEFAULT_ROLE;
}

export async function requireOpsManager(): Promise<void> {
  const role = await getCurrentRole();
  if (role !== 'OPS_MANAGER') {
    throw new Error('Unauthorized: Requires Ops Manager role');
  }
}

export async function requireNotViewer(): Promise<void> {
  const role = await getCurrentRole();
  if (role === 'VIEWER') {
    throw new Error('Unauthorized: Viewers have read-only permissions');
  }
}
