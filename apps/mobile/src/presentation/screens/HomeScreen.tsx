import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { LogOut, Plus, RefreshCw, FileText, Trash2, ArrowDownUp, Filter } from 'lucide-react-native';
import { Modal } from 'react-native';
import { ActivityIndicator, Image } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { StatusCard } from '../components/StatusCard';
import { RecordCard } from '../components/RecordCard';
import { EmptyState } from '../components/EmptyState';
import { SyncBottomSheet } from '../components/SyncBottomSheet';
import { Button } from '../components/Button';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';
import { storage } from '../../infra/storage';
import { database } from '../../database';
import { Registro, FotoRegistro } from '../../database/models';
import { Q } from '@nozbe/watermelondb';
import { syncData, SyncProgress } from '../../modules/sync/syncService';

function ObservableRecordCard({ registro, onPress }: { registro: Registro, onPress: () => void }) {
  const [photosCount, setPhotosCount] = useState(0);

  useEffect(() => {const subscription = registro.fotos.observeCount().subscribe((count: number) => {
      setPhotosCount(count);
    });
    return () => subscription.unsubscribe();
  }, [registro]);

  return (
    <RecordCard 
      type={registro.tipo as 'Compra' | 'Venda'}
      date={`${registro.dataHora.toLocaleDateString('pt-BR')} · ${registro.dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
      description={registro.descricao}
      photosCount={photosCount}
      syncStatus={registro.status as any}
      onPress={onPress}
    />
  );
}
export function HomeScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false && netInfo.isInternetReachable !== false;
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({ phase: 'idle' });
  const isSyncing = syncProgress.phase === 'records' || syncProgress.phase === 'photos';
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [pendingPhotosCount, setPendingPhotosCount] = useState(0);
  const [records, setRecords] = useState<Registro[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [filterType, setFilterType] = useState<'all' | 'Compra' | 'Venda'>('all');
  const [isClearModalVisible, setIsClearModalVisible] = useState(false);


  useFocusEffect(
    React.useCallback(() => {
      storage.getSession().then(session => {
        if (session?.avatarUri) {
          setAvatarUri(session.avatarUri);
        }
      });
    }, [])
  );


  useEffect(() => {
    let dbSub: any;

    storage.getSession().then(session => {
      if (session?.user) {
        setUserName(session.user.nome);
        setCompanyName('Empresa A'); // TODO: get from session
        if (session.avatarUri) setAvatarUri(session.avatarUri);
        
        const currentUserId = session.user.id;

        // Filtra a query apenas para o usuário logado
        dbSub = database.collections.get<Registro>('registros')
          .query(
            Q.where('usuario_id', currentUserId),
            Q.sortBy('data_hora', Q.desc)
          )
          .observe()
          .subscribe(data => {
            setRecords(data);
            setIsLoading(false);
          });

        // Track photos count
        database.collections.get('foto_registros').query(Q.where('usuario_id', currentUserId)).observe().subscribe(fotos => {
           const pendingPhotos = fotos.filter((f: any) => f.status === 'pending' || f.status === 'local' || f.status === 'failed').length;
           setPendingPhotosCount(pendingPhotos);
        });
      }
    });

    return () => {
      if (dbSub) dbSub.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await storage.clearSession();
    navigation.replace('Login');
  };

  const handleSync = async () => {
    setIsSheetVisible(true);
    if (!isOnline || isSyncing) return;
    try {
      await syncData((prog) => {
        setSyncProgress({...prog});
      });
    } catch (e) {
      setSyncProgress({ phase: 'error', errorCount: 1 });
    }
  };

const handleClearAll = async () => {
    try {
      const session = await storage.getSession();
      const currentUserId = session?.user?.id;
      if (!currentUserId) return;

      const regs = await database.get<Registro>('registros').query(Q.where('usuario_id', currentUserId)).fetch();
      const fotos = await database.get<FotoRegistro>('foto_registros').query(Q.where('usuario_id', currentUserId)).fetch();
      
      await database.write(async () => {
        for (const f of fotos) {
          await f.destroyPermanently();
        }
        for (const r of regs) {
          await r.destroyPermanently();
        }
      });
      setIsClearModalVisible(false);
    } catch (e) {
      console.error('Erro ao limpar', e);
    }
  };

  const handleCloseSheet = () => {
    setIsSheetVisible(false);
    if (syncProgress.phase === 'done' || syncProgress.phase === 'error') {
      setTimeout(() => setSyncProgress({ phase: 'idle' }), 300);
    }
  };


  const isPhotos = syncProgress.phase === 'photos';
  const syncPercentage = isPhotos && syncProgress.totalPhotos ? (syncProgress.syncedPhotos! / syncProgress.totalPhotos!) : 0.2;

  const pendingCount = records.filter(r => r.status === 'pending').length;
  const errorCount = records.filter(r => r.status === 'error').length;

  const listSubtitle = errorCount > 0 
    ? `${records.length} registros · ${errorCount} com erro` 
    : pendingCount > 0 
      ? `${records.length} registros · ${pendingCount} pendentes` 
      : `${records.length} registros · tudo sincronizado`;

  let statusCardStatus: 'success' | 'offline' | 'syncing' | 'error' = 'success';
  let cardTitle;
  let cardSubtitle;

  if (!isOnline) {
    statusCardStatus = 'offline';
  } else if (isSyncing) {
    statusCardStatus = 'syncing';
  } else if (errorCount > 0) {
    statusCardStatus = 'error';
  } else if (pendingCount > 0) {
    statusCardStatus = 'offline'; 
    cardTitle = t('home.pendingTitle');
    cardSubtitle = t('home.pendingSub');
  } else {
    statusCardStatus = 'success';
  }

  
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.skeleton }]} />
            <View style={{ gap: 4 }}>
              <View style={{ width: 120, height: 14, backgroundColor: theme.colors.skeleton, borderRadius: 4 }} />
              <View style={{ width: 80, height: 10, backgroundColor: theme.colors.skeleton, borderRadius: 4 }} />
            </View>
          </View>
        </View>
        <View style={styles.content}>
          <View style={{ width: '100%', height: 70, backgroundColor: theme.colors.skeleton, borderRadius: theme.radius.card, marginBottom: 24 }} />
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
            <View style={{ flex: 1.4, height: 52, backgroundColor: theme.colors.skeleton, borderRadius: theme.radius.button }} />
            <View style={{ flexGrow: 1, height: 52, backgroundColor: theme.colors.skeleton, borderRadius: theme.radius.button }} />
          </View>
          <View style={{ width: 150, height: 12, backgroundColor: theme.colors.skeleton, borderRadius: 4, marginBottom: 16 }} />
          {[1, 2, 3].map(i => (
            <View key={i} style={{ width: '100%', height: 110, backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 16 }}>
              <View style={{ width: 100, height: 12, backgroundColor: theme.colors.skeleton, borderRadius: 4, marginBottom: 16 }} />
              <View style={{ width: '100%', height: 12, backgroundColor: theme.colors.skeleton, borderRadius: 4, marginBottom: 8 }} />
              <View style={{ width: '70%', height: 12, backgroundColor: theme.colors.skeleton, borderRadius: 4 }} />
            </View>
          ))}
        </View>
        <View style={{ position: 'absolute', bottom: 40, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="small" color={theme.colors.textMuted} />
          <Text style={{ ...theme.typography.meta, color: theme.colors.textSecondary }}>{t('home.loadingRecords')}</Text>
        </View>
      
    </SafeAreaView>
  );
  }

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Perfil')} activeOpacity={0.8}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: 40, height: 40, borderRadius: 20 }} />
          ) : (
            <Text style={styles.avatarText}>{userName ? userName.substring(0,2).toUpperCase() : 'UA'}</Text>
          )}
        </TouchableOpacity>
        <View>
          <Text style={styles.userName}>{t('home.hello')}, {userName || t('home.user')}</Text>
          <Text style={styles.companyName}>{companyName}</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <ConnectionStatus status={isOnline ? (isSyncing ? 'syncing' : 'online') : 'offline'} />
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <LogOut size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const isEmpty = records.length === 0;

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <View style={styles.content}>
        {!isEmpty && (
          <>
            <StatusCard 
              status={statusCardStatus} 
              title={cardTitle}
              subtitle={cardSubtitle}
              progress={isSyncing ? syncPercentage : undefined}
              onPress={statusCardStatus === 'error' ? handleSync : undefined}
            />
            
            <View style={styles.actionsRow}>
              <Button 
                title={t('nav.newRecord')} 
                icon={<Plus size={20} color="#FFF" />} 
                onPress={() => navigation.navigate('NovoRegistro')} 
                style={styles.newRecordBtn} 
              />
              <Button 
                title={t('home.syncBtn')} 
                variant={isOnline ? 'secondary' : 'disabled'}
                icon={<RefreshCw size={18} color={isOnline ? theme.colors.primary : theme.colors.disabledBtnText} />} 
                onPress={handleSync}
                disabled={!isOnline || isSyncing}
                sublabel={!isOnline ? t('common.offlineReq') : undefined}
                style={styles.syncBtn} 
              />
            </View>

            <View style={styles.listHeader}>
              <View>
                <Text style={styles.listTitle}>{t('home.recordsInDevice')}</Text>
                <Text style={styles.listSubtitle}>{listSubtitle}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsClearModalVisible(true)} style={styles.trashBtn}>
                <Trash2 size={18} color={theme.colors.error} />
              </TouchableOpacity>
            </View>

            <View style={styles.filtersRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                <TouchableOpacity 
                  style={[styles.filterChip, sortOrder === 'asc' && styles.filterChipActive]} 
                  onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                >
                  <ArrowDownUp size={14} color={sortOrder === 'asc' ? theme.colors.primary : theme.colors.textSecondary} />
                  <Text style={[styles.filterChipText, sortOrder === 'asc' && styles.filterChipTextActive]}>
                    {sortOrder === 'desc' ? t('home.filterRecent') : t('home.filterOld')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]} 
                  onPress={() => setFilterType('all')}
                >
                  <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>{t('home.filterAll')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterChip, filterType === 'Compra' && styles.filterChipActive]} 
                  onPress={() => setFilterType('Compra')}
                >
                  <Text style={[styles.filterChipText, filterType === 'Compra' && styles.filterChipTextActive]}>{t('home.filterPurchases')}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.filterChip, filterType === 'Venda' && styles.filterChipActive]} 
                  onPress={() => setFilterType('Venda')}
                >
                  <Text style={[styles.filterChipText, filterType === 'Venda' && styles.filterChipTextActive]}>{t('home.filterSales')}</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </>
        )}

        {isEmpty ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState onAction={() => navigation.navigate('NovoRegistro')} />
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={isSyncing} onRefresh={handleSync} />}
            renderItem={({ item }) => (
              <ObservableRecordCard 
                registro={item} 
                onPress={() => navigation.navigate('DetalheRegistro', { registroId: item.id })}
              />
            )}
          />
        )}
      </View>
      
      {isSheetVisible && (
        <SyncBottomSheet 
          visible={isSheetVisible} 
          onClose={handleCloseSheet}
          onStartSync={handleSync}
          isOnline={isOnline} 
          pendingRecords={pendingCount + errorCount}
          pendingPhotos={pendingPhotosCount}
          progress={syncProgress}
        />
      )}
    {isClearModalVisible && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setIsClearModalVisible(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalIcon}>
                <Trash2 size={24} color={theme.colors.error} />
              </View>
              <Text style={styles.modalTitle}>{t('home.clearTitle')}</Text>
              <Text style={styles.modalText}>
                {t('home.clearText')}
              </Text>
              <View style={styles.modalActions}>
                <Button title={t('common.cancel')} variant="secondary" onPress={() => setIsClearModalVisible(false)} style={{ flex: 1 }} />
                <Button title={t('home.clearBtn')} onPress={handleClearAll} style={{ flex: 1, backgroundColor: theme.colors.errorBtnBg }} />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  userName: {
    ...theme.typography.header,
    fontSize: 16,
    color: theme.colors.text,
  },
  companyName: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoutBtn: {
    padding: 4,
  },
  content: {
    flexGrow: 1,
    padding: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  newRecordBtn: {
    flex: 1.4,
  },
  syncBtn: {
    flexGrow: 1,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    ...theme.typography.label,
    fontWeight: '700',
    color: theme.colors.text,
  },
  listSubtitle: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  trashBtn: {
    padding: 8,
    backgroundColor: theme.colors.errorBg,
    borderRadius: 8,
  },
  filtersRow: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 999,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    ...theme.typography.meta,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: theme.colors.primary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.errorBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...theme.typography.header,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  }
});
