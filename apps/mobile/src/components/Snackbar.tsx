import { radius, space } from "@myfinancespace/tokens";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLedger } from "@/state/ledger";
import { usePalette } from "@/theme";
import { AppText } from "./AppText";
import { TextButton } from "./Pressables";

/**
 * The latest change and its Undo, above the tab bar. It has a safe-area
 * provider of its own because only a view inside the tab knows the bar's height.
 */
export function Snackbar() {
  const { notice } = useLedger();
  if (!notice) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <SafeAreaProvider pointerEvents="box-none">
        <SnackbarBody key={notice.id} />
      </SafeAreaProvider>
    </View>
  );
}

function SnackbarBody() {
  const { notice, dismissNotice } = useLedger();
  const palette = usePalette();
  const insets = useSafeAreaInsets();
  if (!notice) return null;
  const { undo } = notice;
  return (
    <View style={[styles.bar, { bottom: insets.bottom + space[3], backgroundColor: palette.paper, borderColor: palette.rule2 }]}>
      <AppText size="base" style={styles.message}>
        {notice.message}
      </AppText>
      {undo && (
        <TextButton
          label="Undo"
          weight="600"
          onPress={() => {
            undo();
            dismissNotice();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", left: space[4], right: space[4], flexDirection: "row", alignItems: "center", paddingLeft: space[4], paddingRight: space[2], paddingVertical: space[1], borderWidth: 1, borderRadius: radius.lg },
  message: { flex: 1, paddingVertical: space[2] },
});
