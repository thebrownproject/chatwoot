/**
 * Custom Roles + granular RBAC — enterprise-only.
 *
 * Rails source:
 *   `enterprise/app/models/custom_role.rb`
 *   `enterprise/app/policies/custom_role_policy.rb`
 */

export interface CustomRoleUser {
  id: number;
  accountId: number;
  customRoleId?: number;
}

export type Permission =
  | 'conversation_manage'
  | 'conversation_unassigned_manage'
  | 'conversation_participating_manage'
  | 'contact_manage'
  | 'report_manage'
  | 'knowledge_base_manage';

export function evaluateCustomRolePermission(
  _user: CustomRoleUser,
  _permission: Permission,
): boolean {
  // TODO: load CustomRole permissions from DB and intersect with role mask.
  return false;
}
