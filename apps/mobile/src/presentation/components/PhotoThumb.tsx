import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { X, AlertTriangle, Check, Clock, Plus } from 'lucide-react-native';
import { theme } from '../theme';

export type PhotoStatus = 'local' | 'uploading' | 'uploaded' | 'failed';

type PhotoThumbProps = {
  uri?: string;
  status?: PhotoStatus;
  onRemove?: () => void;
  onPress?: () => void;
  isAdd?: boolean;
};

export function PhotoThumb({ uri, status = 'local', onRemove, onPress, isAdd }: PhotoThumbProps) {
  if (isAdd) {
    return (
      <TouchableOpacity style={styles.addThumb} onPress={onPress}>
        <Plus size={24} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <Image source={{ uri }} style={styles.image} />
      
      {status === 'failed' && (
        <View style={styles.failedOverlay}>
          <AlertTriangle size={24} color={theme.colors.error} />
        </View>
      )}

      {onRemove && status === 'local' && (
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <X size={14} color="#FFF" />
        </TouchableOpacity>
      )}

      {status !== 'local' && (
        <View style={styles.statusBadgeWrapper}>
          <View style={[styles.statusBadge, 
            status === 'uploading' && { backgroundColor: theme.colors.surface },
            status === 'uploaded' && { backgroundColor: theme.colors.success },
            status === 'failed' && { backgroundColor: theme.colors.error }
          ]}>
            {status === 'uploading' && <ActivityIndicator size={12} color={theme.colors.primary} />}
            {status === 'uploaded' && <Check size={12} color="#FFF" />}
            {status === 'failed' && <AlertTriangle size={12} color="#FFF" />}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(0,0,0,0.6)',
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
  failedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(251, 236, 234, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
