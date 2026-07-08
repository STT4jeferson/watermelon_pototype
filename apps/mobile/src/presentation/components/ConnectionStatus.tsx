import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

type Status = 'online' | 'offline' | 'syncing' | 'error';

export function ConnectionStatus({ status }: { status: Status }) {
  const { t } = useTranslation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  let config = { bg: '', text: '', icon: null as any, label: '' };

  switch (status) {
    case 'online':
      config = { bg: theme.colors.successBg, text: theme.colors.success, icon: <Wifi size={12} color={theme.colors.success} />, label: t('components.statusOnline') };
      break;
    case 'offline':
      config = { bg: theme.colors.offlineChipBg, text: theme.colors.offlineChipText, icon: <WifiOff size={12} color={theme.colors.offlineChipText} />, label: t('components.statusOffline') };
      break;
    case 'syncing':
      config = { bg: theme.colors.syncingBg, text: theme.colors.syncing, icon: <ActivityIndicator size={12} color={theme.colors.syncing} />, label: t('components.statusSyncing') };
      break;
    case 'error':
      config = { bg: theme.colors.errorBg, text: theme.colors.error, icon: <AlertTriangle size={12} color={theme.colors.error} />, label: t('components.statusError') };
      break;
  }

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      {config.icon}
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    gap: 4,
  },
  text: {
    ...theme.typography.badge,
  },
});
