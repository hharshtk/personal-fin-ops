import { formatPct } from "@myfinancespace/core/format";
import { radius, space } from "@myfinancespace/tokens";
import { StyleSheet, View } from "react-native";
import { usePalette } from "@/theme";

/** How much of something is done, from 0 to 1. */
export function Progress({ value, label }: { value: number; label: string }) {
  const palette = usePalette();
  const pct = formatPct(value * 100, { decimals: 0 });
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ text: pct }} style={[styles.track, { backgroundColor: palette.cTrack }]}>
      <View style={[styles.fill, { backgroundColor: palette.ink2, width: `${value * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: space[2], borderRadius: radius.md, overflow: "hidden" },
  fill: { height: space[2] },
});
