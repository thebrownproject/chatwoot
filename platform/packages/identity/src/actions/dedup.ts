import { findOrCreateContact } from '../data/users.js';

/**
 * Deduplicate a contact by email.
 * Delegates to findOrCreateContact — same logic, exposed as an action alias.
 */
export const deduplicateContact = findOrCreateContact;
