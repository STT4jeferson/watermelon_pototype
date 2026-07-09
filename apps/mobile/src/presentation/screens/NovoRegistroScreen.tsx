import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { ArrowDown, ArrowUp, Calendar, Clock, Camera, Image as ImageIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button } from '../components/Button';
import { PhotoThumb } from '../components/PhotoThumb';
import { useNavigation } from '@react-navigation/native';
import { useNetInfo } from '@react-native-community/netinfo';
import { ConnectionStatus } from '../components/ConnectionStatus';
import * as ImagePicker from 'expo-image-picker';
import { CreateRegistroUseCase } from '../../application/usecases/CreateRegistroUseCase';
import { WatermelonRegistroRepository } from '../../infrastructure/repositories/WatermelonRegistroRepository';
import { storage } from '../../infra/storage';

// Injeção de dependência manual (no futuro pode ir para um container)
const registroRepository = new WatermelonRegistroRepository();
const createRegistroUseCase = new CreateRegistroUseCase(registroRepository);

export function NovoRegistroScreen() {
  const { t } = useTranslation();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation<any>();
  const [type, setType] = useState<'Compra' | 'Venda' | null>(null);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const netInfo = useNetInfo();
  const isOnline = netInfo.isConnected !== false && netInfo.isInternetReachable !== false;

  

  const date = new Date().toLocaleDateString('pt-BR');
  const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const descValid = description.length >= 10;
  const isFormValid = type !== null && descValid;

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      alert("É necessário permissão para acessar a câmera!");
      return;
    }

    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhotos([...photos, result.assets[0].uri]);
    }
  };


  const handleSave = async () => {
    if (!isFormValid) return;
    setLoading(true);

    try {
      await createRegistroUseCase.execute({
        tipo: type!,
        descricao: description,
        fotos: photos
      });
      navigation.goBack();
    } catch (e) {
      console.error(e);
      // Aqui poderíamos ter um Toast de erro
    } finally {
      setLoading(false);
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => <ConnectionStatus status={isOnline ? 'online' : 'offline'} />
    });
  }, [navigation]);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('form.type')}</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity 
              style={[styles.typeCard, type === 'Compra' && styles.typeCardSelected]}
              onPress={() => setType('Compra')}
            >
              <ArrowDown size={20} color={type === 'Compra' ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={[styles.typeText, type === 'Compra' && styles.typeTextSelected]}>{t('form.purchase')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.typeCard, type === 'Venda' && styles.typeCardSelected]}
              onPress={() => setType('Venda')}
            >
              <ArrowUp size={20} color={type === 'Venda' ? theme.colors.primary : theme.colors.textSecondary} />
              <Text style={[styles.typeText, type === 'Venda' && styles.typeTextSelected]}>{t('form.sale')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('form.dateTime')}</Text>
          <View style={styles.dateTimeRow}>
            <View style={[styles.inputContainer, { flex: 1.3 }]}>
              <Calendar size={18} color={theme.colors.textSecondary} />
              <Text style={styles.inputText}>{date}</Text>
            </View>
            <View style={[styles.inputContainer, { flex: 1 }]}>
              <Clock size={18} color={theme.colors.textSecondary} />
              <Text style={styles.inputText}>{time}</Text>
            </View>
          </View>
          <Text style={styles.hint}>{t('form.dateHint')}</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('form.desc')}</Text>
          <TextInput 
            style={[styles.textarea, description.length > 0 && (descValid ? styles.inputValid : styles.inputError)]}
            multiline
            numberOfLines={4}
            placeholder={t('form.descPlaceholder')}
            placeholderTextColor={theme.colors.textMuted}
            value={description}
            onChangeText={setDescription}
            textAlignVertical="top"
          />
          <View style={styles.descFooter}>
            {description.length > 0 && !descValid ? (
              <Text style={styles.errorText}>{t('form.descError')}</Text>
            ) : description.length > 0 && descValid ? (
              <Text style={styles.validText}>{t('form.descValid')}</Text>
            ) : (
              <Text style={styles.hint}>{t('form.descHint')}</Text>
            )}
            <Text style={[styles.charCount, (!descValid && description.length > 0) && styles.charCountError]}>
              {description.length}/500
            </Text>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>{t('form.photos')}</Text>
          <View style={styles.photoActions}>
            <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
              <Camera size={18} color={theme.colors.primary} />
              <Text style={styles.photoBtnText}>{t('form.takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
              <ImageIcon size={18} color={theme.colors.primary} />
              <Text style={styles.photoBtnText}>{t('form.gallery')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>{t('form.photosHint')}</Text>
          
          <View style={styles.photosGrid}>
            {photos.map((uri, index) => (
              <PhotoThumb key={index} uri={uri} onRemove={() => setPhotos(photos.filter((_, i) => i !== index))} />
            ))}
            <PhotoThumb isAdd onPress={handlePickImage} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title={loading ? t('form.saving') : t('form.saveRecord')}
          onPress={handleSave}
          disabled={!isFormValid}
          loading={loading}
          style={styles.saveBtn}
        />
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: 18,
    gap: 18,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: theme.radius.card,
    height: 52,
    ...theme.shadows.card,
  },
  typeCardSelected: {
    backgroundColor: theme.colors.primarySoft,
    borderColor: theme.colors.primary,
  },
  typeText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  typeTextSelected: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.input,
    paddingHorizontal: 12,
    height: 52,
    gap: 8,
  },
  inputText: {
    ...theme.typography.body,
    color: theme.colors.text,
  },
  hint: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  textarea: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.radius.input,
    padding: 16,
    minHeight: 96,
    ...theme.typography.body,
    color: theme.colors.text,
  },
  inputValid: {
    borderColor: theme.colors.primary,
  },
  inputError: {
    borderColor: theme.colors.inputBorderError,
  },
  descFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validText: {
    ...theme.typography.meta,
    color: theme.colors.success,
  },
  errorText: {
    ...theme.typography.meta,
    color: theme.colors.error,
  },
  charCount: {
    ...theme.typography.meta,
    color: theme.colors.textSecondary,
  },
  charCountError: {
    color: theme.colors.error,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 12,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1,
    borderColor: '#B9D6D0',
    borderRadius: theme.radius.button,
  },
  photoBtnText: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  footer: {
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  saveBtn: {
    marginBottom: 16,
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  cancelBtnText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    fontWeight: '700',
  }
});
