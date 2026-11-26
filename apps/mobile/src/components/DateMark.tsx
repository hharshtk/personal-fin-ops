import { MONTHS, parts } from "@myfinancespace/core/format";
import type { ISODate } from "@myfinancespace/core/types";
import { space } from "@myfinancespace/tokens";
import { StyleSheet, View } from "react-native";
import type { ColorToken } from "@/theme";
import { AppText } from "./AppText";

/** A date set like a wall calendar: a heavy day with its month beneath. */
export function DateMark({ date, color = "ink" }: { date: ISODate; color?: ColorToken }) {
  const { d, m } = parts(date);
  return (
    <View style={styles.date}>
      <AppText size="xl" weight="700" tabular color={color}>
        {String(d).padStart(2, "0")}
      </AppText>
      <AppText size="xs" color="ink3">
        {MONTHS[m - 1]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ date: { minWidth: space[8] } });
