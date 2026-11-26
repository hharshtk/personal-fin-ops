import type { AttentionItem } from "@myfinancespace/core/types";
import { space, type } from "@myfinancespace/tokens";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import { attentionHref } from "@/links";
import { type ColorToken, usePalette } from "@/theme";
import { AppText } from "./AppText";
import { Row, RowLink } from "./Section";

const SEVERITY: Record<AttentionItem["severity"], { icon: SymbolViewProps["name"]; color: ColorToken; label: string }> = {
  critical: { icon: { ios: "exclamationmark.circle.fill", android: "error" }, color: "red", label: "Critical" },
  warning: { icon: { ios: "exclamationmark.triangle.fill", android: "warning" }, color: "amber", label: "Warning" },
  info: { icon: { ios: "info.circle", android: "info" }, color: "ink3", label: "For your information" },
};

export function AttentionRow({ item, first }: { item: AttentionItem; first: boolean }) {
  const palette = usePalette();
  // Severities can grow (Article 5), so an unknown one reads as information.
  const severity = SEVERITY[item.severity] ?? SEVERITY.info;
  return (
    <Row first={first}>
      <RowLink href={attentionHref(item)} chevron>
        <SymbolView name={severity.icon} size={type.xl.size} tintColor={palette[severity.color]} accessibilityLabel={severity.label} />
        <View style={styles.text}>
          <AppText weight="600">{item.title}</AppText>
          <AppText size="base" color="ink2">
            {item.detail}
          </AppText>
        </View>
      </RowLink>
    </Row>
  );
}

const styles = StyleSheet.create({ text: { flex: 1, gap: space[1] } });
