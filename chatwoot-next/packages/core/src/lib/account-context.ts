import type { User } from '@chatwoot-next/policies';

/**
 * AccountContext — propagated as the first argument through every service
 * call. Carries the tenant boundary (`accountId`) and, when a request is
 * acting on behalf of a user, the `userId` and hydrated `user` for
 * authorization. Stub: extend with `permissions`, `requestId`, etc. as
 * needs surface during Phase 3.
 */
export type AccountContext = {
  accountId: bigint;
  userId?: bigint;
  user?: User;
};
