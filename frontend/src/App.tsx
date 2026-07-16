import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import Home from "./pages/Home";

const theme = createTheme({
    palette: {
        primary: {
            main: "#0f4c81",
        },
        secondary: {
            main: "#f50057",
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