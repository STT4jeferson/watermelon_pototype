import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { storage } from '../../infra/storage';

const lightColors = {
  "background": "#F4F5F7",
  "surface": "#FFFFFF",
  "surface2": "#F4F5F7",
  "border": "#E7EAEE",
  "inputBorder": "#D5DBE2",
  "text": "#1A222C",
  "textSecondary": "#5F6B79",
  "textMuted": "#97A0AC",
  "primary": "#0E7365",
  "onPrimary": "#FFFFFF",
  "primaryPressed": "#0B5B4F",
  "primarySoft": "#E4F1EE",
  "primarySoftText": "#0B5B4F",
  "link": "#0E7365",
  "outlineBtnText": "#0E7365",
  "outlineBtnBorder": "#B9D6D0",
  "success": "#1B7A3D",
  "successBg": "#E8F4EC",
  "pending": "#92500C",
  "pendingBg": "#FCF1E1",
  "syncing": "#1D5FBF",
  "syncingBg": "#E9F0FC",
  "error": "#B3261E",
  "errorBg": "#FBECEA",
  "errorBorder": "#F3CBC7",
  "errorBtnBg": "#B3261E",
  "errorBannerText": "#7E312B",
  "offlineText": "#7C4A12",
  "offlineBg": "#FDF3E7",
  "offlineBorder": "#F2DFC4",
  "offlineCardSupportText": "#8A5E2A",
  "offlineChipText": "#4A5460",
  "offlineChipBg": "#F0F1F4",
  "vendaTag": "#3A55A8",
  "vendaTagBg": "#EBEFFA",
  "disabledBtnBg": "#F0F1F4",
  "disabledBtnBorder": "#E3E7EC",
  "disabledBtnText": "#97A0AC",
  "chevron": "#B9C0C9",
  "toastBg": "#232B35",
  "skeleton": "#E4E7EB",
  "divider": "#ECEEF1",
  "sheetHandle": "#D5DBE2",
  "backdrop": "rgba(23,32,42,.38)",
  "photoPlaceholderStart": "#C9D2D9",
  "photoPlaceholderEnd": "#AAB6BF",
  "photoRemoveBadgeBg": "#1A222C",
  "photoRemoveBadgeIcon": "#FFFFFF",
  "splashBg": "#0E7365",
  "splashIconBg": "rgba(255,255,255,.14)",
  "splashIconColor": "#FFFFFF",
  "inputBorderError": "#D65E55"
};
const darkColors = {
  "background": "#10151B",
  "surface": "#1A2129",
  "surface2": "#212A34",
  "border": "#2A343F",
  "inputBorder": "#39434F",
  "text": "#E9EDF1",
  "textSecondary": "#A3AEBA",
  "textMuted": "#6E7A87",
  "primary": "#2FA08F",
  "onPrimary": "#0A2620",
  "primaryPressed": "#268878",
  "primarySoft": "#16342E",
  "primarySoftText": "#7CD1C2",
  "link": "#57C3B0",
  "outlineBtnText": "#57C3B0",
  "outlineBtnBorder": "#2E5B53",
  "success": "#4CC479",
  "successBg": "#16301F",
  "pending": "#E0A64F",
  "pendingBg": "#33270F",
  "syncing": "#6FA5EF",
  "syncingBg": "#17273D",
  "error": "#EF7B72",
  "errorBg": "#3A1B18",
  "errorBorder": "#582723",
  "errorBtnBg": "#C6453C",
  "errorBannerText": "#EFB1AB",
  "offlineText": "#E3B573",
  "offlineBg": "#2E2416",
  "offlineBorder": "#4A3A1E",
  "offlineCardSupportText": "#C2A578",
  "offlineChipText": "#B7C1CC",
  "offlineChipBg": "#262E38",
  "vendaTag": "#93A9E8",
  "vendaTagBg": "#1E2A44",
  "disabledBtnBg": "#1A2129",
  "disabledBtnBorder": "#2A343F",
  "disabledBtnText": "#5B6874",
  "chevron": "#4A5560",
  "toastBg": "#212A34",
  "skeleton": "#212A34",
  "divider": "#2A343F",
  "sheetHandle": "#39434F",
  "backdrop": "rgba(0,0,0,.5)",
  "photoPlaceholderStart": "#4A5560",
  "photoPlaceholderEnd": "#333D47",
  "photoRemoveBadgeBg": "#E9EDF1",
  "photoRemoveBadgeIcon": "#10151B",
  "splashBg": "#0E7365",
  "splashIconBg": "#2FA08F",
  "splashIconColor": "#0A2620",
  "inputBorderError": "#E0766D"
};
export const typography = {
  title: { fontSize: 24, fontWeight: '800' as const },
  header: { fontSize: 17, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600' as const },
  meta: { fontSize: 12, fontWeight: '500' as const },
  badge: { fontSize: 11, fontWeight: '700' as const },
  footer: { fontSize: 11, fontWeight: '500' as const },
};

export const spacing = { s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24 };

export const radius = {
  input: 12, card: 14, button: 14, pill: 999, sheet: 22
};

export const shadows = {
  button: {
    shadowColor: '#0E7365',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 4,
  },
  card: {
    shadowColor: '#1A222C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  }
};

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: {
    colors: typeof lightColors;
    typography: typeof typography;
    spacing: typeof spacing;
    radius: typeof radius;
    shadows: typeof shadows;
  };
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    storage.getSession().then(session => {
      if (session && session['theme'] !== undefined) {
        setIsDarkMode(session['theme'] === 'dark');
      } else {
        setIsDarkMode(systemColorScheme === 'dark');
      }
    });
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    const session = await storage.getSession();
    if (session) {
      await storage.saveSession({ ...session, theme: newMode ? 'dark' : 'light' } as any);
    }
  };

  const theme = {
    colors: isDarkMode ? darkColors : lightColors,
    typography,
    spacing,
    radius,
    shadows: isDarkMode ? {
      button: { ...shadows.button, shadowOpacity: 0.1 },
      card: { ...shadows.card, shadowOpacity: 0.2, shadowColor: '#000' }
    } : shadows,
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
