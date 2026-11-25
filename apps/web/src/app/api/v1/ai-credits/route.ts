import { gateway } from "ai";
import { connection } from "next/server";
import type { AiCredits } from "@myfinancespace/core/ai-credits";
import type { ApiErrorBody } from "@myfinancespace/core/api";

/** aiCredits.get */
export async function GET() {
  // The balance changes with every AI call, so never prerender it at build time.
  await connection();
  try {
    const { balance, totalUsed } = await gateway.getCredits();
    return Response.json(
      {
        balance: { amount: balance, currency: "USD" },
        used: { amount: totalUsed, currency: "USD" },
      } satisfies AiCredits,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("aiCredits.get failed:", error instanceof Error ? `${error.name}: ${error.message}` : error);
    return Response.json(
      { error: { code: "credits_unavailable", message: "AI Gateway didn't return a credit balance. Try again." } } satisfies ApiErrorBody,
      { status: 502 },
    );
  }
}
