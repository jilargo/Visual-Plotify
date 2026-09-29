import { CssBaseline, GlobalStyles, ThemeProvider } from "@mui/material";
import Home from "./pages/Home";
import ColorModeProvider from "./components/ColorModeProvider";
import { useColorMode } from "./hooks/useColorMode";
import { darkTheme, lightTheme } from "./theme";

function ThemedApp() {
    const { mode } = useColorMode();

    return (
        <ThemeProvider theme={mode === "dark" ? darkTheme : lightTheme}>
            <CssBaseline />
            <GlobalStyles
                styles={{
                    "html, body, #root": { height: "100%" },
                    body: { display: "flex", flexDirection: "column" },
                    "h1, h2, h3": { color: "text.primary" },
                }}
            />
            <Home />
        </ThemeProvider>
    );
}

function App() {
    return (
        <ColorModeProvider>
            <ThemedApp />
        </ColorModeProvider>
    );
}

export default App;
