import { Stack } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Snackbar } from "@/components/Snackbar";

// Every tab has its own stack. Detail screens live in all of them, so opening a
// record keeps you in the tab you were in, and Back returns where you came from.
const ROOTS: Record<string, { name: string; title: string }> = {
  "(overview)": { name: "index", title: "Overview" },
  "(accounts)": { name: "accounts/index", title: "Accounts" },
  "(transactions)": { name: "transactions/index", title: "Transactions" },
  "(bills)": { name: "calendar/index", title: "Bills & calendar" },
  "(more)": { name: "more", title: "More" },
};

export const unstable_settings = {
  anchor: "index",
  overview: { anchor: "index" },
  accounts: { anchor: "accounts" },
  transactions: { anchor: "transactions" },
  bills: { anchor: "calendar" },
  more: { anchor: "more" },
};

export default function TabLayout({ segment }: { segment: string }) {
  const root = ROOTS[segment];
  return (
    <View style={styles.tab}>
      <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: "minimal" }}>
        <Stack.Screen name={root.name} options={{ title: root.title, headerLargeTitleEnabled: true }} />
        <Stack.Screen name="accounts/[id]" options={{ title: "Account" }} />
        <Stack.Screen name="transactions/[id]/index" options={{ title: "Transaction" }} />
        <Stack.Screen name="transactions/[id]/edit" options={{ title: "Edit transaction", presentation: "modal" }} />
        <Stack.Screen name="transactions/new" options={{ title: "Add transaction", presentation: "modal" }} />
        <Stack.Screen name="calendar/[id]" options={{ title: "Bill" }} />
      </Stack>
      <Snackbar />
    </View>
  );
}

const styles = StyleSheet.create({ tab: { flex: 1 } });
