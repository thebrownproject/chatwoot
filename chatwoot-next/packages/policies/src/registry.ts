import type { Policy } from './types.js';

/**
 * Global registry for named policies.
 *
 * Enterprise package calls `registry.register('Conversation', enterpriseConversationPolicy)`
 * to override OSS at boot. `requireAll(...)` is used at boot to assert that the
 * expected enterprise overlays have been loaded.
 */
export class PolicyRegistry {
  private policies = new Map<string, Policy<unknown, unknown>>();

  register<TRecord, TUser>(name: string, policy: Policy<TRecord, TUser>): void {
    this.policies.set(name, policy as Policy<unknown, unknown>);
  }

  get<TRecord, TUser>(name: string): Policy<TRecord, TUser> | undefined {
    return this.policies.get(name) as Policy<TRecord, TUser> | undefined;
  }

  /**
   * Throws if any of the named policies are missing.
   * Used at boot to assert enterprise overlays loaded.
   */
  requireAll(names: string[]): void {
    const missing = names.filter(name => !this.policies.has(name));
    if (missing.length > 0) {
      throw new Error(`Missing required policies: ${missing.join(', ')}`);
    }
  }
}

export const policyRegistry = new PolicyRegistry();
