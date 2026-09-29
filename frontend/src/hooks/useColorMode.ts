import { createContext, useContext } from "react";
import type { AppColorMode } from "../theme";

export const COLOR_MODE_STORAGE_KEY = "visual-plotify:color-mode";

export interface ColorModeContextValue {
    mode: AppColorMode;
    setMode: (mode: AppColorMode) => void;
    toggleMode: () => void;
}

export const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode(): ColorModeContextValue {
    const context = useContext(ColorModeContext);
    if (!context) {
        throw new Error("useColorMode must be used inside a ColorModeProvider.");
    }
    return context;
}
