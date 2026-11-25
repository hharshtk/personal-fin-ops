/**
 * The error body every /api/v1 endpoint returns (CONSTITUTION.md, Article 4).
 * Clients branch on `code`, never on `message`, and treat a code they don't
 * recognise as a generic failure (Article 5).
 */
export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

/**
 * Money that needs more precision than minor units, such as AI usage billed in
 * fractions of a cent. The amount is a decimal string (Article 6).
 */
export interface PreciseMoney {
  amount: string;
  currency: string;
}

export function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const { error } = value;
  return typeof error === "object" && error !== null && "code" in error && typeof error.code === "string";
}
