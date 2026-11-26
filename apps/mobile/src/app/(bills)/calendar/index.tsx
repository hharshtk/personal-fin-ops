import { AS_OF, AS_OF_MONTH, CALENDAR_MONTHS, OCCURRENCES } from "@myfinancespace/core/data";
import { countLabel, formatDate, formatMoney, formatMonth, monthOf, relativeDays } from "@myfinancespace/core/format";
import { billFor, billSummary, needsPayment, type Bill } from "@myfinancespace/core/payments";
import type { ISODate } from "@myfinancespace/core/types";
import { space } from "@myfinancespace/tokens";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { BillRow } from "@/components/BillRow";
import { Figures } from "@/components/Figures";
import { MonthGrid, MonthStepper, type DayMark } from "@/components/MonthGrid";
import { TextButton } from "@/components/Pressables";
import { Empty, Section } from "@/components/Section";
import { useLedger } from "@/state/ledger";
import { usePalette } from "@/theme";

export default function Bills() {
  const palette = usePalette();
  const { txns, paid } = useLedger();
  const { day } = useLocalSearchParams<{ day?: ISODate }>();
  const [month, setMonth] = useState(day ? monthOf(day) : AS_OF_MONTH);
  const [syncedDay, setSyncedDay] = useState(day);
  if (day !== syncedDay) {
    // A link from elsewhere picked the day: turn to its month.
    setSyncedDay(day);
    if (day) setMonth(monthOf(day));
  }
  const pick = (next: ISODate | undefined) => router.setParams({ day: next });
  const turnTo = (next: string) => {
    setMonth(next);
    pick(undefined);
  };

  const bills = OCCURRENCES.map((o) => billFor(o, txns, paid));
  const summary = billSummary(bills, AS_OF);
  const inMonth = bills.filter((b) => monthOf(b.o.date) === month);
  const unpaid = inMonth.filter((b) => b.status !== "paid");
  const cleared = inMonth.filter((b) => b.status === "paid");
  const onDay = day ? bills.filter((b) => b.o.date === day) : [];
  const at = CALENDAR_MONTHS.indexOf(month);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <Figures
        items={[
          { label: "Overdue", value: <Count n={summary.overdue.count} red />, sub: summary.overdue.count ? formatMoney(summary.overdue.amount) : "Nothing late" },
          { label: "Needs you, next 30 days", value: <Count n={summary.due.count} />, sub: `${formatMoney(summary.due.amount)} to pay` },
          { label: "Autopay, next 30 days", value: <Count n={summary.autopay.count} />, sub: `${formatMoney(summary.autopay.amount)} will debit itself` },
          { label: `Paid in ${formatMonth(AS_OF_MONTH, "MMMM")}`, value: <Count n={summary.paidThisMonth.count} />, sub: `${formatMoney(summary.paidThisMonth.amount)} cleared` },
        ]}
      />

      <View style={[styles.sheet, { borderTopColor: palette.rule2 }]}>
        <MonthStepper
          label={formatMonth(month, "MMMM yyyy")}
          onPrevious={at > 0 ? () => turnTo(CALENDAR_MONTHS[at - 1]) : undefined}
          onNext={at < CALENDAR_MONTHS.length - 1 ? () => turnTo(CALENDAR_MONTHS[at + 1]) : undefined}
        />
        <MonthGrid month={month} today={AS_OF} selected={day} onSelect={(d) => pick(d === day ? undefined : d)} day={(d) => dayMark(inMonth.filter((b) => b.o.date === d))} />
        <AppText size="xs" color="ink3" style={styles.legend}>
          Red days have money due, and tinted ones are overdue. ✓ means everything that day is paid. The ringed day is today.
        </AppText>
      </View>

      {day ? (
        <Section title={formatDate(day, "EEE, d MMM")} meta={relativeDays(day, AS_OF)}>
          <BillList bills={onDay} empty="Nothing on this day." />
          <View style={styles.more}>
            <TextButton label="Show the whole month" onPress={() => pick(undefined)} />
          </View>
        </Section>
      ) : (
        <>
          <Section title="Still to pay" meta={formatMonth(month, "MMMM")}>
            <BillList bills={unpaid} empty={`Everything in ${formatMonth(month, "MMMM")} is paid.`} />
          </Section>
          {cleared.length > 0 && (
            <Section title="Paid" meta={`${cleared.length} in ${formatMonth(month, "MMMM")}`}>
              <BillList bills={cleared} empty="" />
            </Section>
          )}
        </>
      )}
    </ScrollView>
  );
}

/** What the sheet prints on a day: red if it waits for the user, a tick if it is all paid, else the number of bills. */
function dayMark(bills: Bill[]): DayMark {
  if (!bills.length) return {};
  const waiting = bills.filter(needsPayment);
  const overdue = bills.some((b) => b.status === "overdue");
  const allPaid = bills.every((b) => b.status === "paid");
  return {
    color: waiting.length ? "red" : allPaid ? "ink3" : "ink",
    mark: allPaid ? "✓" : waiting.length ? `${waiting.length} due` : String(bills.length),
    tinted: overdue,
    label: `${countLabel(bills.length, "bill")}${overdue ? ", overdue" : waiting.length ? `, ${waiting.length} to pay` : allPaid ? ", all paid" : ", on autopay"}`,
  };
}

function BillList({ bills, empty }: { bills: Bill[]; empty: string }) {
  if (!bills.length) return <Empty>{empty}</Empty>;
  return bills.map((b, i) => <BillRow key={b.o.id} bill={b} first={i === 0} />);
}

function Count({ n, red = false }: { n: number; red?: boolean }) {
  return (
    <AppText size="xl" weight="600" tabular color={red && n ? "red" : "ink"}>
      {n}
    </AppText>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: space[3], gap: space[2] },
  legend: { paddingHorizontal: space[4] },
  more: { alignItems: "flex-start", paddingHorizontal: space[2] },
});
