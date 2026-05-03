import { NotAuthorizedError } from './errors.js';
import type { Policy, PolicyAction, PolicyContext, User } from './types.js';

export type { PolicyContext, User } from './types.js';

type PolicyRules<TRecord, TUser> = Record<
  string,
  (user: TUser, record: TRecord, ctx: PolicyContext) => boolean
>;

/**
 * Defines a Pundit-style policy from a map of action -> predicate.
 *
 * Returns an object exposing `.can()` (boolean) and `.authorize()` (throws on deny).
 */
export function definePolicy<TRecord, TUser = User>(
  policy: PolicyRules<TRecord, TUser>,
): Policy<TRecord, TUser> {
  const policyName = (policy as { name?: string }).name ?? 'Policy';

  const can = (
    action: PolicyAction,
    user: TUser,
    record: TRecord,
    ctx: PolicyContext,
  ): boolean => {
    const rule = policy[action];
    if (!rule) return false;
    return rule(user, record, ctx);
  };

  const authorize = (
    action: PolicyAction,
    user: TUser,
    record: TRecord,
    ctx: PolicyContext,
  ): void => {
    if (can(action, user, record, ctx)) return;
    const userId = (user as unknown as { id: bigint }).id;
    const recordId = (record as unknown as { id?: bigint })?.id ?? null;
    throw new NotAuthorizedError({
      policy: policyName,
      action,
      userId,
      recordId,
    });
  };

  return { can, authorize };
}
