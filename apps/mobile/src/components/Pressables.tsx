import { radius, space, touchTarget } from "@myfinancespace/tokens";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Platform, Pressable, StyleSheet, View, type PressableProps } from "react-native";
import { usePalette } from "@/theme";
import { AppText } from "./AppText";

/** Smallest height and width a finger can hit on this platform (Article 9). */
export const TOUCH = Platform.OS === "ios" ? touchTarget.ios : touchTarget.android;

type Tap = Pick<PressableProps, "onPress" | "disabled" | "accessibilityLabel" | "accessibilityHint">;

export function Button({ label, kind = "plain", ...tap }: Tap & { label: string; kind?: "primary" | "plain" | "danger" }) {
  const palette = usePalette();
  const primary = kind === "primary";
  return (
    <Pressable
      {...tap}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { borderColor: primary ? palette.pen : palette.rule2, backgroundColor: primary ? (pressed ? palette.pen2 : palette.pen) : pressed ? palette.paper3 : palette.paper },
        tap.disabled && styles.disabled,
      ]}
    >
      <AppText weight="600" color={primary ? "paper" : kind === "danger" ? "red" : "pen"}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** A text action, for headers and the ends of rows. */
export function TextButton({ label, weight = "400", ...tap }: Tap & { label: string; weight?: "400" | "600" }) {
  return (
    <Pressable {...tap} accessibilityRole="button" style={({ pressed }) => [styles.text, pressed && styles.pressed, tap.disabled && styles.disabled]}>
      <AppText color="pen" weight={weight}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function IconButton({ icon, ...tap }: Tap & { icon: SymbolViewProps["name"]; accessibilityLabel: string }) {
  const palette = usePalette();
  return (
    <Pressable {...tap} accessibilityRole="button" style={({ pressed }) => [styles.icon, pressed && styles.pressed, tap.disabled && styles.disabled]}>
      <SymbolView name={icon} size={space[5]} tintColor={palette.pen} />
    </Pressable>
  );
}

/** The "add a transaction" button in a screen's header. */
export function AddButton({ onPress }: { onPress: () => void }) {
  return <IconButton icon={{ ios: "plus", android: "add" }} accessibilityLabel="Add transaction" onPress={onPress} />;
}

/** A filter that shows its current choice. */
export function Chip({ label, active, ...tap }: Tap & { label: string; active?: boolean }) {
  const palette = usePalette();
  return (
    <Pressable {...tap} accessibilityRole="button" accessibilityState={{ selected: active }} style={styles.chipTarget}>
      {({ pressed }) => (
        <View style={[styles.chip, { borderColor: active ? palette.pen : palette.rule2, backgroundColor: active ? palette.penWash : pressed ? palette.paper3 : palette.paper }]}>
          <AppText size="base" weight="500" color={active ? "pen" : "ink2"}>
            {label}
          </AppText>
          <SymbolView name={{ ios: "chevron.down", android: "keyboard_arrow_down" }} size={space[3]} tintColor={active ? palette.pen : palette.ink3} />
        </View>
      )}
    </Pressable>
  );
}

/** A few choices side by side, one of them on. */
export function Segments<T extends string>({ label, options, value, onChange }: { label: string; options: readonly { id: T; label: string }[]; value: T; onChange: (id: T) => void }) {
  const palette = usePalette();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.segments, { backgroundColor: palette.paper3 }]}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.id)}
            style={[styles.segment, on && { backgroundColor: palette.paper }]}
          >
            <AppText size="base" weight={on ? "600" : "500"} color={on ? "pen" : "ink2"}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: TOUCH, alignItems: "center", justifyContent: "center", paddingHorizontal: space[4], paddingVertical: space[2], borderWidth: 1, borderRadius: radius.lg },
  text: { minHeight: TOUCH, minWidth: TOUCH, alignItems: "center", justifyContent: "center", paddingHorizontal: space[2] },
  icon: { width: TOUCH, height: TOUCH, alignItems: "center", justifyContent: "center" },
  chipTarget: { minHeight: TOUCH, justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: space[1], paddingHorizontal: space[3], paddingVertical: space[2], borderWidth: 1, borderRadius: radius.lg },
  segments: { flexDirection: "row", padding: space[1], borderRadius: radius.lg },
  segment: { flex: 1, minHeight: TOUCH, alignItems: "center", justifyContent: "center", paddingHorizontal: space[1], borderRadius: radius.md },
  pressed: { opacity: 0.5 },
  disabled: { opacity: 0.4 },
});
