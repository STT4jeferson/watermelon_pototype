import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LogOut, Plus, RefreshCw } from 'lucide-react-native';
import { theme } from '../theme';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { StatusCard } from '../components/StatusCard';
import { RecordCard } from '../components/RecordCard';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import NetInfo from '@react-native-community/netinfo';
import { storage } from '../../infra/storage';
import { database } from '../../database';
import { Registro } from '../../database/models';
import { Q } from '@nozbe/watermelondb';
import { syncData } from '../../modules/sync/syncService';

function ObservableRecordCard({ registro, onPress }: { registro: Registro, onPress: () => void }) {
  const [photosCount, setPhotosCount] = useState(0);

  useEffect(() => {
    const subscription = registro.fotos.observeCount().subscribe((count: number) => {
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
  const navigation = useNavigation<any>();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [records, setRecords] = useState<Registro[]>([]);
  const [userName, setUserName] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected);
    });
    
    let dbSub: any;

    storage.getSession().then(session => {
      if (session?.user) {
        setUserName(session.user.nome);
        setCompanyName('Empresa A');
        
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
          });
      }
    });

    return () => {
      unsubscribe();
      if (dbSub) dbSub.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await storage.clearSession();
    navigation.replace('Login');
  };

  const handleSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      await syncData();
    } catch (e) {
      console.log('Sync error', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const pendingCount = records.filter(r => r.status === 'pending').length;
  const errorCount = records.filter(r => r.status === 'error').length;
  const listSubtitle = errorCount > 0 
    ? `${records.length} registros · ${errorCount} com erro` 
    : pendingCount > 0 
      ? `${records.length} registros · ${pendingCount} pendentes` 
      : `${records.length} registros · salvos localmente`;

  const statusCardStatus = isOnline 
    ? (isSyncing ? 'syncing' : (errorCount > 0 ? 'error' : 'success')) 
    : 'offline';

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{userName ? userName.substring(0,2).toUpperCase() : 'UA'}</Text>
        </View>
        <View>
          <Text style={styles.userName}>Olá, {userName || 'Usuário'}</Text>
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

  return (
    <View style={styles.container}>
      {renderHeader()}
      
      <View style={styles.content}>
        <StatusCard 
          status={statusCardStatus} 
          progress={isSyncing ? 0.6 : undefined}
          onPress={statusCardStatus === 'error' ? handleSync : undefined}
        />
        
        <View style={styles.actionsRow}>
          <Button 
            title="Novo registro" 
            icon={<Plus size={20} color="#FFF" />} 
            onPress={() => navigation.navigate('NovoRegistro')} 
            style={styles.newRecordBtn} 
          />
          <Button 
            title="Sincronizar" 
            variant={isOnline ? 'secondary' : 'disabled'}
            icon={<RefreshCw size={18} color={isOnline ? theme.colors.primary : theme.colors.disabledBtnText} />} 
            onPress={handleSync}
            disabled={!isOnline || isSyncing}
            sublabel={!isOnline ? 'requer conexão' : undefined}
            style={styles.syncBtn} 
          />
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Registros no dispositivo</Text>
          <Text style={styles.listSubtitle}>{listSubtitle}</Text>
        </View>

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
          ListEmptyComponent={<EmptyState onAction={() => navigation.navigate('NovoRegistro')} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderBottomColor: '#ECEEF1',
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
    flex: 1,
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
    flex: 1,
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
  },
  listSubtitle: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  listContent: {
    gap: 10,
    paddingBottom: 20,
  }
});
