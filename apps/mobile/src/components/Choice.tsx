import { space } from "@myfinancespace/tokens";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { usePalette } from "@/theme";
import { AppText } from "./AppText";
import { Field, FieldButton } from "./Field";
import { Chip, TOUCH } from "./Pressables";
import { Sheet } from "./Sheet";

export interface Option {
  id: string;
  label: string;
}

interface ChoiceProps {
  title: string;
  options: readonly Option[];
  value: string;
  onChange: (id: string) => void;
}

function Options({ title, options, value, onChange, open, onClose }: ChoiceProps & { open: boolean; onClose: () => void }) {
  const palette = usePalette();
  return (
    <Sheet title={title} open={open} onClose={onClose}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => {
              onChange(o.id);
              onClose();
            }}
            style={({ pressed }) => [styles.option, { borderBottomColor: palette.rule }, pressed && { backgroundColor: palette.paper2 }]}
          >
            <AppText color={on ? "pen" : "ink"} weight={on ? "600" : "400"} style={styles.label}>
              {o.label}
            </AppText>
            {on && <SymbolView name={{ ios: "checkmark", android: "check" }} size={space[5]} tintColor={palette.pen} />}
          </Pressable>
        );
      })}
    </Sheet>
  );
}

/** A choice in a row of filters. `resting` is the value that filters nothing. */
export function ChoiceChip({ resting, ...choice }: ChoiceProps & { resting?: string }) {
  const [open, setOpen] = useState(false);
  const label = choice.options.find((o) => o.id === choice.value)?.label ?? choice.title;
  return (
    <>
      <Chip label={label} active={choice.value !== resting} accessibilityLabel={`${choice.title}: ${label}`} onPress={() => setOpen(true)} />
      <Options {...choice} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** A choice in a form. */
export function ChoiceField({ error, ...choice }: ChoiceProps & { error?: string }) {
  const [open, setOpen] = useState(false);
  const label = choice.options.find((o) => o.id === choice.value)?.label ?? "Choose";
  return (
    <Field label={choice.title} error={error}>
      <FieldButton label={label} accessibilityLabel={`${choice.title}: ${label}`} error={Boolean(error)} onPress={() => setOpen(true)} />
      <Options {...choice} open={open} onClose={() => setOpen(false)} />
    </Field>
  );
}

const styles = StyleSheet.create({
  option: { minHeight: TOUCH, flexDirection: "row", alignItems: "center", gap: space[3], paddingHorizontal: space[4], paddingVertical: space[2], borderBottomWidth: StyleSheet.hairlineWidth },
  label: { flex: 1 },
});
