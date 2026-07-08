import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './src/presentation/screens/LoginScreen';
import { HomeScreen } from './src/presentation/screens/HomeScreen';
import { NovoRegistroScreen } from './src/presentation/screens/NovoRegistroScreen';
import { DetalheRegistroScreen } from './src/presentation/screens/DetalheRegistroScreen';
import { PerfilScreen } from './src/presentation/screens/PerfilScreen';
import { storage } from './src/infra/storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, View, StyleSheet, Text, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/presentation/theme/ThemeProvider';
import './src/infra/i18n';
import i18n from './src/infra/i18n';
import { Cloud } from 'lucide-react-native';

LogBox.ignoreLogs([
  'Diagnostic error: [Sync] Server wants client to create record',
  '[Diagnostic error: [Sync] Server wants client to create record'
]);

const Stack = createNativeStackNavigator();


function MainApp() {
  const { t } = useTranslation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    // Restauramos a sessão pelo novo sistema (Keycloak Repository)
    storage.getSession().then(async sessionLegacy => {
      if (sessionLegacy?.language) i18n.changeLanguage(sessionLegacy.language);
      
      try {
        const { loadDynamicIp } = await import('./src/infra/auth/keycloak.config');
        await loadDynamicIp();

        const { KeycloakAuthRepository } = await import('./src/infra/auth/keycloak-auth.repository');
        const authRepo = new KeycloakAuthRepository();
        const session = await authRepo.restoreSession();
        
        // Ensure legacy session and new session match / clear if invalid token
        if (!session && sessionLegacy) {
          await storage.clearSession();
        }

        // Drop da base sqlite legada apenas se houver conflito de esquema no SQLiteAdapter 
        // mas o dev-client normalmente limpa quando rodamos no Android nativo limpando dados
        // ou recriando a versão

        setTimeout(() => {
          setInitialRoute(session && sessionLegacy?.user ? 'Home' : 'Login');
        }, 1500); // Simulate splash screen time
      } catch (error) {
        console.error('Error restoring session:', error);
        await storage.clearSession();
        setInitialRoute('Login');
      }
    });
  }, []);

  if (!initialRoute) {
    return (
      <SafeAreaView style={styles.splashContainer}>
        <View style={styles.logoWrapper}>
          <Cloud size={40} color={theme.colors.splashIconColor} />
        </View>
        <Text style={styles.splashTitle}>{t('nav.records')}</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.loadingText}>{t('nav.restoring')}</Text>
        </View>
        <Text style={styles.splashFooter}>{t('nav.dataSaved')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
    <StatusBar backgroundColor={theme.colors.surface} style={isDarkMode ? 'light' : 'dark'} />
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { ...theme.typography.header, color: theme.colors.text },
        headerShadowVisible: false,
        contentStyle: { borderTopWidth: 1, borderTopColor: theme.colors.border }
      }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="NovoRegistro" component={NovoRegistroScreen} options={{ title: t('nav.newRecord') }} />
        <Stack.Screen name="DetalheRegistro" component={DetalheRegistroScreen} options={{ title: t('nav.recordDetails') }} />
        <Stack.Screen name="Perfil" component={PerfilScreen} options={{ title: t('nav.profile') }} />
      </Stack.Navigator>
    </NavigationContainer>
    </>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: theme.colors.splashBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 76,
    height: 76,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  splashTitle: {
    ...theme.typography.title,
    fontSize: 22,
    color: '#FFF',
    marginBottom: 32,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    ...theme.typography.meta,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },
  splashFooter: {
    position: 'absolute',
    bottom: 40,
    ...theme.typography.footer,
    color: 'rgba(255,255,255,0.55)',
  }
});

export default function App() {
  return (
    <ThemeProvider>
      <MainApp />
    </ThemeProvider>
  );
}
