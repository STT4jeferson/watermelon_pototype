import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { X, AlertTriangle, Check, Clock, Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

export type PhotoStatus = 'local' | 'uploading' | 'uploaded' | 'failed' | 'pending';

type PhotoThumbProps = {
  uri?: string;
  status?: PhotoStatus;
  onRemove?: () => void;
  onPress?: () => void;
  isAdd?: boolean;
  style?: any;
  variant?: 'default' | 'large';
};

export function PhotoThumb({ uri, status = 'local', onRemove, onPress, isAdd, style, variant = 'default' }: PhotoThumbProps) {
  const { t } = useTranslation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  const isLarge = variant === 'large';

  if (isAdd) {
    return (
      <TouchableOpacity style={[styles.addThumb, style]} onPress={onPress}>
        <Plus size={24} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  const renderBadge = () => {
    if (status === 'local') return null;

    if (isLarge) {
      // Pill badge (bottom left)
      let bgColor = theme.colors.success;
      let textColor = '#FFF';
      let icon = <Check size={12} color="#FFF" />;
      let label = t('components.badgeSent');

      if (isDarkMode) {
        bgColor = 'rgba(22,48,31,.92)';
        textColor = theme.colors.success;
        icon = <Check size={12} color={textColor} />;
      }

      if (status === 'uploading' || status === 'pending') {
        bgColor = isDarkMode ? 'rgba(110,70,15,.88)' : theme.colors.pending;
        textColor = isDarkMode ? theme.colors.pending : '#FFF';
        icon = <Clock size={12} color={textColor} />;
        label = t('components.badgeWaiting');
      } else if (status === 'failed') {
        bgColor = isDarkMode ? 'rgba(58,27,24,.94)' : theme.colors.error;
        textColor = isDarkMode ? theme.colors.error : '#FFF';
        icon = <AlertTriangle size={12} color={textColor} />;
        label = t('components.badgeFailed');
      }

      return (
        <View style={[styles.pillBadge, { backgroundColor: bgColor }]}>
          {icon}
          <Text style={[styles.pillBadgeText, { color: textColor }]}>{label}</Text>
        </View>
      );
    } else {
      // Default circular badge (bottom right)
      let bgColor = theme.colors.success;
      let icon = <Check size={12} color="#FFF" />;

      if (status === 'uploading' || status === 'pending') {
        bgColor = theme.colors.surface;
        icon = <ActivityIndicator size={12} color={theme.colors.primary} />;
      } else if (status === 'failed') {
        bgColor = theme.colors.error;
        icon = <AlertTriangle size={12} color="#FFF" />;
      }

      return (
        <View style={styles.statusBadgeWrapper}>
          <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
             {icon}
          </View>
        </View>
      );
    }
  };

  return (
    <TouchableOpacity style={[styles.container, isLarge && { width: '100%', height: '100%' }, style]} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <Image source={{ uri }} style={styles.image} />
      
      {status === 'failed' && !isLarge && (
        <View style={[styles.failedOverlay, { backgroundColor: isDarkMode ? 'rgba(58,27,24,.94)' : 'rgba(251, 236, 234, 0.7)' }]}>
          <AlertTriangle size={24} color={theme.colors.error} />
        </View>
      )}

      {onRemove && status === 'local' && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <X size={14} color={theme.colors.photoRemoveBadgeIcon} />
        </TouchableOpacity>
      )}

      {renderBadge()}
    </TouchableOpacity>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.skeleton,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  addThumb: {
    width: 76,
    height: 76,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.photoRemoveBadgeBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgeWrapper: {
    position: 'absolute',
    bottom: 4,
    right: 4,
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  pillBadgeText: {
    ...theme.typography.badge,
    color: '#FFF',
  },
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    
    justifyContent: 'center',
    alignItems: 'center',
  },
});
