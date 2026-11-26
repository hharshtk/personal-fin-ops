import { type } from "@myfinancespace/tokens";
import { Text, type TextProps } from "react-native";
import { type ColorToken, usePalette } from "@/theme";

export interface AppTextProps extends TextProps {
  size?: keyof typeof type;
  color?: ColorToken;
  weight?: "400" | "500" | "600" | "700";
  /** Digits of equal width, so figures line up in columns. */
  tabular?: boolean;
}

export function AppText({ size = "lg", color = "ink", weight = "400", tabular = false, style, ...props }: AppTextProps) {
  const palette = usePalette();
  const { size: fontSize, lineHeight } = type[size];
  return (
    <Text
      {...props}
      style={[{ color: palette[color], fontSize, lineHeight, fontWeight: weight, fontVariant: tabular ? ["tabular-nums"] : undefined }, style]}
    />
  );
}
