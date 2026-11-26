import { AS_OF, DATA_START_DATE, ledgerAccountName } from "@myfinancespace/core/data";
import { formatMoney } from "@myfinancespace/core/format";
import type { NewTransaction } from "@myfinancespace/core/payments";
import {
  DRAFT_METHODS,
  draftAccountIds,
  draftAmount,
  draftCategories,
  planTransaction,
  validateTransactionDraft,
  withDraftKind,
  type TransactionDraft,
  type TransactionKind,
} from "@myfinancespace/core/transactions";
import type { PaymentMethod } from "@myfinancespace/core/types";
import { space } from "@myfinancespace/tokens";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Platform, ScrollView, StyleSheet } from "react-native";
import { AppText } from "./AppText";
import { ChoiceField } from "./Choice";
import { DateField } from "./DateField";
import { TextField } from "./Field";
import { Button, Segments, TextButton } from "./Pressables";

const KINDS: { id: TransactionKind; label: string }[] = [
  { id: "expense", label: "Money out" },
  { id: "income", label: "Money in" },
  { id: "transfer", label: "Transfer" },
];

const WHO: Record<TransactionKind, { label: string; placeholder: string }> = {
  expense: { label: "Paid to", placeholder: "e.g. Sunday market · vegetables" },
  income: { label: "From", placeholder: "e.g. Lumen Labs" },
  transfer: { label: "Description (optional)", placeholder: "e.g. Top up emergency fund" },
};

/** Adding or editing the user's own transaction. The core decides what is valid. */
export function TransactionForm({ initial, submitLabel, onSubmit }: { initial: TransactionDraft; submitLabel: string; onSubmit: (t: NewTransaction) => void }) {
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const set = (patch: Partial<TransactionDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const found = validateTransactionDraft(draft, { asOf: AS_OF, ledgerStart: DATA_START_DATE });
  const errors = submitted ? found : {};
  const accounts = draftAccountIds(draft.kind).map((id) => ({ id, label: ledgerAccountName(id) }));

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(found).length) return;
    onSubmit(planTransaction(draft));
    router.back();
  };

  return (
    <>
      <Stack.Screen options={{ headerLeft: () => <TextButton label="Cancel" onPress={() => router.back()} /> }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.form}
      >
        <AppText size="base" color="ink3">
          For cash spends and anything your bank statement doesn&apos;t show. It lasts until you close the app.
        </AppText>
        <Segments label="Transaction type" options={KINDS} value={draft.kind} onChange={(kind) => setDraft((d) => withDraftKind(d, kind))} />
        <TextField
          label="Amount (₹)"
          value={draft.amount}
          onChangeText={(amount) => set({ amount: amount.replace(/[^\d.,]/g, "") })}
          inputMode="decimal"
          placeholder="0"
          hint={draft.amount && !found.amount ? formatMoney(draftAmount(draft)) : undefined}
          error={errors.amount}
        />
        <DateField label="Date" value={draft.date} min={DATA_START_DATE} max={AS_OF} error={errors.date} onChange={(date) => set({ date })} />
        <TextField label={WHO[draft.kind].label} placeholder={WHO[draft.kind].placeholder} value={draft.description} onChangeText={(description) => set({ description })} error={errors.description} />
        <ChoiceField title={draft.kind === "income" ? "Into account" : "From account"} options={accounts} value={draft.accountId} onChange={(accountId) => set({ accountId })} />
        {draft.kind === "transfer" ? (
          <ChoiceField title="To account" options={accounts} value={draft.toAccountId} onChange={(toAccountId) => set({ toAccountId })} error={errors.toAccount} />
        ) : (
          <ChoiceField title="Category" options={draftCategories(draft.kind).map((c) => ({ id: c.id, label: c.name }))} value={draft.categoryId} onChange={(categoryId) => set({ categoryId })} />
        )}
        <ChoiceField title="Paid by" options={DRAFT_METHODS.map((m) => ({ id: m, label: m }))} value={draft.method} onChange={(m) => set({ method: m as PaymentMethod })} />
        <TextField label="Note" placeholder="Optional" value={draft.note} onChangeText={(note) => set({ note })} multiline />
        {Object.keys(errors).length > 0 && (
          <AppText color="red" accessibilityLiveRegion="assertive">
            Fix the marked fields to continue.
          </AppText>
        )}
        <Button kind="primary" label={submitLabel} onPress={submit} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({ form: { gap: space[4], padding: space[4] } });
