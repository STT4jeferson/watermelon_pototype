import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Clock, Check } from 'lucide-react-native';
import { theme } from '../theme';
import { SyncBadge } from '../components/SyncBadge';
import { PhotoThumb } from '../components/PhotoThumb';
import { database } from '../../database';
import { Registro, FotoRegistro } from '../../database/models';

export function DetalheRegistroScreen({ route, navigation }: any) {
  const { registroId } = route.params;
  const [registro, setRegistro] = useState<Registro | null>(null);
  const [fotos, setFotos] = useState<FotoRegistro[]>([]);
  const [loading, setLoading] = useState(true);
  React.useLayoutEffect(() => {
    if (registro) {
      navigation.setOptions({
        headerRight: () => <SyncBadge status={registro.status as any} />
      });
    }
  }, [navigation, registro]);

  useEffect(() => {
    let registroSub: any;
    let fotosSub: any;

    const fetchDetails = async () => {
      try {
        const reg = await database.collections.get<Registro>('registros').find(registroId);
        
        registroSub = reg.observe().subscribe(r => {
          setRegistro(r);
        });

        fotosSub = reg.fotos.observe().subscribe((f: FotoRegistro[]) => {
          setFotos(f);
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();

    return () => {
      if (registroSub) registroSub.unsubscribe();
      if (fotosSub) fotosSub.unsubscribe();
    };
  }, [registroId]);

  if (loading || !registro) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isVenda = registro.tipo === 'Venda';
  const tagBg = isVenda ? theme.colors.vendaTagBg : theme.colors.primarySoft;
  const tagColor = isVenda ? theme.colors.vendaTag : theme.colors.primary;
  
  const dateStr = registro.dataHora ? registro.dataHora.toLocaleDateString('pt-BR') : '';
  const timeStr = registro.dataHora ? registro.dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {registro.status === 'pending' && (
          <View style={styles.bannerOffline}>
            <Text style={styles.bannerText}>Este registro está salvo no aparelho e será enviado automaticamente quando a conexão voltar.</Text>
          </View>
        )}
        
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.tag, { backgroundColor: tagBg }]}>
              <Text style={[styles.tagText, { color: tagColor }]}>{registro.tipo}</Text>
            </View>
            <Text style={styles.dateTime}>{dateStr} · {timeStr}</Text>
          </View>
          
          <Text style={styles.description}>{registro.descricao}</Text>
          
          <View style={styles.meta}>
            <Clock size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>Criado neste dispositivo em {dateStr} às {timeStr}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotos · {fotos.length}</Text>
          <View style={styles.photosGrid}>
            {fotos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <PhotoThumb uri={photo.localPath || photo.remoteUrl} status={photo.status as any} />
              </View>
            ))}
          </View>
          <Text style={styles.note}>As fotos originais continuam disponíveis neste dispositivo, mesmo offline.</Text>
        </View>

        <View style={styles.syncCard}>
          <Text style={styles.sectionTitle}>Sincronização</Text>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>Registro</Text>
            <View style={styles.syncStatus}>
              <Text style={styles.syncStatusText}>{registro.status === 'pending' ? 'Pendente' : 'Sincronizado'}</Text>
              <SyncBadge status={registro.status as any} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  bannerOffline: {
    backgroundColor: theme.colors.offlineBg,
    padding: 12,
    borderRadius: theme.radius.card,
  },
  bannerText: {
    ...theme.typography.meta,
    color: theme.colors.offlineText,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
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
  dateTime: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  description: {
    ...theme.typography.body,
    fontSize: 16,
    lineHeight: 22,
    color: theme.colors.text,
    marginBottom: 16,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    ...theme.typography.meta,
    color: theme.colors.textMuted,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    ...theme.typography.header,
    color: theme.colors.text,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoWrapper: {
    width: 130,
    height: 130,
  },
  note: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  syncCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 16,
  },
  syncRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusText: {
    ...theme.typography.body,
    color: theme.colors.text,
  }
});
