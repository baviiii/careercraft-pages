// Typed errors used across edge functions. Caught by handler() in
// _shared/http/responses.ts and mapped to JSON responses with the right status.

export class AppError extends Error {
  constructor(
    message: string,
    public readonly status = 500,
    public readonly code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class RateLimitError extends AppError {
  constructor(
    message: string,
    public readonly retryAfterSec?: number,
    public readonly limit?: number,
  ) {
    super(message, 429, "RATE_LIMITED");
  }
}

export class ProviderError extends AppError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly providerStatus?: number,
  ) {
    super(message, 502, "PROVIDER_ERROR");
  }
}

export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, "CONFIG_ERROR");
  }
}
