import { AS_OF, CATEGORIES, DATA_START_DATE, ledgerAccountIds, ledgerAccountName } from "@myfinancespace/core/data";
import { countLabel, formatDate, formatMonth, monthOf } from "@myfinancespace/core/format";
import { filterTransactions, periodRange, resolvePeriod, transactionTotals, viewAmount, type TxnFilter, type TxnPeriod, type TxnTypeGroup } from "@myfinancespace/core/transactions";
import { space } from "@myfinancespace/tokens";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ChoiceChip } from "@/components/Choice";
import { Money } from "@/components/Money";
import { AddButton, Button } from "@/components/Pressables";
import { TransactionRow } from "@/components/TransactionRow";
import { useLedger } from "@/state/ledger";
import { usePalette } from "@/theme";

const PERIODS: { id: TxnPeriod; label: string }[] = [
  { id: "month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "90d", label: "Last 90 days" },
  { id: "fy", label: "FY to date" },
  { id: "all", label: `All (since ${formatMonth(monthOf(DATA_START_DATE), "MMM")})` },
];

const TYPES: { id: TxnTypeGroup; label: string }[] = [
  { id: "all", label: "All types" },
  { id: "in", label: "Money in" },
  { id: "spending", label: "Spending" },
  { id: "commitments", label: "EMIs & investments" },
  { id: "transfers", label: "Transfers & card bills" },
];

const ACCOUNTS = [{ id: "", label: "All accounts & cards" }, ...ledgerAccountIds.map((id) => ({ id, label: ledgerAccountName(id) }))];
const CATEGORY_OPTIONS = [{ id: "", label: "All categories" }, ...CATEGORIES.map((c) => ({ id: c.id, label: c.name }))];

/** The web app's filters and parameter names, so one link works on both (Article 8). */
type Params = { period?: string; type?: string; account?: string; category?: string; from?: string; to?: string };

export default function Transactions() {
  const palette = usePalette();
  const { txns } = useLedger();
  const params = useLocalSearchParams<Params>();
  const [query, setQuery] = useState("");

  const filter: TxnFilter = { period: params.period, accountId: params.account, categoryId: params.category, type: params.type, query };
  const period = resolvePeriod(filter, "month");
  const [from, to] = periodRange(period, { asOf: AS_OF, ledgerStart: DATA_START_DATE }, { from: params.from, to: params.to });
  const rows = filterTransactions(txns, filter, [from, to]);
  const totals = transactionTotals(rows, params.account);
  const set = (patch: Params) => router.setParams(patch);

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <AddButton onPress={() => router.push({ pathname: "/transactions/new", params: params.account ? { account: params.account } : {} })} />,
          headerSearchBarOptions: {
            placeholder: "Merchant, note or category",
            autoCapitalize: "none",
            hideWhenScrolling: false,
            placement: "stacked",
            tintColor: palette.pen,
            textColor: palette.ink,
            hintTextColor: palette.ink3,
            headerIconColor: palette.ink2,
            onChangeText: (e) => setQuery(e.nativeEvent.text),
            onCancelButtonPress: () => setQuery(""),
            onClose: () => setQuery(""),
          },
        }}
      />
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        data={rows}
        keyExtractor={(t) => t.id}
        renderItem={({ item, index }) => <TransactionRow txn={item} amount={viewAmount(item, params.account)} first={index === 0} />}
        ListHeaderComponent={
          <View style={[styles.header, { borderBottomColor: palette.rule2 }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <ChoiceChip title="Period" options={PERIODS} value={period} resting="month" onChange={(id) => set({ period: id, from: undefined, to: undefined })} />
              <ChoiceChip title="Type" options={TYPES} value={params.type ?? "all"} resting="all" onChange={(id) => set({ type: id === "all" ? undefined : id })} />
              <ChoiceChip title="Account" options={ACCOUNTS} value={params.account ?? ""} resting="" onChange={(id) => set({ account: id || undefined })} />
              <ChoiceChip title="Category" options={CATEGORY_OPTIONS} value={params.category ?? ""} resting="" onChange={(id) => set({ category: id || undefined })} />
            </ScrollView>
            <View style={styles.summary}>
              <AppText size="sm" color="ink3">
                {countLabel(rows.length, "transaction")} · {formatDate(from, "d MMM")} – {formatDate(to, "d MMM yyyy")}
              </AppText>
              <View style={styles.totals}>
                <Total label="In" value={totals.moneyIn} signed tone="flow" />
                <Total label="Out" value={totals.moneyOut} />
                <Total label="Net" value={totals.net} signed tone="gain" />
              </View>
              {totals.leavesOutInternal && (
                <AppText size="xs" color="ink3">
                  Transfers between your own accounts and card bill payments are listed but not counted as money in or out.
                </AppText>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <AppText weight="600">No transactions match</AppText>
            <AppText color="ink2">Widen the period, remove a filter or change the search.</AppText>
            <Button label="Show all transactions" onPress={() => set({ period: "all", type: undefined, account: undefined, category: undefined, from: undefined, to: undefined })} />
          </View>
        }
      />
    </>
  );
}

function Total({ label, value, signed = false, tone }: { label: string; value: number; signed?: boolean; tone?: "flow" | "gain" }) {
  return (
    <View accessible style={styles.total}>
      <AppText size="base" color="ink3">
        {label}
      </AppText>
      <Money size="base" weight="600" value={value} sign={signed ? "always" : "auto"} tone={tone} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[2], paddingBottom: space[3], borderBottomWidth: StyleSheet.hairlineWidth },
  chips: { gap: space[2], paddingHorizontal: space[4] },
  summary: { gap: space[1], paddingHorizontal: space[4] },
  totals: { flexDirection: "row", flexWrap: "wrap", columnGap: space[4] },
  total: { flexDirection: "row", gap: space[1] },
  empty: { gap: space[3], padding: space[4] },
});
