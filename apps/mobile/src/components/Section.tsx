import { space } from "@myfinancespace/tokens";
import { router, type Href } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { usePalette } from "@/theme";
import { AppText } from "./AppText";

/** A titled region. Rules and type divide the page; nothing sits in a box. */
export function Section({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  const palette = usePalette();
  return (
    <View style={[styles.section, { borderTopColor: palette.rule2 }]}>
      <View style={styles.heading}>
        <AppText accessibilityRole="header" size="xl" weight="700">
          {title}
        </AppText>
        {meta && (
          <AppText size="sm" color="ink3">
            {meta}
          </AppText>
        )}
      </View>
      {children}
    </View>
  );
}

/** One line of a section, ruled off from the line above it. */
export function Row({ first, children }: { first: boolean; children: ReactNode }) {
  const palette = usePalette();
  return <View style={[styles.row, !first && { borderTopColor: palette.rule, borderTopWidth: StyleSheet.hairlineWidth }]}>{children}</View>;
}

/** The part of a row that opens a record. Without a destination it is plain content. */
export function RowLink({ href, chevron = false, children }: { href: Href | null; chevron?: boolean; children: ReactNode }) {
  const palette = usePalette();
  if (!href) {
    return (
      <View accessible style={styles.link}>
        {children}
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="button" onPress={() => router.push(href)} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      {children}
      {chevron && (
        <View style={styles.chevron}>
          <SymbolView name={{ ios: "chevron.right", android: "chevron_right" }} size={space[4]} tintColor={palette.ink3} />
        </View>
      )}
    </Pressable>
  );
}

/** Label and value pairs. A value with a destination opens it. */
export function Facts({ items }: { items: { label: string; value: ReactNode; href?: Href | null }[] }) {
  const palette = usePalette();
  return (
    <View style={styles.facts}>
      {items.map((f, i) => {
        const line = (
          <>
            <AppText color="ink3">{f.label}</AppText>
            <View style={styles.value}>{typeof f.value === "string" ? <AppText color={f.href ? "pen" : "ink"} style={styles.right}>{f.value}</AppText> : f.value}</View>
          </>
        );
        const style = [styles.fact, i > 0 && { borderTopColor: palette.rule, borderTopWidth: StyleSheet.hairlineWidth }];
        const { href } = f;
        return href ? (
          <Pressable key={f.label} accessibilityRole="button" onPress={() => router.push(href)} style={style}>
            {line}
          </Pressable>
        ) : (
          <View key={f.label} accessible style={style}>
            {line}
          </View>
        );
      })}
    </View>
  );
}

export function Empty({ children }: { children: string }) {
  return (
    <AppText color="ink3" style={styles.empty}>
      {children}
    </AppText>
  );
}

const styles = StyleSheet.create({
  section: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space[5], paddingBottom: space[4] },
  heading: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", columnGap: space[2], paddingHorizontal: space[4], paddingBottom: space[1] },
  row: { flexDirection: "row", gap: space[3], marginHorizontal: space[4] },
  link: { flex: 1, flexDirection: "row", gap: space[3], paddingVertical: space[3] },
  chevron: { alignSelf: "center" },
  pressed: { opacity: 0.5 },
  facts: { paddingHorizontal: space[4] },
  fact: { minHeight: space[8] + space[4], flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: space[4], paddingVertical: space[2] },
  value: { flexShrink: 1 },
  right: { textAlign: "right" },
  empty: { paddingHorizontal: space[4], paddingVertical: space[3] },
});
