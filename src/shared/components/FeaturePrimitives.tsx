import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../constants/theme';

type StatusBadgeProps = {
  color: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

export function StatusBadge({ color, bg, icon, label }: StatusBadgeProps) {
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[styles.statusText, { color }]}>{label}</Text>
    </View>
  );
}

type FeatureHeaderProps = {
  title: string;
  onBack: () => void;
};

export function FeatureHeader({ title, onBack }: FeatureHeaderProps) {
  return (
    <View style={styles.hRow}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

type ScreenStateProps = {
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  title?: string;
  onBack?: () => void;
};

export function ScreenState({ loading, error, emptyMessage, title, onBack }: ScreenStateProps) {
  const header = title && onBack ? <FeatureHeader title={title} onBack={onBack} /> : null;

  if (loading) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: C.bg, padding: 20 }]}>
        {header}
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: C.bg, padding: 20 }]}>
        {header}
        <View style={styles.centerFill}>
          <Text style={styles.helperText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (emptyMessage) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: C.bg, padding: 20 }]}>
        {header}
        <View style={styles.centerFill}>
          <Text style={styles.helperText}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  fullScreen: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.bgCard,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  helperText: { color: C.textSecondary, fontSize: 14, textAlign: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '600' },
});
