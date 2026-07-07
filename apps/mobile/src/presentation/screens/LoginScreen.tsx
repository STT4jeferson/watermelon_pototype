import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Cloud, Eye, EyeOff, AlertTriangle } from 'lucide-react-native';
import { theme } from '../theme';
import { Button } from '../components/Button';
import { useNavigation } from '@react-navigation/native';
import { storage } from '../../infra/storage';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!login || !password) {
      setError('Informe seu login ou e-mail e senha.');
      return;
    }
    setLoading(true);
    setTimeout(async () => {
      setLoading(false);
      
      // Lógica mock: Se o login tiver 'b', loga como Usuário B, senão Usuário A
      const isUserB = login.toLowerCase().includes('b');
      const userId = isUserB ? 2 : 1;
      const userName = isUserB ? 'Usuário B' : 'Usuário A';

      await storage.saveSession({ 
        token: 'fake-jwt-token', 
        user: { id: userId, nome: userName, login: login, empresaId: 1 } 
      });
      navigation.replace('Home');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.logoWrapper}>
          <Cloud size={28} color={theme.colors.surface} />
        </View>
      </View>
      
      <Text style={styles.title}>Acesse sua conta</Text>
      <Text style={styles.subtitle}>Registre compras e vendas mesmo sem internet.</Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            <Text style={{ fontWeight: '700' }}>Login ou senha inválidos.</Text> Verifique os dados e tente novamente.
          </Text>
        </View>
      ) : null}

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Login ou e-mail</Text>
          <TextInput 
            style={[styles.input, error && !login && styles.inputError]}
            value={login}
            onChangeText={(t) => { setLogin(t); setError(''); }}
            placeholder="Digite seu login"
            editable={!loading}
          />
          {error && !login && (
            <View style={styles.errorRow}>
              <AlertTriangle size={12} color={theme.colors.error} />
              <Text style={styles.errorText}>Informe seu login ou e-mail</Text>
            </View>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Senha</Text>
          <View style={styles.passwordWrapper}>
            <TextInput 
              style={[styles.input, styles.passwordInput, error && !password && styles.inputError]}
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              placeholder="Digite sua senha"
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
          {showPassword && <Text style={styles.hintText}>Toque no olho para ocultar a senha</Text>}
        </View>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
        </TouchableOpacity>

        <Button 
          title={loading ? "Entrando…" : "Entrar"} 
          onPress={handleLogin} 
          loading={loading}
          style={styles.loginBtn}
        />
      </View>

      <Text style={styles.footer}>v1.0.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
