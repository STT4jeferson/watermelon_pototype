import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cloud } from 'lucide-react-native';
import { Button } from './Button';
import { theme } from '../theme';

export function EmptyState({ onAction }: { onAction: () => void }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Cloud size={32} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>Nenhum registro ainda</Text>
      <Text style={styles.text}>
        Crie seu primeiro registro de compra ou venda. Ele ficará salvo mesmo sem internet.
      </Text>
      <Button title="Novo registro" onPress={onAction} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.s5,
    marginTop: 40,
  },
  iconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.s4,
  },
  title: {
    ...theme.typography.title,
    fontSize: 18,
    marginBottom: theme.spacing.s2,
    textAlign: 'center',
    color: theme.colors.text,
  },
  text: {
    ...theme.typography.body,
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.s6,
  },
  button: {
    width: '100%',
  }
});
