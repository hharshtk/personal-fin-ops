import { space } from "@myfinancespace/tokens";
import { ScrollView, StyleSheet } from "react-native";
import { AppText } from "./AppText";

/** Stands in for a section that only the web app has so far. */
export function NotHereYet({ title, detail }: { title: string; detail: string }) {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <AppText weight="600">{title}</AppText>
      <AppText color="ink2">{detail}</AppText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { gap: space[2], padding: space[4] } });
