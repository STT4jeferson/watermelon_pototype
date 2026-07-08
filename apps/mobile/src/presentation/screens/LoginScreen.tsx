import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, Modal, TouchableOpacity } from 'react-native';
import { Cloud, AlertTriangle, Settings, X, QrCode, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { KeycloakAuthRepository } from '../../infra/auth/keycloak-auth.repository';
import { api } from '../../infra/http';
import { storage } from '../../infra/storage';
import { setDynamicIp, getDynamicIp } from '../../infra/auth/keycloak.config';
import { CameraView, useCameraPermissions } from 'expo-camera';

const authRepo = new KeycloakAuthRepository();

export function LoginScreen() {
  const { t } = useTranslation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showSettings, setShowSettings] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [ipInput, setIpInput] = useState(getDynamicIp() || '');
  
  const [alertConfig, setAlertConfig] = useState<{visible: boolean, type: 'success' | 'error', title: string, message: string}>({ visible: false, type: 'success', title: '', message: '' });
  
  const [permission, requestPermission] = useCameraPermissions();

  const handleSaveIp = () => {
    setDynamicIp(ipInput);
    setShowSettings(false);
    setError(''); // limpa erros antigos se havia falha de rede
  };

  const handleOpenScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        setAlertConfig({ visible: true, type: 'error', title: 'Câmera Negada', message: 'Precisamos da câmera para ler o QR Code do terminal.' });
        return;
      }
    }
    setShowScanner(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    // Basic IP validation just to avoid scanning random QR codes
    const ipRegex = /^[0-9.]+$/;
    if (ipRegex.test(data)) {
      setIpInput(data);
      setShowScanner(false);
      setDynamicIp(data);
      setError('');
      setAlertConfig({ visible: true, type: 'success', title: 'IP Capturado', message: `O servidor local foi configurado para:\n${data}` });
    } else {
      setShowScanner(false);
      setAlertConfig({ visible: true, type: 'error', title: 'QR Code Inválido', message: 'O código escaneado não contém um IP válido.' });
    }
  };

  const handleKeycloakLogin = async () => {
    setLoading(true);
    setError('');
    
    try {
      const session = await authRepo.signIn();
      
      // Busca perfil no backend que resolverá a empresa baseada no Token
      const userProfile = await api.get('/me');
      
      // Salva sessão no Storage legado usado pelo offline-first e WatermelonDB
      await storage.saveSession({
        token: session.accessToken,
        user: {
          id: userProfile.id,
          nome: userProfile.nome,
          login: userProfile.login,
          empresaId: userProfile.empresa.id,
          empresaNome: userProfile.empresa.nome
        }
      });

      navigation.replace('Home');
    } catch (e: any) {
      setError(e.message || t('login.errorLogin'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity 
        style={styles.settingsBtn} 
        onPress={() => setShowSettings(true)}
      >
        <Settings size={24} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <View style={styles.logoContainer}>
        <View style={styles.logoWrapper}>
          <Cloud size={28} color={theme.colors.surface} />
        </View>
      </View>
      
      <Text style={styles.title}>{t('login.title')}</Text>
      <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            <AlertTriangle size={16} color={theme.colors.error} style={{marginRight: 4}} />
            <Text style={{ fontWeight: '700' }}> {error}</Text>
          </Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <Button 
          title={loading ? t('login.entering') : "Entrar com Keycloak"} 
          onPress={handleKeycloakLogin} 
          loading={loading}
          style={styles.loginBtn}
        />
        <Button 
          title="Escanear IP do Terminal"
          variant="secondary"
          icon={<QrCode size={20} color={theme.colors.primary} />}
          onPress={handleOpenScanner} 
        />
      </View>

      <Text style={styles.footer}>v1.0.0 - OIDC</Text>

      {/* Settings Modal (Manual IP Fallback) */}
      <Modal visible={showSettings} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configurar Servidor Local</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <X size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDesc}>
              Digite o IP do host (computador) onde o backend e o Keycloak estão rodando na sua rede LAN.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 192.168.1.100"
              placeholderTextColor={theme.colors.textMuted}
              value={ipInput}
              onChangeText={setIpInput}
              keyboardType="numeric"
            />
            <Button 
              title="Salvar Configuração" 
              onPress={handleSaveIp} 
              style={{ marginTop: 16 }} 
            />
          </View>
        </View>
      </Modal>

      {/* Scanner Modal */}
      <Modal visible={showScanner} transparent animationType="fade">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
             <TouchableOpacity onPress={() => setShowScanner(false)} style={styles.scannerClose}>
                <X size={28} color="#FFF" />
             </TouchableOpacity>
             <Text style={styles.scannerTitle}>Aponte para o QR Code do terminal</Text>
          </View>
          {showScanner && (
            <CameraView 
              style={StyleSheet.absoluteFillObject}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          )}
        </View>
      </Modal>

      {/* Custom Alert Modal for Scanner Results */}
      {alertConfig.visible && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setAlertConfig(prev => ({...prev, visible: false}))}>
          <View style={styles.alertBackdrop}>
            <View style={styles.alertCard}>
              <View style={[styles.alertIcon, alertConfig.type === 'success' ? styles.alertIconSuccess : styles.alertIconError]}>
                {alertConfig.type === 'success' ? (
                  <Check size={24} color={theme.colors.success} />
                ) : (
                  <AlertTriangle size={24} color={theme.colors.error} />
                )}
              </View>
              <Text style={styles.alertTitle}>{alertConfig.title}</Text>
              <Text style={styles.alertText}>{alertConfig.message}</Text>
              <View style={styles.alertActions}>
                <Button title="Entendi" onPress={() => setAlertConfig(prev => ({...prev, visible: false}))} style={{ flex: 1 }} />
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
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
    justifyContent: 'center',
  },
  settingsBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    padding: 8,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.title,
    marginBottom: 8,
    color: theme.colors.text,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 32,
    fontWeight: '500',
  },
  errorBanner: {
    backgroundColor: theme.colors.errorBg,
    padding: 12,
    borderRadius: theme.radius.card,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  errorBannerText: {
    ...theme.typography.meta,
    color: theme.colors.error,
  },
  form: {
    gap: 16,
  },
  loginBtn: {
    marginTop: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    ...theme.typography.footer,
    color: theme.colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...theme.typography.header,
    color: theme.colors.text,
  },
  modalDesc: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.input,
    padding: 16,
    color: theme.colors.text,
    ...theme.typography.body,
    backgroundColor: theme.colors.background,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scannerHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scannerClose: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  scannerTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  alertBackdrop: {
    flex: 1,
    backgroundColor: theme.colors.backdrop,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  alertIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  alertIconSuccess: {
    backgroundColor: theme.colors.successBg,
  },
  alertIconError: {
    backgroundColor: theme.colors.errorBg,
  },
  alertTitle: {
    ...theme.typography.header,
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  alertText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertActions: {
    flexDirection: 'row',
    width: '100%',
  }
});
