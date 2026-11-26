import { radius, space, type } from "@myfinancespace/tokens";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { usePalette } from "@/theme";
import { AppText } from "./AppText";
import { TOUCH } from "./Pressables";

/** A labelled form control, with what is wrong with it beneath. */
export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText size="sm" weight="500" color="ink2">
        {label}
      </AppText>
      {children}
      {(error ?? hint) && (
        <AppText size="sm" color={error ? "red" : "ink3"} accessibilityLiveRegion="polite">
          {error ?? hint}
        </AppText>
      )}
    </View>
  );
}

export function TextField({ label, hint, error, style, ...input }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const palette = usePalette();
  return (
    <Field label={label} hint={hint} error={error}>
      <TextInput
        {...input}
        accessibilityLabel={error ? `${label}. ${error}` : label}
        placeholderTextColor={palette.ink3}
        selectionColor={palette.pen}
        style={[styles.control, styles.input, { borderColor: error ? palette.red : palette.rule2, color: palette.ink }, style]}
      />
    </Field>
  );
}

/** A form control that opens a sheet. */
export function FieldButton({ label, accessibilityLabel, error, onPress }: { label: string; accessibilityLabel: string; error?: boolean; onPress: () => void }) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.control, styles.button, { borderColor: error ? palette.red : palette.rule2 }, pressed && { backgroundColor: palette.paper2 }]}
    >
      <AppText style={styles.label}>{label}</AppText>
      <SymbolView name={{ ios: "chevron.down", android: "keyboard_arrow_down" }} size={space[4]} tintColor={palette.ink3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[1] },
  control: { minHeight: TOUCH, borderWidth: 1, borderRadius: radius.lg, paddingHorizontal: space[3], paddingVertical: space[2] },
  input: { fontSize: type.lg.size },
  button: { flexDirection: "row", alignItems: "center", gap: space[2] },
  label: { flex: 1 },
});
