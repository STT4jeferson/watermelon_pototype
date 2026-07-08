import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Check, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ConnectionStatus } from './ConnectionStatus';
import { Button } from './Button';
import { SyncProgress } from '../../modules/sync/syncService';
import { storage } from '../../infra/storage';

type SyncBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onStartSync: () => void;
  isOnline: boolean;
  progress: SyncProgress;
  pendingRecords: number;
  pendingPhotos: number;
};

export function SyncBottomSheet({ visible, onClose, onStartSync, isOnline, progress, pendingRecords, pendingPhotos }: SyncBottomSheetProps) {
  const { t } = useTranslation();
  const { theme, isDarkMode } = useTheme();
  const styles = createStyles(theme);

  const [lastSyncTime, setLastSyncTime] = useState<string>('Nunca');
  const [frozenRecords, setFrozenRecords] = useState(pendingRecords);
  const [frozenPhotos, setFrozenPhotos] = useState(pendingPhotos);

  useEffect(() => {
    if (visible) {
      storage.getSession().then(session => {
        if (session?.lastSync) {
          const date = new Date(session.lastSync);
          setLastSyncTime(`hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
        }
      });
    }
  }, [visible, progress.phase]);

  useEffect(() => {
    if (progress.phase === 'idle') {
      setFrozenRecords(pendingRecords);
      setFrozenPhotos(pendingPhotos);
    }
  }, [progress.phase, pendingRecords, pendingPhotos]);

  const isSyncing = progress.phase === 'records' || progress.phase === 'photos';
  const isDone = progress.phase === 'done';
  const isError = progress.phase === 'error';
  const isIdle = progress.phase === 'idle';

  let totalPhotos = progress.totalPhotos || frozenPhotos;
  let syncedPhotos = progress.syncedPhotos || 0;
  let errorCount = progress.errorCount || 0;
  
  if (isDone) {
    totalPhotos = frozenPhotos;
    syncedPhotos = frozenPhotos;
  }

  const renderContent = () => {
    if (isDone) {
      return (
        <View style={styles.stateContainer}>
          <View style={styles.successCircle}>
            <Check size={32} color={theme.colors.onPrimary} />
          </View>
          <Text style={styles.titleDone}>{t('components.syncAllSynced')}</Text>
          <Text style={styles.subtitleDone}>
            {t('components.sheetSyncedSub')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.
          </Text>
          <Button title={t('common.close')} variant="secondary" onPress={onClose} style={styles.actionBtn} />
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.stateContainer}>
          <View style={styles.bannerError}>
            <Text style={styles.bannerErrorText}>
              <Text style={{ fontWeight: '700' }}>{errorCount} {t('components.sheetItemsNotSent')}</Text> {t('components.sheetErrorSub')}
            </Text>
          </View>
          
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('components.sheetSentSuccess')}</Text>
              <Text style={[styles.tableValue, { color: theme.colors.success }]}>{frozenRecords + frozenPhotos - errorCount}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('components.sheetWaitingRetry')}</Text>
              <Text style={[styles.tableValue, { color: theme.colors.error }]}>{errorCount}</Text>
            </View>
          </View>

          <Button title={t('common.retry')} onPress={onStartSync} style={styles.actionBtn} />
        </View>
      );
    }

    if (isSyncing) {
      const isPhotos = progress.phase === 'photos';
      const percentage = isPhotos && totalPhotos > 0 ? (syncedPhotos / totalPhotos) * 100 : 50;

      return (
        <View style={styles.stateContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              {isPhotos ? `${t('components.sheetSendingPhoto')} ${syncedPhotos + 1} ${t('common.of')} ${totalPhotos}...` : t('components.syncingRecords')}
            </Text>
            <Text style={styles.progressPercent}>{Math.round(percentage)}%</Text>
          </View>
          
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>

          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('components.sheetRecordsSent')}</Text>
              <Text style={[styles.tableValue, { color: theme.colors.success }]}>{frozenRecords} {t('common.of')} {frozenRecords}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>{t('components.sheetPhotosSent')}</Text>
              <Text style={[styles.tableValue, { color: theme.colors.syncing }]}>{syncedPhotos} {t('common.of')} {totalPhotos}</Text>
            </View>
          </View>

          <Button title={t('form.saving')} disabled loading onPress={() => {}} style={styles.actionBtn} />
        </View>
      );
    }

    // Default Idle (Pendências)
    return (
      <View style={styles.stateContainer}>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>{t('components.sheetRecordsPending')}</Text>
            <Text style={styles.tableValueBold}>{frozenRecords}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>{t('components.sheetPhotosPending')}</Text>
            <Text style={styles.tableValueBold}>{frozenPhotos}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>{t('details.lastSync')}</Text>
            <Text style={styles.tableValueBold}>{lastSyncTime}</Text>
          </View>
        </View>

        <View style={styles.shieldNote}>
          <ShieldCheck size={16} color={theme.colors.textSecondary} />
          <Text style={styles.shieldNoteText}>{t('components.sheetSafeNote')}</Text>
        </View>

        <Button 
          title={frozenRecords === 0 && frozenPhotos === 0 ? t('components.sheetForceSync') : t('components.sheetSyncNow')} 
          disabled={!isOnline} 
          sublabel={!isOnline ? t('common.offlineReq') : undefined} 
          onPress={onStartSync} 
          style={styles.actionBtn} 
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} onPress={!isSyncing ? onClose : undefined} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>
          
          <View style={styles.header}>
            <Text style={styles.title}>{t('details.syncSection')}</Text>
            <ConnectionStatus status={isOnline ? (isSyncing ? 'syncing' : (isError ? 'error' : 'online')) : 'offline'} />
          </View>

          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
    width: '100%',
  },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.sheet,
    borderTopRightRadius: theme.radius.sheet,
    padding: 24,
    paddingTop: 12,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.sheetHandle,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    ...theme.typography.header,
    color: theme.colors.text,
  },
  stateContainer: {
    width: '100%',
  },
  table: {
    marginBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  tableLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  tableValueBold: {
    ...theme.typography.body,
    fontWeight: '800',
    color: theme.colors.text,
  },
  tableValue: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    width: '100%',
  },
  shieldNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface2,
    padding: 12,
    borderRadius: theme.radius.card,
    gap: 8,
    marginBottom: 24,
  },
  shieldNoteText: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  actionBtn: {
    width: '100%',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  progressPercent: {
    ...theme.typography.body,
    color: theme.colors.syncing,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(111,165,239,.18)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 24,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.syncing,
    borderRadius: 4,
  },
  successCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  titleDone: {
    ...theme.typography.title,
    fontSize: 18,
    textAlign: 'center',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitleDone: {
    ...theme.typography.body,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  bannerError: {
    backgroundColor: theme.colors.errorBg,
    padding: 12,
    borderRadius: theme.radius.card,
    marginBottom: 20,
  },
  bannerErrorText: {
    ...theme.typography.meta,
    color: theme.colors.errorBannerText,
  },
});
