import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Cloud, Eye, EyeOff, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../../infra/storage';

export function LoginScreen() {
  const { t } = useTranslation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!login || !password) {
      setError(t('login.errorMissing'));
      return;
    }
    setLoading(true);
    
    try {
      // Como o usuário está rodando com ADB (USB Reverso/Forwarding ou Host IP)
      // Mapeamos para localhost ou IP de rede (como o adb reverse redireciona as portas)
      // Se não houver adb reverse, o celular físico precisará do IP da máquina na rede.
      // Usaremos o IP retornado pelo servidor: 192.168.15.24 que estava nos logs do backend.
      const baseUrl = 'http://192.168.15.24:3333';
      
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha: password })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || t('login.errorInvalid'));
      }

      await storage.saveSession({ 
        token: data.token, 
        user: { 
           id: data.user.id, 
           nome: data.user.nome, 
           login: data.user.login, 
           empresaId: data.user.empresaId 
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
            <Text style={{ fontWeight: '700' }}>{t('login.invalidBanner')}</Text> {t('login.invalidCheck')}
          </Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('login.loginLabel')}</Text>
          <TextInput 
            style={[styles.input, error && !login && styles.inputError]}
            value={login}
            onChangeText={(t) => { setLogin(t); setError(''); }}
            placeholder={t('login.loginPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            editable={!loading}
          />
          {error && !login && (
            <View style={styles.errorRow}>
              <AlertTriangle size={12} color={theme.colors.error} />
              <Text style={styles.errorText}>{t('login.loginError')}</Text>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('login.passwordLabel')}</Text>
          <View style={styles.passwordWrapper}>
            <TextInput 
              style={[styles.input, styles.passwordInput, error && !password && styles.inputError]}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              placeholder={t('login.passwordPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity 
              style={styles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} color={theme.colors.primary} /> : <Eye size={20} color={theme.colors.textSecondary} />}
            </TouchableOpacity>
          </View>
          {showPassword && <Text style={styles.hintText}>{t('login.passwordHint')}</Text>}
        </View>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>{t('login.forgotPassword')}</Text>
        </TouchableOpacity>

        <Button 
          title={loading ? t('login.entering') : t('login.enter')} 
          onPress={handleLogin} 
          loading={loading}
          style={styles.loginBtn}
        />
      </View>

      <Text style={styles.footer}>v1.0.0</Text>
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
  },
  errorBannerText: {
    ...theme.typography.meta,
    color: theme.colors.error,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.input,
    paddingHorizontal: 16,
    height: 52,
    color: theme.colors.text,
    fontSize: 14,
  },
  inputError: {
    borderColor: theme.colors.inputBorderError,
  },
  passwordWrapper: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    ...theme.typography.meta,
    color: theme.colors.error,
  },
  hintText: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    ...theme.typography.label,
    color: theme.colors.primary,
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
  }
});
