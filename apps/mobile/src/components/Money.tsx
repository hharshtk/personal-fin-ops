import { formatMoney, formatPct } from "@myfinancespace/core/format";
import { space, type } from "@myfinancespace/tokens";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import { usePalette } from "@/theme";
import { AppText, type AppTextProps } from "./AppText";

interface MoneyProps extends AppTextProps {
  value: number;
  /** Shortens the amount to lakh or crore. */
  compact?: boolean;
  sign?: "auto" | "always" | "never";
  decimals?: 0 | 2;
  /** `flow`: money in reads green, money out stays ink. `gain`: losses also read red. */
  tone?: "none" | "flow" | "gain";
}

/** A rupee amount. A negative always prints its sign, so it never depends on colour alone. */
export function Money({ value, compact = false, sign, decimals, tone = "none", color, ...props }: MoneyProps) {
  const toned = tone !== "none" && value > 0 ? "green" : tone === "gain" && value < 0 ? "red" : color;
  return (
    <AppText tabular color={toned} {...props} accessibilityLabel={formatMoney(value, { sign, decimals })}>
      {formatMoney(value, { compact, sign, decimals })}
    </AppText>
  );
}

/** A change in value. The sign and arrow carry the direction, so it never depends on colour alone. */
export function Delta({ value, pct, since }: { value: number; pct: number; since: string }) {
  const palette = usePalette();
  const color = value > 0 ? "green" : value < 0 ? "red" : "ink3";
  return (
    <View style={styles.delta}>
      {value !== 0 && (
        <SymbolView
          name={value > 0 ? { ios: "arrow.up.right", android: "north_east" } : { ios: "arrow.down.right", android: "south_east" }}
          size={type.sm.size}
          tintColor={palette[color]}
        />
      )}
      <AppText size="base" color={color} weight="600" tabular>
        {formatMoney(value, { compact: true, sign: "always" })} ({formatPct(pct, { sign: true })})
      </AppText>
      <AppText size="base" color="ink3">
        since {since}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  delta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: space[1] },
});
