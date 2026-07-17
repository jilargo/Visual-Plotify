import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Home from "./pages/Home";

const theme = createTheme({
    palette: {
        primary: {
            main: "#1d4ed8",
        },
        secondary: {
            main: "#0f172a",
        },
        background: {
            default: "#f4f7fb",
            paper: "#ffffff",
        },
        text: {
            primary: "#0f172a",
            secondary: "#4b5563",
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        h3: {
            fontWeight: 800,
        },
        h6: {
            fontWeight: 700,
        },
        button: {
            textTransform: "none",
        },
    },
});

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Home />
        </ThemeProvider>
    );
}

export default App;