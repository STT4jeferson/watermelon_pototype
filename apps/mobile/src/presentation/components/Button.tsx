import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'disabled';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  sublabel?: string;
  style?: any;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled, icon, sublabel, style }: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isDisabled = disabled || variant === 'disabled';

  const containerStyle = [
    styles.container,
    isPrimary && styles.primary,
    isSecondary && styles.secondary,
    isDisabled && styles.disabled,
    style,
  ];

  const textStyle = [
    styles.text,
    isPrimary && styles.textPrimary,
    isSecondary && styles.textSecondary,
    isDisabled && styles.textDisabled,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? theme.colors.surface : theme.colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <View style={styles.textContainer}>
             <Text style={textStyle}>{title}</Text>
             {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 52,
    borderRadius: theme.radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.s4,
    minWidth: 48,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: theme.spacing.s2,
  },
  textContainer: {
    alignItems: 'center',
  },
  primary: {
    backgroundColor: theme.colors.primary,
    ...theme.shadows.button,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#B9D6D0',
  },
  disabled: {
    backgroundColor: theme.colors.disabledBtnBg,
  },
  text: {
    ...theme.typography.body,
    fontWeight: '700',
  },
  textPrimary: {
    color: theme.colors.surface,
  },
  textSecondary: {
    color: theme.colors.primary,
  },
  textDisabled: {
    color: theme.colors.disabledBtnText,
  },
  sublabel: {
    fontSize: 10,
    fontWeight: '500',
    color: theme.colors.disabledBtnText,
    marginTop: 2,
  },
});
