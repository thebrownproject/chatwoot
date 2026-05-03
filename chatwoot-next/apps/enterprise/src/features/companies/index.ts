/**
 * Company enrichment — enterprise-only.
 *
 * Rails source:
 *   `enterprise/app/services/business_email_detector_service.rb`
 *   `enterprise/app/services/clearbit_lookup_service.rb`
 */

export interface CompanyEnrichment {
  domain: string;
  name?: string;
  industry?: string;
  size?: string;
  logoUrl?: string;
}

export function enrichCompany(_domain: string): CompanyEnrichment | null {
  // TODO: detect business email, then call Clearbit (or fallback) lookup.
  return null;
}
