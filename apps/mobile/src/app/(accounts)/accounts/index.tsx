import { depositStatus } from "@myfinancespace/core/accounts";
import { accountBalance, AS_OF, CASH_ACCOUNTS, getGoal, netWorthNow } from "@myfinancespace/core/data";
import { formatDate, relativeDays } from "@myfinancespace/core/format";
import type { CashAccount } from "@myfinancespace/core/types";
import { router, Stack } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Figures } from "@/components/Figures";
import { Money } from "@/components/Money";
import { AddButton } from "@/components/Pressables";
import { Row, RowLink, Section } from "@/components/Section";
import { recordHref } from "@/links";
import { useLedger } from "@/state/ledger";

export default function Accounts() {
  const { txns } = useLedger();
  const position = netWorthNow(txns);
  const liquid = CASH_ACCOUNTS.filter((a) => a.liquid);
  const deposits = CASH_ACCOUNTS.filter((a) => !a.liquid);

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <AddButton onPress={() => router.push("/transactions/new")} /> }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Figures
          items={[
            { label: "Cash and deposits", value: <Money value={position.cash} compact size="xl" weight="600" /> },
            { label: "Available now", value: <Money value={position.liquid} compact size="xl" weight="600" /> },
            { label: "In deposits", value: <Money value={position.deposits} compact size="xl" weight="600" /> },
            { label: "Owed on cards", value: <Money value={position.cards} compact size="xl" weight="600" /> },
          ]}
        />
        <Section title="Savings & cash" meta={`${liquid.length} accounts`}>
          {liquid.map((a, i) => (
            <AccountRow key={a.id} account={a} balance={accountBalance(a.id, txns)} detail={a.role} first={i === 0} />
          ))}
        </Section>
        <Section title="Deposits" meta="locked until maturity">
          {deposits.map((a, i) => (
            <AccountRow key={a.id} account={a} balance={a.balance} detail={depositDetail(a)} first={i === 0} />
          ))}
        </Section>
      </ScrollView>
    </>
  );
}

function depositDetail(a: CashAccount): string {
  const status = depositStatus(a, AS_OF);
  const goal = a.goalId ? getGoal(a.goalId) : undefined;
  const purpose = goal ? `For ${goal.name.toLowerCase()}` : a.role;
  if (!status) return purpose;
  return `${purpose}\nMatures ${formatDate(status.maturesOn)}, ${relativeDays(status.maturesOn, AS_OF)}${status.renewalSoon ? " · decide on renewal" : ""}`;
}

function AccountRow({ account, balance, detail, first }: { account: CashAccount; balance: number; detail: string; first: boolean }) {
  return (
    <Row first={first}>
      <RowLink href={recordHref({ kind: "account", id: account.id })} chevron>
        <View style={styles.name}>
          <AppText weight="600">
            {account.name}
            {account.mask ? <AppText color="ink3"> ••{account.mask}</AppText> : null}
          </AppText>
          <AppText size="sm" color="ink3">
            {detail}
          </AppText>
        </View>
        <Money value={balance} weight="600" />
      </RowLink>
    </Row>
  );
}

const styles = StyleSheet.create({ name: { flex: 1 } });
