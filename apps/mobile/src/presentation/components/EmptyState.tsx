import { useTranslation } from 'react-i18next';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FileText, Plus } from 'lucide-react-native';
import { Button } from './Button';
import { useTheme } from '../theme/ThemeProvider';

export function EmptyState({ onAction }: { onAction: () => void }) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <FileText size={32} color={theme.colors.primary} />
      </View>
      <Text style={styles.title}>{t('components.emptyTitle')}</Text>
      <Text style={styles.text}>
        {t('components.emptySub')}
      </Text>
      <Button title={t('nav.newRecord')} icon={<Plus size={20} color="#FFF" />} onPress={onAction} style={styles.button} />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.s5,
    marginTop: 0,
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
    alignSelf: 'center',
  }
});
