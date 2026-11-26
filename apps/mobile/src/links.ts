import { getCard } from "@myfinancespace/core/data";
import type { AttentionItem, EntityRef } from "@myfinancespace/core/types";
import type { Href } from "expo-router";

/** The screen for a record, or null while the app has none for it. */
export function recordHref(ref: EntityRef): Href | null {
  switch (ref.kind) {
    case "account":
      return { pathname: "/accounts/[id]", params: { id: ref.id } };
    case "transaction":
      return { pathname: "/transactions/[id]", params: { id: ref.id } };
    case "commitment":
      return { pathname: "/calendar/[id]", params: { id: ref.id } };
    case "category":
      return { pathname: "/transactions", params: { category: ref.id, period: "month" } };
    default:
      return null;
  }
}

/** Where an attention item leads. A card has no screen yet, so its bill opens on the calendar. */
export function attentionHref(item: AttentionItem): Href | null {
  if (item.ref.kind === "card" && item.date) return { pathname: "/calendar", params: { day: item.date } };
  return recordHref(item.ref);
}

/** The record behind a ledger account id: a cash account or a credit card. */
export function accountRef(id: string): EntityRef {
  return { kind: getCard(id) ? "card" : "account", id };
}
