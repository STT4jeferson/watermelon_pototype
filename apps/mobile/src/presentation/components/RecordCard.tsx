import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Camera } from 'lucide-react-native';
import { SyncBadge, SyncStatus } from './SyncBadge';
import { theme } from '../theme';

export type RecordCardProps = {
  type: 'Compra' | 'Venda';
  date: string;
  description: string;
  photosCount: number;
  syncStatus: SyncStatus;
  onPress: () => void;
  onRetry?: () => void;
};

export function RecordCard({ type, date, description, photosCount, syncStatus, onPress, onRetry }: RecordCardProps) {
  const isVenda = type === 'Venda';
  const tagBg = isVenda ? theme.colors.vendaTagBg : theme.colors.primarySoft;
  const tagColor = isVenda ? theme.colors.vendaTag : theme.colors.primary;

  return (
    <TouchableOpacity 
      style={[styles.container, syncStatus === 'error' && styles.containerError]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.tag, { backgroundColor: tagBg }]}>
              <Text style={[styles.tagText, { color: tagColor }]}>{type}</Text>
            </View>
            <Text style={styles.date}>{date}</Text>
          </View>
        </View>
        
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
        
        <View style={styles.footer}>
          <View style={styles.photosInfo}>
            <Camera size={14} color={theme.colors.textSecondary} />
            <Text style={styles.photosText}>{photosCount} fotos</Text>
          </View>
          <View style={styles.syncInfo}>
            {syncStatus === 'error' && onRetry && (
              <TouchableOpacity onPress={onRetry} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={styles.retryText}>Tentar novamente</Text>
              </TouchableOpacity>
            )}
            <SyncBadge status={syncStatus} />
          </View>
        </View>
      </View>
      <View style={styles.chevron}>
        <ChevronRight size={20} color={theme.colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  containerError: {
    borderColor: theme.colors.errorBorder,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  date: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photosInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photosText: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  syncInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: {
    ...theme.typography.meta,
    color: theme.colors.error,
    textDecorationLine: 'underline',
  },
  chevron: {
    marginLeft: 12,
  },
});
