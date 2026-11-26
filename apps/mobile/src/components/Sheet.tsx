import { space } from "@myfinancespace/tokens";
import type { ReactNode } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { usePalette } from "@/theme";
import { AppText } from "./AppText";
import { TextButton } from "./Pressables";

/** A sheet for one choice, over the screen that asked for it. */
export function Sheet({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const palette = usePalette();
  return (
    <Modal visible={open} animationType="slide" presentationStyle="pageSheet" allowSwipeDismissal onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={[styles.sheet, { backgroundColor: palette.paper }]}>
          <View style={[styles.header, { borderBottomColor: palette.rule }]}>
            <AppText accessibilityRole="header" weight="600" style={styles.title}>
              {title}
            </AppText>
            <TextButton label="Close" onPress={onClose} />
          </View>
          <ScrollView>{children}</ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingLeft: space[4], paddingRight: space[2], paddingVertical: space[1], borderBottomWidth: StyleSheet.hairlineWidth },
  title: { flex: 1 },
});
