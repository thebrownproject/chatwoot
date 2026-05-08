// Login page stub — agent sign-in via Auth.js Credentials provider.
// Source parity: `app/javascript/dashboard/routes/login/Login.vue`.
// The real implementation will call `signIn('credentials', { email, password })`
// from `next-auth/react` and surface device/2FA flows.

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        // TODO: wire to Auth.js Credentials provider via server action
        action="/api/auth/callback/credentials"
        method="post"
        className="w-full max-w-sm space-y-4 p-6"
      >
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <input name="email" type="email" placeholder="Email" className="w-full" />
        <input name="password" type="password" placeholder="Password" className="w-full" />
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
}
