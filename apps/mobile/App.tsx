import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './src/presentation/screens/LoginScreen';
import { HomeScreen } from './src/presentation/screens/HomeScreen';
import { NovoRegistroScreen } from './src/presentation/screens/NovoRegistroScreen';
import { DetalheRegistroScreen } from './src/presentation/screens/DetalheRegistroScreen';
import { storage } from './src/infra/storage';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { theme } from './src/presentation/theme';
import { Cloud } from 'lucide-react-native';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    storage.getSession().then(session => {
      setTimeout(() => {
        setInitialRoute(session?.token ? 'Home' : 'Login');
      }, 1500); // Simulate splash screen time
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.logoWrapper}>
          <Cloud size={40} color="#FFF" />
        </View>
        <Text style={styles.splashTitle}>Registros</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FFF" />
          <Text style={styles.loadingText}>Restaurando sua sessão…</Text>
        </View>
        <Text style={styles.splashFooter}>Seus dados ficam salvos neste dispositivo</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { ...theme.typography.header },
        headerShadowVisible: false,
      }}>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="NovoRegistro" component={NovoRegistroScreen} options={{ title: 'Novo registro' }} />
        <Stack.Screen name="DetalheRegistro" component={DetalheRegistroScreen} options={{ title: 'Detalhe do registro' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: theme.colors.primary,
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
