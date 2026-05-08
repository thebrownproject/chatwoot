/**
 * Shared types for the policy framework.
 */

export type PolicyAction = string;

export interface User {
  id: bigint;
  role: 'administrator' | 'agent';
  teams: { id: bigint }[];
  customRoleId?: bigint | null;
}

export interface PolicyContext {
  account: { id: bigint };
  request?: {
    ip?: string;
    userAgent?: string;
  };
  [extra: string]: unknown;
}

export interface Policy<TRecord, TUser = User> {
  can(action: PolicyAction, user: TUser, record: TRecord, ctx: PolicyContext): boolean;
  authorize(action: PolicyAction, user: TUser, record: TRecord, ctx: PolicyContext): void;
}
