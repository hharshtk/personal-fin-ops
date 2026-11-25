import { dataNote, netWorthNow } from "@myfinancespace/core/data";
import { formatMoney } from "@myfinancespace/core/format";
import { Stack } from "expo-router";
import { ScrollView, Text } from "react-native";

// Placeholder screen. It shows that the shared core runs on the phone and gives
// the same figure as the web Overview. It is deliberately unstyled: real screens
// wait for the platform-neutral design tokens (CONSTITUTION.md, Article 10) and
// read through the API (Article 4) instead of the fixtures.
export default function Overview() {
  const { netWorth } = netWorthNow();

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic">
      <Stack.Screen options={{ title: "MyFinanceSpace" }} />
      <Text>Net worth</Text>
      <Text selectable>{formatMoney(netWorth)}</Text>
      <Text>{dataNote}</Text>
    </ScrollView>
  );
}
