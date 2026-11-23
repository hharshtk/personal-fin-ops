import type { PreciseMoney } from "./api";

/**
 * Response of `aiCredits.get`: GET /api/v1/ai-credits.
 *
 * The AI Gateway credit balance behind this app's key, shared by every AI
 * feature that uses it. Amounts are in USD, the currency the gateway bills in.
 * Errors: `ApiErrorBody` with code `credits_unavailable`.
 */
export interface AiCredits {
  balance: PreciseMoney;
  used: PreciseMoney;
}
