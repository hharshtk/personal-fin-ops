import { AS_OF } from "@myfinancespace/core/data";
import { transactionDraft } from "@myfinancespace/core/transactions";
import { useLocalSearchParams } from "expo-router";
import { TransactionForm } from "@/components/TransactionForm";
import { useLedger } from "@/state/ledger";

export default function NewTransaction() {
  const { account } = useLocalSearchParams<{ account?: string }>();
  const { add } = useLedger();
  return <TransactionForm initial={transactionDraft(AS_OF, { accountId: account })} submitLabel="Add transaction" onSubmit={add} />;
}
