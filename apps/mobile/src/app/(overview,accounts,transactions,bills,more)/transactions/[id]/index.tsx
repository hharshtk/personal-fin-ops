import { entityName, getCategory, ledgerAccountName } from "@myfinancespace/core/data";
import { formatDate } from "@myfinancespace/core/format";
import { canDeleteTransaction, canEditTransaction } from "@myfinancespace/core/transactions";
import type { EntityRef } from "@myfinancespace/core/types";
import { space } from "@myfinancespace/tokens";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Money } from "@/components/Money";
import { NotHereYet } from "@/components/NotHereYet";
import { Button } from "@/components/Pressables";
import { Facts, Section } from "@/components/Section";
import { accountRef, recordHref } from "@/links";
import { useLedger } from "@/state/ledger";

export default function TransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { txns, remove } = useLedger();
  const txn = txns.find((t) => t.id === id);
  if (!txn) return <NotHereYet title="Transaction removed" detail="It was deleted in this session." />;

  const fact = (label: string, ref: EntityRef, name: string) => ({ label, value: name, href: recordHref(ref) });
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <View style={styles.head}>
        <AppText size="sm" color="ink3">
          {formatDate(txn.date, "EEE, d MMM")} {txn.date.slice(0, 4)}
          {txn.source === "manual" ? " · Added by you" : ""}
        </AppText>
        <AppText accessibilityRole="header" size="xl" weight="600" color={txn.source === "manual" ? "pen" : "ink"}>
          {txn.description}
        </AppText>
        <Money value={txn.amount} tone="flow" decimals={2} size="3xl" weight="700" selectable />
      </View>
      <Section title="Details">
        <Facts
          items={[
            { label: "Category", value: getCategory(txn.categoryId).name },
            fact("Account", accountRef(txn.accountId), ledgerAccountName(txn.accountId)),
            ...(txn.counterpartyId ? [fact("To", accountRef(txn.counterpartyId), ledgerAccountName(txn.counterpartyId))] : []),
            { label: "Method", value: txn.method },
            ...(txn.occurrenceId ? [{ label: "Pays", value: "Bill", href: recordHref({ kind: "commitment", id: txn.occurrenceId }) }] : []),
            ...(txn.link ? [fact("Linked to", txn.link, entityName(txn.link))] : []),
            { label: "Status", value: txn.status === "cleared" ? "Cleared" : "Pending" },
            ...(txn.note ? [{ label: "Note", value: txn.note }] : []),
          ]}
        />
      </Section>
      <View style={styles.actions}>
        {canEditTransaction(txn) && <Button label="Edit" onPress={() => router.push({ pathname: "/transactions/[id]/edit", params: { id } })} />}
        {canDeleteTransaction(txn) ? (
          <>
            {txn.occurrenceId && (
              <AppText size="base" color="ink2">
                This payment was recorded against a bill. Deleting it makes the bill unpaid again.
              </AppText>
            )}
            <Button
              label="Delete"
              kind="danger"
              onPress={() => {
                router.back();
                remove(txn);
              }}
            />
          </>
        ) : (
          <AppText size="sm" color="ink3">
            This comes from the bank statement, so it can&apos;t be edited here.
          </AppText>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { gap: space[1], paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[5] },
  actions: { gap: space[3], padding: space[4] },
});
