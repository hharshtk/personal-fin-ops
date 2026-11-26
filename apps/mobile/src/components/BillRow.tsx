import { getCommitment } from "@myfinancespace/core/data";
import { formatDate, formatMoney } from "@myfinancespace/core/format";
import { needsPayment, type Bill } from "@myfinancespace/core/payments";
import { space } from "@myfinancespace/tokens";
import { StyleSheet, View } from "react-native";
import { recordHref } from "@/links";
import { useLedger } from "@/state/ledger";
import { AppText } from "./AppText";
import { DateMark } from "./DateMark";
import { Money } from "./Money";
import { TextButton } from "./Pressables";
import { Row, RowLink } from "./Section";

/** A bill's status in words. */
export function billStatusLabel({ status, paidOn }: Pick<Bill, "status" | "paidOn">, autopay: boolean | undefined): string {
  if (status === "paid") return paidOn ? `Paid ${formatDate(paidOn, "d MMM")}` : "Paid";
  if (status === "overdue") return "Overdue";
  if (status === "due") return "Due";
  return autopay === false ? "Scheduled" : "Autopay";
}

export function BillRow({ bill, first }: { bill: Bill; first: boolean }) {
  const { pay } = useLedger();
  const commitment = getCommitment(bill.o.commitmentId);
  const name = commitment?.name ?? "Bill";
  const unpaid = needsPayment(bill);
  const paid = bill.status === "paid";
  return (
    <Row first={first}>
      <RowLink href={recordHref({ kind: "commitment", id: bill.o.id })}>
        <DateMark date={bill.o.date} color={unpaid ? "red" : paid ? "ink3" : "ink"} />
        <View style={styles.name}>
          <AppText color={paid ? "ink3" : "ink"}>{name}</AppText>
          <AppText size="sm" weight={unpaid ? "600" : "400"} color={unpaid ? "red" : paid ? "pen" : "ink3"}>
            {billStatusLabel(bill, commitment?.autopay)}
          </AppText>
        </View>
        {!unpaid && <Money value={bill.amount} color={paid ? "ink3" : "ink"} style={paid && styles.struck} />}
      </RowLink>
      {unpaid && (
        <View style={styles.action}>
          <Money value={bill.amount} />
          <TextButton label="Mark paid" weight="600" accessibilityLabel={`Mark ${name} as paid, ${formatMoney(bill.amount)}`} onPress={() => pay(bill.o)} />
        </View>
      )}
    </Row>
  );
}

const styles = StyleSheet.create({
  name: { flex: 1 },
  struck: { textDecorationLine: "line-through" },
  action: { alignItems: "flex-end", paddingTop: space[3] },
});
