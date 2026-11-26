import { monthRange } from "@myfinancespace/core/data";
import { formatDate, formatMonth, monthOf } from "@myfinancespace/core/format";
import type { ISODate } from "@myfinancespace/core/types";
import { space } from "@myfinancespace/tokens";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Field, FieldButton } from "./Field";
import { MonthGrid, MonthStepper } from "./MonthGrid";
import { Sheet } from "./Sheet";

/** A calendar date between two others, inclusive. */
export function DateField({ label, value, min, max, error, onChange }: { label: string; value: ISODate; min: ISODate; max: ISODate; error?: string; onChange: (date: ISODate) => void }) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(value));
  const months = monthRange(monthOf(min), monthOf(max));
  const at = months.indexOf(month);
  const shown = `${formatDate(value, "EEE, d MMM")} ${value.slice(0, 4)}`;
  return (
    <Field label={label} error={error}>
      <FieldButton
        label={shown}
        accessibilityLabel={`${label}: ${shown}`}
        error={Boolean(error)}
        onPress={() => {
          setMonth(monthOf(value));
          setOpen(true);
        }}
      />
      <Sheet title={label} open={open} onClose={() => setOpen(false)}>
        <View style={styles.calendar}>
          <MonthStepper
            label={formatMonth(month, "MMMM yyyy")}
            onPrevious={at > 0 ? () => setMonth(months[at - 1]) : undefined}
            onNext={at < months.length - 1 ? () => setMonth(months[at + 1]) : undefined}
          />
          <MonthGrid
            month={month}
            today={max}
            selected={value}
            isDisabled={(d) => d < min || d > max}
            onSelect={(d) => {
              onChange(d);
              setOpen(false);
            }}
          />
        </View>
      </Sheet>
    </Field>
  );
}

const styles = StyleSheet.create({ calendar: { paddingVertical: space[3] } });
