import { ThemeProvider } from "expo-router";
import { NativeTabs } from "expo-router/native-tabs";
import { StatusBar } from "expo-status-bar";
import { Platform } from "react-native";
import { LedgerProvider } from "@/state/ledger";
import { useNavigationTheme, usePalette } from "@/theme";

export default function RootLayout() {
  const palette = usePalette();
  const theme = useNavigationTheme();

  // iOS draws the bar in its own material and only takes the tint. Android
  // would otherwise colour it from the wallpaper.
  const android = Platform.OS === "android" && {
    backgroundColor: palette.paper,
    indicatorColor: palette.penWash,
    iconColor: { default: palette.ink2, selected: palette.pen },
    labelStyle: { default: { color: palette.ink2 }, selected: { color: palette.pen } },
  };

  return (
    <ThemeProvider value={theme}>
      <LedgerProvider>
        <NativeTabs tintColor={palette.pen} labelVisibilityMode="labeled" {...android}>
          <NativeTabs.Trigger name="(overview)">
            <NativeTabs.Trigger.Label>Overview</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} md="grid_view" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(accounts)">
            <NativeTabs.Trigger.Label>Accounts</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: "building.columns", selected: "building.columns.fill" }} md="account_balance" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(transactions)">
            <NativeTabs.Trigger.Label>Transactions</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="arrow.left.arrow.right" md="swap_horiz" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(bills)">
            <NativeTabs.Trigger.Label>Bills</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="(more)">
            <NativeTabs.Trigger.Label>More</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf="ellipsis" md="more_horiz" />
          </NativeTabs.Trigger>
        </NativeTabs>
        <StatusBar style="auto" />
      </LedgerProvider>
    </ThemeProvider>
  );
}
