import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react-native';
import { theme } from '../theme';

type Status = 'online' | 'offline' | 'syncing' | 'error';

export function ConnectionStatus({ status }: { status: Status }) {
  let config = { bg: '', text: '', icon: null as any, label: '' };

  switch (status) {
    case 'online':
      config = { bg: theme.colors.successBg, text: theme.colors.success, icon: <Wifi size={12} color={theme.colors.success} />, label: 'Online' };
      break;
    case 'offline':
      config = { bg: theme.colors.offlineChipBg, text: theme.colors.offlineChip, icon: <WifiOff size={12} color={theme.colors.offlineChip} />, label: 'Offline' };
      break;
    case 'syncing':
      config = { bg: theme.colors.syncingBg, text: theme.colors.syncing, icon: <ActivityIndicator size={12} color={theme.colors.syncing} />, label: 'Sincronizando' };
      break;
    case 'error':
      config = { bg: theme.colors.errorBg, text: theme.colors.error, icon: <AlertTriangle size={12} color={theme.colors.error} />, label: 'Erro de sync' };
      break;
  }

  return (
    <View style={[styles.container, { backgroundColor: config.bg }]}>
      {config.icon}
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
