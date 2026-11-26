import { AS_OF } from "@myfinancespace/core/data";
import { canEditTransaction, transactionDraft } from "@myfinancespace/core/transactions";
import { useLocalSearchParams } from "expo-router";
import { NotHereYet } from "@/components/NotHereYet";
import { TransactionForm } from "@/components/TransactionForm";
import { useLedger } from "@/state/ledger";

export default function EditTransaction() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { txns, update } = useLedger();
  const txn = txns.find((t) => t.id === id);
  if (!txn || !canEditTransaction(txn)) return <NotHereYet title="This transaction can't be edited" detail="Only transactions you added yourself can be changed." />;
  return <TransactionForm initial={transactionDraft(AS_OF, txn)} submitLabel="Save changes" onSubmit={(t) => update(id, t)} />;
}
