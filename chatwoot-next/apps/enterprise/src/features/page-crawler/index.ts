/**
 * Page crawler + website branding — enterprise-only.
 *
 * Rails source:
 *   `enterprise/app/services/page_crawler_service.rb`
 */

export interface CrawlResult {
  url: string;
  title?: string;
  description?: string;
  ogImage?: string;
  brandColors?: string[];
  faviconUrl?: string;
}

export function crawlPage(_url: string): CrawlResult | null {
  // TODO: fetch + parse page; extract OG metadata + brand colors.
  return null;
}
