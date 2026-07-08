import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Clock, Check, Cloud, AlertTriangle, RefreshCw } from 'lucide-react-native';
import { Button } from '../components/Button';
import { useTheme } from '../theme/ThemeProvider';
import { SyncBadge } from '../components/SyncBadge';
import { PhotoThumb } from '../components/PhotoThumb';
import { database } from '../../database';
import { Registro, FotoRegistro } from '../../database/models';

export function DetalheRegistroScreen({ route, navigation }: any) {
  const { t } = useTranslation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
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

  const isPending = registro.status === 'pending';
  const isError = registro.status === 'error';
  const isSynced = registro.status === 'synced';

  const renderBanner = () => {
    if (isError) {
      return (
        <View style={styles.bannerError}>
          <View style={styles.bannerErrorRow}>
            <AlertTriangle size={18} color={theme.colors.error} />
            <Text style={styles.bannerErrorText}>
              <Text style={{ fontWeight: '700', color: theme.colors.errorBannerText }}>{t('details.errorBanner')}</Text> {t('details.errorSafe')}
            </Text>
          </View>
          <Button 
            title={t('common.retry')} 
            onPress={() => {}} 
            icon={<RefreshCw size={16} color="#FFF" />} 
            style={styles.retryBtn} 
          />
        </View>
      );
    }
    if (isPending) {
      return (
        <View style={styles.bannerOffline}>
          <Cloud size={18} color={theme.colors.offlineText} style={{ marginTop: 2 }} />
          <Text style={styles.bannerText}>
            {t('details.offlineBanner')}
          </Text>
        </View>
      );
    }
    return null;
  };

  const isVenda = registro.tipo === 'Venda';
  const tagBg = isVenda ? theme.colors.vendaTagBg : theme.colors.primarySoft;
  const tagColor = isVenda ? theme.colors.vendaTag : theme.colors.primary;
  const translatedType = registro.tipo === 'Venda' ? t('form.sale') : t('form.purchase');
  
  const dateStr = registro.dataHora ? registro.dataHora.toLocaleDateString('pt-BR') : '';
  const timeStr = registro.dataHora ? registro.dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {renderBanner()}
        
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={[styles.tag, { backgroundColor: tagBg }]}>
              <Text style={[styles.tagText, { color: tagColor }]}>{translatedType}</Text>
            </View>
            <Text style={styles.dateTime}>{dateStr} · {timeStr}</Text>
          </View>
          
          <Text style={styles.description}>{registro.descricao}</Text>
          
          <View style={styles.meta}>
            <Clock size={14} color={theme.colors.textMuted} />
            <Text style={styles.metaText}>{t('details.createdAt')} {dateStr} {t('details.at')} {timeStr}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('details.photosCount')} · {fotos.length}</Text>
          <View style={styles.photosGrid}>
            {fotos.map((photo, index) => (
              <View key={index} style={styles.photoWrapper}>
                <PhotoThumb variant="large"  uri={photo.localPath || photo.remoteUrl} status={photo.status as any} />
              </View>
            ))}
          </View>
          <Text style={styles.note}>{t('details.photosNote')}</Text>
        </View>

        <View style={styles.syncCard}>
          <Text style={styles.sectionTitle}>{t('details.syncSection')}</Text>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>{t('details.record')}</Text>
            <View style={styles.syncStatus}>
              <Text style={[styles.syncStatusText, 
                isPending && { color: theme.colors.pending },
                isSynced && { color: theme.colors.success },
                isError && { color: theme.colors.error }
              ]}>
                {isSynced ? t('details.synced') : isPending ? t('details.waitingConn') : t('common.error')}
              </Text>
            </View>
          </View>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>{t('details.photosCount')}</Text>
            <Text style={[styles.syncStatusText, 
                isPending && { color: theme.colors.pending },
                isSynced && { color: theme.colors.success },
                isError && { color: theme.colors.error }
              ]}>
                {fotos.filter(f => f.status === 'uploaded').length} de {fotos.length} enviadas
            </Text>
          </View>
          <View style={styles.syncRow}>
            <Text style={styles.syncLabel}>{isError ? t('details.lastAttempt') : t('details.lastSync')}</Text>
            <Text style={styles.syncStatusText}>
              {t('common.todayAt')} {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
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
    padding: 16,
    borderRadius: theme.radius.card,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.offlineBorder,
  },
  bannerText: {
    ...theme.typography.body,
    color: theme.colors.offlineText,
    flex: 1,
    lineHeight: 20,
  },
  bannerError: {
    backgroundColor: theme.colors.errorBtnBgBg,
    padding: 16,
    borderRadius: theme.radius.card,
    borderWidth: 1,
    borderColor: theme.colors.errorBorder,
    gap: 16,
  },
  bannerErrorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bannerErrorText: {
    ...theme.typography.body,
    color: theme.colors.errorBannerText,
    flex: 1,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: theme.colors.errorBtnBg,
    height: 44,
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
    width: '48%',
    aspectRatio: 1,
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
