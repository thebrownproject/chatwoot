/**
 * Multi-tenant SAML SSO — enterprise-only.
 *
 * Rails source:
 *   `enterprise/config/initializers/omniauth_saml.rb`
 *   `enterprise/app/models/account_saml_settings.rb`
 *
 * Plugs into `@chatwoot-next/auth/saml/provider`.
 */

export interface AccountSamlSettings {
  accountId: number;
  idpEntityId: string;
  idpSsoUrl: string;
  idpCert: string;
  spEntityId: string;
}

export interface SamlAssertion {
  nameId: string;
  attributes: Record<string, string | string[]>;
}

export function loadAccountSamlSettings(_accountId: number): AccountSamlSettings | null {
  // TODO: read from DB; fall back to null when SAML isn't configured.
  return null;
}

export function processSamlAssertion(_accountId: number, _assertion: SamlAssertion): void {
  // TODO: provision/link user, then issue session via @chatwoot-next/auth.
}
