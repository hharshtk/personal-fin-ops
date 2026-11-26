import { AS_OF, attentionItems, dataNote, netWorthChange, netWorthNow } from "@myfinancespace/core/data";
import { countLabel, formatLongDate, formatMonth, fyLabel } from "@myfinancespace/core/format";
import { upcomingBills } from "@myfinancespace/core/payments";
import { space } from "@myfinancespace/tokens";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { AttentionRow } from "@/components/AttentionRow";
import { BillRow } from "@/components/BillRow";
import { Delta, Money } from "@/components/Money";
import { Empty, Section } from "@/components/Section";
import { useLedger } from "@/state/ledger";
import { usePalette } from "@/theme";

const UPCOMING_DAYS = 10;

// Reads the core's fixtures until the API exists (CONSTITUTION.md, Article 4).
export default function Overview() {
  const palette = usePalette();
  const { txns, paid } = useLedger();
  const position = netWorthNow(txns);
  const change = netWorthChange(txns);
  const attention = attentionItems(txns, new Set(paid));
  const bills = upcomingBills(txns, paid, { days: UPCOMING_DAYS });

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <View style={styles.position}>
        <AppText size="sm" color="ink3">
          {formatLongDate(AS_OF)} · {fyLabel(AS_OF)}
        </AppText>
        <View>
          <AppText size="base" color="ink3" weight="500">
            Net worth
          </AppText>
          <Money value={position.netWorth} compact size="3xl" weight="700" selectable />
          <Delta value={change.amount} pct={change.pct} since={formatMonth(change.sinceMonth, "MMMM")} />
        </View>
        <View style={[styles.figures, { borderTopColor: palette.rule }]}>
          <Figure label="Assets" value={position.assets} />
          <Figure label="Liabilities" value={position.liabilities} />
          <Figure label="Cash you can use" value={position.liquid} />
        </View>
      </View>

      <Section title="Needs attention" meta={attention.length ? countLabel(attention.length, "item") : undefined}>
        {attention.map((item, i) => (
          <AttentionRow key={item.id} item={item} first={i === 0} />
        ))}
        {!attention.length && <Empty>Nothing needs you right now.</Empty>}
      </Section>

      <Section title="Coming up" meta={`next ${UPCOMING_DAYS} days`}>
        {bills.map((bill, i) => (
          <BillRow key={bill.o.id} bill={bill} first={i === 0} />
        ))}
        {!bills.length && <Empty>{`Nothing due in the next ${UPCOMING_DAYS} days.`}</Empty>}
      </Section>

      <AppText size="xs" color="ink3" style={styles.note}>
        {dataNote}
      </AppText>
    </ScrollView>
  );
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <View accessible style={styles.figure}>
      <AppText size="sm" color="ink3">
        {label}
      </AppText>
      <Money value={value} compact size="xl" weight="600" />
    </View>
  );
}

const styles = StyleSheet.create({
  position: { gap: space[4], paddingHorizontal: space[4], paddingBottom: space[5] },
  figures: { flexDirection: "row", flexWrap: "wrap", columnGap: space[6], rowGap: space[3], borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space[3] },
  figure: { flexGrow: 1 },
  note: { padding: space[4] },
});
