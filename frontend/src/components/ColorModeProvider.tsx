import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { AppColorMode } from "../theme";
import { COLOR_MODE_STORAGE_KEY, ColorModeContext, type ColorModeContextValue } from "../hooks/useColorMode";

function readPreferredMode(): AppColorMode {
    const stored = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
        return stored;
    }
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Persists the chosen colour mode and keeps the native form controls in sync with it. */
export default function ColorModeProvider({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<AppColorMode>(readPreferredMode);

    useEffect(() => {
        window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
        document.documentElement.style.colorScheme = mode;
    }, [mode]);

    const value = useMemo<ColorModeContextValue>(
        () => ({
            mode,
            setMode,
            toggleMode: () => setMode((current) => (current === "light" ? "dark" : "light")),
        }),
        [mode],
    );

    return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}
