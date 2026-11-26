import { getCategory, ledgerAccountShort } from "@myfinancespace/core/data";
import type { Transaction } from "@myfinancespace/core/types";
import { formatMoney } from "@myfinancespace/core/format";
import { StyleSheet, View } from "react-native";
import { recordHref } from "@/links";
import { AppText } from "./AppText";
import { DateMark } from "./DateMark";
import { Money } from "./Money";
import { Row, RowLink } from "./Section";

/** `balance` is the account's balance after this transaction, in a passbook. */
export function TransactionRow({ txn, amount, balance, first }: { txn: Transaction; amount: number; balance?: number; first: boolean }) {
  const manual = txn.source === "manual";
  const where = balance === undefined ? ledgerAccountShort(txn.accountId) : txn.method;
  return (
    <Row first={first}>
      <RowLink href={recordHref({ kind: "transaction", id: txn.id })}>
        <DateMark date={txn.date} />
        <View style={styles.text}>
          <AppText color={manual ? "pen" : "ink"}>{txn.description}</AppText>
          <AppText size="sm" color="ink3">
            {getCategory(txn.categoryId).name} · {where}
            {manual ? " · Added by you" : ""}
          </AppText>
        </View>
        <View style={styles.amount}>
          <Money value={amount} tone="flow" weight="500" />
          {balance !== undefined && (
            <AppText size="sm" color="ink3" tabular accessibilityLabel={`balance ${formatMoney(balance)}`}>
              {formatMoney(balance)}
            </AppText>
          )}
        </View>
      </RowLink>
    </Row>
  );
}

const styles = StyleSheet.create({ text: { flex: 1 }, amount: { alignItems: "flex-end" } });
