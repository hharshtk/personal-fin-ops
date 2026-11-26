import { space } from "@myfinancespace/tokens";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";

/** Headline figures two to a line, or one to a line when the text is large. */
export function Figures({ items }: { items: { label: string; value: ReactNode; sub?: string }[] }) {
  return (
    <View style={styles.grid}>
      {items.map((f) => (
        <View key={f.label} accessible style={styles.figure}>
          <AppText size="sm" color="ink3">
            {f.label}
          </AppText>
          {f.value}
          {f.sub && (
            <AppText size="sm" color="ink3">
              {f.sub}
            </AppText>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: space[4], paddingHorizontal: space[4], paddingBottom: space[5] },
  figure: { flexBasis: "50%", flexGrow: 1, paddingRight: space[3] },
});
