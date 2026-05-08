/**
 * Policy overlays — 6 overrides.
 *
 * Rails source: `enterprise/app/policies/enterprise/`
 *  - conversation_policy.rb
 *  - inbox_policy.rb
 *  - account_policy.rb
 *  - user_policy.rb
 *  - contact_policy.rb
 *  - search_service_policy.rb
 *
 * Each OSS policy in `app/policies/<name>_policy.rb` declares
 * `prepend_mod_with 'EnterpriseFooPolicy'` to pick these up. We register
 * each enterprise replacement against the same key the OSS policy uses.
 */

import type { OverlayRegistry } from '../boot';

export function registerPolicyOverlays(policyRegistry: OverlayRegistry): void {
  // TODO: port real override bodies once the OSS policy package lands.
  policyRegistry.register('Conversation', enterpriseConversationPolicy);
  policyRegistry.register('Inbox', enterpriseInboxPolicy);
  policyRegistry.register('Account', enterpriseAccountPolicy);
  policyRegistry.register('User', enterpriseUserPolicy);
  policyRegistry.register('Contact', enterpriseContactPolicy);
  policyRegistry.register('SearchService', enterpriseSearchServicePolicy);
}

const enterpriseConversationPolicy = { __overlay: 'enterprise/conversation_policy' };
const enterpriseInboxPolicy = { __overlay: 'enterprise/inbox_policy' };
const enterpriseAccountPolicy = { __overlay: 'enterprise/account_policy' };
const enterpriseUserPolicy = { __overlay: 'enterprise/user_policy' };
const enterpriseContactPolicy = { __overlay: 'enterprise/contact_policy' };
const enterpriseSearchServicePolicy = { __overlay: 'enterprise/search_service_policy' };
