import { accountActivity, depositStatus, isDeposit } from "@myfinancespace/core/accounts";
import { accountBalance, accountLedger, AS_OF, DATA_START_DATE, getAccount, getGoal, type LedgerRow } from "@myfinancespace/core/data";
import { addDays, countLabel, formatDate, formatMoney, formatMonth, formatPct, monthOf, relativeDays } from "@myfinancespace/core/format";
import type { CashAccount } from "@myfinancespace/core/types";
import { space } from "@myfinancespace/tokens";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Figures } from "@/components/Figures";
import { Money } from "@/components/Money";
import { NotHereYet } from "@/components/NotHereYet";
import { AddButton, Segments } from "@/components/Pressables";
import { Progress } from "@/components/Progress";
import { Empty, Facts, Section } from "@/components/Section";
import { TransactionRow } from "@/components/TransactionRow";
import { useLedger } from "@/state/ledger";

export default function AccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const account = getAccount(id);
  if (!account) return <NotHereYet title="Account not found" detail="It may have been closed or removed." />;
  return (
    <>
      <Stack.Screen options={{ title: account.name }} />
      {isDeposit(account) ? <Deposit account={account} /> : <Passbook account={account} />}
    </>
  );
}

/* ───────────── Savings and cash ───────────── */

const RANGES = [
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: `Since ${formatMonth(monthOf(DATA_START_DATE), "MMMM")}` },
] as const;

function Passbook({ account }: { account: CashAccount }) {
  const { txns } = useLedger();
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("90");
  const ledger = accountLedger(account.id, txns);
  const activity = accountActivity(ledger, AS_OF);
  const since = range === "all" ? DATA_START_DATE : addDays(AS_OF, 1 - Number(range));
  const rows = ledger.filter((r) => r.txn.date >= since);

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <AddButton onPress={() => router.push({ pathname: "/transactions/new", params: { account: account.id } })} /> }} />
      <FlatList<LedgerRow>
        contentInsetAdjustmentBehavior="automatic"
        data={rows}
        keyExtractor={(r) => r.txn.id}
        renderItem={({ item, index }) => <TransactionRow txn={item.txn} amount={item.amount} balance={item.balance} first={index === 0} />}
        ListHeaderComponent={
          <>
            <Balance account={account} value={accountBalance(account.id, txns)} label="Balance" />
            <Figures
              items={[
                { label: "In, last 30 days", value: <Money value={activity.moneyIn} sign="always" tone="flow" size="xl" weight="600" />, sub: countLabel(activity.credits, "credit") },
                { label: "Out, last 30 days", value: <Money value={activity.moneyOut} size="xl" weight="600" />, sub: countLabel(activity.debits, "debit") },
              ]}
            />
            <Section title="Passbook" meta={rows.length === 1 ? "1 entry" : `${rows.length} entries`}>
              <View style={styles.range}>
                <Segments label="Period" options={RANGES} value={range} onChange={setRange} />
              </View>
            </Section>
          </>
        }
        ListEmptyComponent={<Empty>No entries in this period. Try a longer one.</Empty>}
      />
    </>
  );
}

/* ───────────── Deposits ───────────── */

function Deposit({ account }: { account: CashAccount }) {
  const status = depositStatus(account, AS_OF);
  const goal = account.goalId ? getGoal(account.goalId) : undefined;
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <Balance account={account} value={account.balance} label="Value today" />
      {status && (
        <>
          <View style={styles.term}>
            <Progress value={status.elapsed} label="Term" />
            <AppText size="sm" color="ink3">
              Opened {formatDate(account.openedOn)} · {formatPct(status.elapsed * 100, { decimals: 0 })} of the term
            </AppText>
          </View>
          <Section title="At maturity">
            <Facts
              items={[
                { label: "Matures", value: `${formatDate(status.maturesOn)}, ${relativeDays(status.maturesOn, AS_OF)}` },
                { label: "Amount", value: formatMoney(status.maturityAmount) },
                { label: "Interest at maturity", value: formatMoney(status.interestAtMaturity) },
              ]}
            />
          </Section>
          <Section title="So far">
            <Facts
              items={[
                { label: "Principal", value: formatMoney(status.principal) },
                { label: "Interest earned", value: formatMoney(status.interestSoFar) },
                ...(account.kind === "rd" ? [{ label: "Installments", value: `${account.installmentsPaid} of ${account.installmentsTotal} · ${formatMoney(account.installment ?? 0)} a month` }] : []),
                { label: "Earmarked for", value: goal ? goal.name : "Nothing yet" },
              ]}
            />
          </Section>
        </>
      )}
    </ScrollView>
  );
}

function Balance({ account, value, label }: { account: CashAccount; value: number; label: string }) {
  return (
    <View style={styles.balance}>
      <AppText size="sm" color="ink3">
        {account.institution}
        {account.mask ? ` ••${account.mask}` : ""}
        {account.interestRate ? ` · ${account.interestRate}% a year` : ""}
      </AppText>
      <View accessible>
        <AppText size="base" color="ink3" weight="500">
          {label}
        </AppText>
        <Money value={value} size="3xl" weight="700" />
      </View>
      <AppText size="base" color="ink2">
        {account.role}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  balance: { gap: space[2], paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[5] },
  range: { paddingHorizontal: space[4], paddingTop: space[2] },
  term: { gap: space[2], paddingHorizontal: space[4], paddingBottom: space[5] },
});
