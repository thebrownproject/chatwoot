export class NotAuthorizedError extends Error {
  policy: string;
  action: string;
  userId: bigint;
  recordId: bigint | null;

  constructor(params: {
    policy: string;
    action: string;
    userId: bigint;
    recordId: bigint | null;
    message?: string;
  }) {
    super(
      params.message ??
        `Not authorized: ${params.policy}#${params.action} for user ${params.userId}`,
    );
    this.name = 'NotAuthorizedError';
    this.policy = params.policy;
    this.action = params.action;
    this.userId = params.userId;
    this.recordId = params.recordId;
  }
}
