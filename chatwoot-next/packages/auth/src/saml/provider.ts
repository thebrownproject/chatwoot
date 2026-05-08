/**
 * Multi-tenant SAML provider for Auth.js v5.
 *
 * Chatwoot Enterprise stores per-account SAML config in
 * `account_saml_settings` (see `enterprise/config/initializers/omniauth_saml.rb`).
 * The Auth.js provider is constructed lazily per request so we can look up the
 * IdP metadata for the account being signed into.
 */

export type AccountSamlSettings = {
  idp_entity_id: string;
  idp_sso_target_url: string;
  idp_cert: string;
  sp_entity_id?: string;
  callback_url?: string;
  name_identifier_format?: string;
};

export type LoadAccountSamlSettings = (
  accountId: number | bigint,
) => Promise<AccountSamlSettings | null>;

export type CreateSamlProviderOptions = {
  loadAccountSamlSettings: LoadAccountSamlSettings;
};

/**
 * Build an Auth.js v5 SAML provider that resolves IdP settings per account.
 *
 * The returned provider wraps `@node-saml/node-saml` for AuthnRequest
 * generation and SAMLResponse validation. The account id is read off the
 * sign-in URL (e.g. `/api/auth/saml/<accountId>/callback`) and used to load
 * the row from `account_saml_settings`.
 */
export function createSamlProvider(_options: CreateSamlProviderOptions) {
  // TODO: return an Auth.js v5 provider object. The provider must:
  //   1. On authorize: load the account's SAML settings, construct a
  //      `SAML` instance from `@node-saml/node-saml`, and redirect the
  //      browser to the IdP SSO URL with a generated AuthnRequest.
  //   2. On callback: validate the SAMLResponse signature using `idp_cert`,
  //      extract the NameID / email, and resolve to a Chatwoot user row
  //      (creating a membership in the target account if missing, mirroring
  //      `Enterprise::Auth::SamlAuthenticatable`).
  throw new Error('createSamlProvider: not implemented');
}
