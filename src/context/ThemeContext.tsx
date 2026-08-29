import React, { createContext, useContext, useState, useEffect } from 'react';

export type AppTheme = 'light' | 'dark';
export type TextSize = 'sm' | 'md' | 'lg';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  highContrast: boolean;
  setHighContrast: (contrast: boolean) => void;
  toggleHighContrast: () => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<AppTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem('koparniti_theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'dark'; // Default to sleek Blackout / Dark mode
  });

  const [highContrast, setHighContrast] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('koparniti_high_contrast') === 'true';
  });

  const [textSize, setTextSize] = useState<TextSize>(() => {
    if (typeof window === 'undefined') return 'md';
    const stored = localStorage.getItem('koparniti_text_size');
    if (stored === 'sm' || stored === 'md' || stored === 'lg') return stored;
    return 'md';
  });

  // Apply dark / light mode class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('koparniti_theme', theme);
  }, [theme]);

  // Apply high-contrast mode class
  useEffect(() => {
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    localStorage.setItem('koparniti_high_contrast', highContrast.toString());
  }, [highContrast]);

  // Apply text-size attribute
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-text-size', textSize);
    localStorage.setItem('koparniti_text_size', textSize);
  }, [textSize]);

  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  const toggleHighContrast = () => setHighContrast((c) => !c);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        highContrast,
        setHighContrast,
        toggleHighContrast,
        textSize,
        setTextSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
