import type { AppProps } from "next/app";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { useMemo } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: { main: "#1976d2" },
          background: { default: "#f5f7fa", paper: "#ffffff" },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", sans-serif',
        },
        shape: { borderRadius: 10 },
      }),
    []
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
