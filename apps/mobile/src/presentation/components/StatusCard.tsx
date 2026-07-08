import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check, WifiOff, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

type StatusCardProps = {
  status: 'success' | 'offline' | 'syncing' | 'error';
  title?: string;
  subtitle?: string;
  onPress?: () => void;
  progress?: number; // 0 to 1
};

export function StatusCard({ status, title, subtitle, onPress, progress }: StatusCardProps) {
  const { t } = useTranslation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  let config = { bg: '', icon: null as any, defaultTitle: '', defaultSubtitle: '' };

  switch (status) {
    case 'success':
      config = { bg: theme.colors.successBg, icon: <Check size={20} color={theme.colors.success} />, defaultTitle: t('components.syncAllSynced'), defaultSubtitle: t('components.syncAllSyncedSub') };
      break;
    case 'offline':
      config = { bg: theme.colors.offlineBg, icon: <WifiOff size={20} color={theme.colors.offlineText} />, defaultTitle: t('components.syncOffline'), defaultSubtitle: t('components.syncOfflineSub') };
      break;
    case 'syncing':
      config = { bg: theme.colors.syncingBg, icon: <RefreshCw size={20} color={theme.colors.syncing} />, defaultTitle: t('components.syncingRecords'), defaultSubtitle: t('components.syncingSub') };
      break;
    case 'error':
      config = { bg: theme.colors.errorBg, icon: <AlertTriangle size={20} color={theme.colors.error} />, defaultTitle: t('components.syncError'), defaultSubtitle: t('components.syncErrorSub') };
      break;
  }

  const Content = (
    <View style={[styles.container, { backgroundColor: config.bg, borderColor: status === 'error' ? theme.colors.errorBorder : status === 'offline' ? theme.colors.offlineBorder : 'transparent', borderWidth: status === 'error' || status === 'offline' ? 1 : 0 }]}>
      <View style={styles.iconContainer}>{config.icon}</View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: status === 'offline' ? theme.colors.offlineText : status === 'error' ? theme.colors.error : theme.colors.text }]}>{title || config.defaultTitle}</Text>
        <Text style={[styles.subtitle, { color: status === 'offline' ? theme.colors.offlineCardSupportText : status === 'error' ? theme.colors.errorBannerText : theme.colors.textSecondary }]}>{subtitle || config.defaultSubtitle}</Text>
        {status === 'syncing' && progress !== undefined && (
          <View style={styles.progressTrack}>
             <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>
    </View>
  );

  if (onPress || status === 'error') {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.8}>{Content}</TouchableOpacity>;
  }

  return Content;
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing.s4,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    ...theme.typography.label,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    ...theme.typography.meta,
    lineHeight: 16,
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(29, 95, 191, 0.16)',
    borderRadius: theme.radius.pill,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.syncing,
    borderRadius: theme.radius.pill,
  },
});
