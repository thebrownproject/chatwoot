// Re-export Auth.js v5 handlers + helpers from the shared auth package.
// Centralising the import here lets route handlers and middleware use a
// single `@/lib/auth` path while the real config lives in `@chatwoot-next/auth`.
import { handlers } from '@chatwoot-next/auth/auth-config';

export { auth, signIn, signOut, handlers } from '@chatwoot-next/auth/auth-config';
export const { GET, POST } = handlers;
