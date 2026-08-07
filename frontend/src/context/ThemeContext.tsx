import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ThemeContext, type Theme } from "./themeContextValue";

type ThemeProviderProps = {
  children: ReactNode;
};

const THEME_STORAGE_KEY = "devops-ai-theme";

function getInitialTheme(): Theme {
  const savedTheme =
    window.localStorage.getItem(
      THEME_STORAGE_KEY
    );

  if (
    savedTheme === "light" ||
    savedTheme === "dark"
  ) {
    return savedTheme;
  }

  const prefersDarkMode =
    window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

  return prefersDarkMode ? "dark" : "light";
}

export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const [theme, setTheme] =
    useState<Theme>(getInitialTheme);

  useEffect(() => {
    const rootElement =
      document.documentElement;

    rootElement.classList.toggle(
      "dark",
      theme === "dark"
    );

    rootElement.style.colorScheme = theme;

    window.localStorage.setItem(
      THEME_STORAGE_KEY,
      theme
    );
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === "light"
        ? "dark"
        : "light"
    );
  }

  const value = useMemo(
    () => ({
      theme,
      isDarkMode: theme === "dark",
      toggleTheme,
      setTheme,
    }),
    [theme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
