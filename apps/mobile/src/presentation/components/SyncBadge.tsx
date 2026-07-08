import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Check, Clock, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

export function SyncBadge({ status }: { status: SyncStatus }) {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  let config = { bg: '', icon: null as any };

  switch (status) {
    case 'synced':
      config = { bg: theme.colors.successBg, icon: <Check size={12} color={theme.colors.success} /> };
      break;
    case 'pending':
      config = { bg: theme.colors.pendingBg, icon: <Clock size={12} color={theme.colors.pending} /> };
      break;
    case 'syncing':
      config = { bg: theme.colors.syncingBg, icon: <ActivityIndicator size={12} color={theme.colors.syncing} /> };
      break;
    case 'error':
      config = { bg: theme.colors.errorBg, icon: <AlertTriangle size={12} color={theme.colors.error} /> };
      break;
  }

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      {config.icon}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
