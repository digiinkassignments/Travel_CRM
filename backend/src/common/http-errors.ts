export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code: string) {
    super(message);
  }
}

export const Errors = {
  unauthorized: (msg = "Authentication required") => new ApiError(401, msg, "UNAUTHORIZED"),
  forbidden: (msg = "You do not have access to this feature", code = "FEATURE_NOT_ENTITLED") =>
    new ApiError(403, msg, code),
  notFound: (msg = "Resource not found") => new ApiError(404, msg, "NOT_FOUND"),
  badRequest: (msg = "Invalid request") => new ApiError(400, msg, "BAD_REQUEST"),
  locked: (msg = "This account is locked pending payment") => new ApiError(423, msg, "SUBSCRIPTION_LOCKED"),
};
