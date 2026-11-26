import { formatDate, monthGrid, parts, WEEKDAYS } from "@myfinancespace/core/format";
import type { ISODate, MonthKey } from "@myfinancespace/core/types";
import { radius, space } from "@myfinancespace/tokens";
import { Pressable, StyleSheet, View } from "react-native";
import { type ColorToken, usePalette } from "@/theme";
import { AppText } from "./AppText";
import { IconButton, TOUCH } from "./Pressables";

/** What to print on a day. Nothing depends on colour alone: `mark` is text under the numeral. */
export interface DayMark {
  color?: ColorToken;
  mark?: string;
  /** Tinted days hold something overdue. */
  tinted?: boolean;
  label?: string;
}

interface MonthGridProps {
  month: MonthKey;
  today: ISODate;
  selected?: ISODate | null;
  onSelect: (date: ISODate) => void;
  day?: (date: ISODate) => DayMark;
  isDisabled?: (date: ISODate) => boolean;
}

const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;

/** One month of the wall calendar. Today has a pen ring; the selected day is filled. */
export function MonthGrid({ month, today, selected, onSelect, day, isDisabled }: MonthGridProps) {
  const palette = usePalette();
  const cells = monthGrid(month);
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  return (
    <View style={styles.grid}>
      <View style={styles.week} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {WEEK.map((w) => (
          <AppText key={w} size="xs" color="ink3" style={styles.weekday}>
            {WEEKDAYS[w]}
          </AppText>
        ))}
      </View>
      {weeks.map((week, i) => (
        <View key={i} style={[styles.week, { borderTopColor: palette.rule, borderTopWidth: StyleSheet.hairlineWidth }]}>
          {week.map((date, j) => {
            if (!date) return <View key={j} style={styles.cell} />;
            const on = date === selected;
            const off = isDisabled?.(date) ?? false;
            const mark = day?.(date) ?? {};
            return (
              <Pressable
                key={date}
                disabled={off}
                accessibilityRole="button"
                accessibilityState={{ selected: on, disabled: off }}
                accessibilityLabel={[formatDate(date, "EEE, d MMM"), date === today && "today", mark.label].filter(Boolean).join(", ")}
                onPress={() => onSelect(date)}
                style={[styles.cell, mark.tinted && { backgroundColor: palette.redWash }, on && { backgroundColor: palette.penWash2 }]}
              >
                <View style={[styles.day, date === today && { borderColor: palette.pen }]}>
                  <AppText weight="700" tabular color={off ? "ink3" : (mark.color ?? "ink")} style={off && styles.off}>
                    {parts(date).d}
                  </AppText>
                </View>
                <AppText size="2xs" tabular numberOfLines={1} color={mark.color === "red" ? "red" : "ink3"}>
                  {mark.mark ?? " "}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

/** The month's name between buttons for the months either side. */
export function MonthStepper({ label, onPrevious, onNext }: { label: string; onPrevious?: () => void; onNext?: () => void }) {
  return (
    <View style={styles.stepper}>
      <IconButton icon={{ ios: "chevron.left", android: "chevron_left" }} accessibilityLabel="Previous month" disabled={!onPrevious} onPress={onPrevious} />
      <AppText accessibilityRole="header" accessibilityLiveRegion="polite" size="xl" weight="700">
        {label}
      </AppText>
      <IconButton icon={{ ios: "chevron.right", android: "chevron_right" }} accessibilityLabel="Next month" disabled={!onNext} onPress={onNext} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { paddingHorizontal: space[2] },
  week: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", paddingVertical: space[1] },
  cell: { flex: 1, minHeight: TOUCH, alignItems: "center", paddingVertical: space[1], borderRadius: radius.md },
  day: { minWidth: space[8], alignItems: "center", borderWidth: 1, borderColor: "transparent", borderRadius: space[4] },
  off: { opacity: 0.4 },
  stepper: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space[2] },
});
