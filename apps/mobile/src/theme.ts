import { color, type ColorToken, type Palette } from "@myfinancespace/tokens";
import { DarkTheme, DefaultTheme } from "expo-router";
import { useColorScheme } from "react-native";

export type { ColorToken };

/** The design-token colours for the phone's current light or dark appearance. */
export function usePalette(): Palette {
  return useColorScheme() === "dark" ? color.dark : color.light;
}

/** The same tokens in the form the navigator's headers and screens expect. */
export function useNavigationTheme() {
  const dark = useColorScheme() === "dark";
  const palette = usePalette();
  const base = dark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: palette.pen,
      background: palette.paper,
      card: palette.paper,
      text: palette.ink,
      border: palette.rule,
      notification: palette.red,
    },
  };
}
