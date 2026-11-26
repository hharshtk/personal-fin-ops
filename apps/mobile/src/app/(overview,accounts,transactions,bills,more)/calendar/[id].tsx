import { AS_OF, entityName, getCategory, getCommitment, ledgerAccountName, ledgerAccountShort, OCCURRENCES } from "@myfinancespace/core/data";
import { diffDays, formatDate, formatMoney } from "@myfinancespace/core/format";
import { billFor, earlierOccurrences, needsPayment, paymentFor } from "@myfinancespace/core/payments";
import { space } from "@myfinancespace/tokens";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { billStatusLabel } from "@/components/BillRow";
import { Money } from "@/components/Money";
import { NotHereYet } from "@/components/NotHereYet";
import { Button } from "@/components/Pressables";
import { Facts, Section } from "@/components/Section";
import { accountRef, recordHref } from "@/links";
import { useLedger } from "@/state/ledger";

export default function BillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { txns, paid, pay } = useLedger();
  const occurrence = OCCURRENCES.find((o) => o.id === id);
  const commitment = occurrence && getCommitment(occurrence.commitmentId);
  if (!occurrence || !commitment) return <NotHereYet title="Bill not found" detail="It may have been removed." />;

  const bill = billFor(occurrence, txns, paid);
  const isPaid = bill.status === "paid";
  const unpaid = needsPayment(bill);
  const payment = paymentFor(occurrence, txns);
  const earlier = earlierOccurrences(occurrence);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <View style={styles.head}>
        <AppText size="sm" color="ink3">
          {commitment.cadence} · {commitment.autopay ? "Autopay" : "Manual payment"}
        </AppText>
        <AppText accessibilityRole="header" size="xl" weight="600">
          {commitment.name}
        </AppText>
        <Money value={bill.amount} size="3xl" weight="700" color={isPaid ? "ink3" : "ink"} style={isPaid && styles.struck} />
        <AppText weight="600" color={unpaid ? "red" : isPaid ? "pen" : "ink2"}>
          {billStatusLabel(bill, commitment.autopay)}
        </AppText>
        <AppText color="ink2">
          {isPaid ? "Was due" : "Due"} {formatDate(occurrence.date, "EEE, d MMM")}
          {bill.status === "overdue" ? `, ${diffDays(AS_OF, occurrence.date)} days late` : ""}
        </AppText>
      </View>
      {unpaid && (
        <View style={styles.action}>
          <Button kind="primary" label={`Mark as paid from ${ledgerAccountShort(commitment.payFromId)}`} onPress={() => pay(occurrence)} />
          <AppText size="sm" color="ink3">
            Records the payment in your ledger. No money moves.
          </AppText>
        </View>
      )}
      <Section title="Details">
        <Facts
          items={[
            { label: "Pays from", value: ledgerAccountName(commitment.payFromId), href: recordHref(accountRef(commitment.payFromId)) },
            { label: "Category", value: getCategory(commitment.categoryId).name },
            ...(commitment.link ? [{ label: "For", value: entityName(commitment.link), href: recordHref(commitment.link) }] : []),
            { label: "Amount", value: commitment.variable ? "Varies each cycle" : "Fixed" },
            ...(payment ? [{ label: isPaid ? "Paid by" : "Last payment", value: `${payment.description}, ${formatDate(payment.date, "d MMM")}`, href: recordHref({ kind: "transaction", id: payment.id }) }] : []),
          ]}
        />
      </Section>
      {earlier.length > 0 && (
        <Section title="Earlier">
          <Facts items={earlier.map((o) => ({ label: formatDate(o.date), value: `${formatMoney(o.amount)} · ${billStatusLabel(billFor(o, txns, paid), commitment.autopay)}` }))} />
        </Section>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { gap: space[1], paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[4] },
  action: { gap: space[2], paddingHorizontal: space[4], paddingBottom: space[5] },
  struck: { textDecorationLine: "line-through" },
});
