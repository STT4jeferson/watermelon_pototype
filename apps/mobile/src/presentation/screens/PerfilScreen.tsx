import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Image } from 'react-native';
import { Sun, Globe, Download, Info, AlertTriangle, ChevronRight, Camera } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { storage } from '../../infra/storage';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Modal } from 'react-native';
import { Check } from 'lucide-react-native';
import { Button } from '../components/Button';

export function PerfilScreen() {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  const { t, i18n } = useTranslation();
  const [isLangModalVisible, setIsLangModalVisible] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  
  const [lastSync, setLastSync] = useState<string>(t('profile.never'));

  useEffect(() => {
    const fetchSession = async () => {
      const session = await storage.getSession();
      if (session?.user) setUser(session.user);
      if (session?.avatarUri) setAvatarUri(session.avatarUri);
      if (session?.lastSync) {
        const date = new Date(session.lastSync);
        setLastSync(`${t('profile.todayAt')} ${date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}`);
      }
    };
    
    fetchSession();
    
    // Intervalo de polling simples pra mockar a reatividade na tela aberta
    const interval = setInterval(fetchSession, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      
      const session = await storage.getSession();
      if (session) {
        await storage.saveSession({ ...session, avatarUri: uri });
      }
    }
  };

  

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* User Card */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.avatarContainer} onPress={handlePickAvatar} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {user?.nome ? user.nome.substring(0, 2).toUpperCase() : 'UA'}
                </Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Camera size={14} color="#FFF" />
            </View>
          </TouchableOpacity>
          
          <Text style={styles.userName}>{user?.nome || 'Carregando...'}</Text>
          <Text style={styles.userRole}>{t('profile.client')} {user?.empresaId}</Text>
          
        </View>

        {/* Settings Card */}
        <View style={styles.card}>
          {/* Theme */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrapper}>
              <Sun size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>{t('profile.theme')}</Text>
              <Text style={styles.settingSubtitle}>{isDarkMode ? t('profile.dark') : t('profile.light')}</Text>
            </View>
            <Switch
              trackColor={{ false: theme.colors.border, true: theme.colors.primarySoft }}
              thumbColor={isDarkMode ? theme.colors.primary : '#f4f3f4'}
              onValueChange={toggleTheme}
              value={isDarkMode}
            />
          </View>
          <View style={styles.divider} />

          {/* Language */}
          <TouchableOpacity style={styles.settingRow} onPress={() => setIsLangModalVisible(true)}>
            <View style={styles.settingIconWrapper}>
              <Globe size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>{t('profile.language')}</Text>
              <Text style={styles.settingSubtitle}>
                {i18n.language === 'en' ? 'English' : i18n.language === 'es' ? 'Español' : 'Português (Brasil)'}
              </Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />

          {/* Sync / Updates */}
          <TouchableOpacity style={styles.settingRow}>
            <View style={styles.settingIconWrapper}>
              <Download size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>{t('profile.sync')}</Text>
              <Text style={styles.settingSubtitle}>{t('profile.lastSync')}: {lastSync}</Text>
            </View>
            <ChevronRight size={20} color={theme.colors.textMuted} />
          </TouchableOpacity>
          <View style={styles.divider} />

          {/* Version */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconWrapper}>
              <Info size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>{t('profile.version')}</Text>
              <Text style={styles.settingSubtitle}>1.0.0(Dev)</Text>
            </View>
          </View>
        </View>

        

      </ScrollView>

      <Modal visible={isLangModalVisible} transparent animationType="fade" onRequestClose={() => setIsLangModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('profile.chooseLanguage')}</Text>
            
            {['pt', 'en', 'es'].map(lang => (
              <TouchableOpacity key={lang} style={styles.langOption} onPress={async () => {
                i18n.changeLanguage(lang);
                const session = await storage.getSession();
                if (session) await storage.saveSession({ ...session, language: lang as any });
                setIsLangModalVisible(false);
              }}>
                <Text style={[styles.langOptionText, i18n.language === lang && { color: theme.colors.primary, fontWeight: '700' }]}>
                  {lang === 'en' ? 'English' : lang === 'es' ? 'Español' : 'Português (Brasil)'}
                </Text>
                {i18n.language === lang && <Check size={18} color={theme.colors.primary} />}
              </TouchableOpacity>
            ))}

            <Button title={t('profile.cancel')} variant="secondary" onPress={() => setIsLangModalVisible(false)} style={{marginTop: 16, width: '100%'}} />
          </View>
        </View>
      </Modal>
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
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 16,
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarText: {
    color: theme.colors.primary,
    fontSize: 32,
    fontWeight: '700',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  userName: {
    ...theme.typography.header,
    fontSize: 20,
    color: theme.colors.text,
    marginBottom: 4,
  },
  userRole: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  userEmail: {
    ...theme.typography.meta,
    color: theme.colors.textMuted,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 12,
  },
  settingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    ...theme.typography.body,
    color: theme.colors.text,
    fontWeight: '700',
  },
  settingSubtitle: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    width: '100%',
    marginLeft: 56, // Align with text
  },
  warningCard: {
    backgroundColor: '#FAF5F5',
    borderRadius: theme.radius.card,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  warningText: {
    ...theme.typography.body,
    color: theme.colors.error,
    fontWeight: '700',
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
  modalTitle: {
    ...theme.typography.header,
    color: theme.colors.text,
    marginBottom: 16,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  langOptionText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },

});
