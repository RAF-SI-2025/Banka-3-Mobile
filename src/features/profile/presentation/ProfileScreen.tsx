import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { fmtDate } from '../../../shared/utils/formatters';
import { Client } from '../../../shared/types/models';
import { container } from '../../../core/di/container';

interface Props {
  onLogout: () => void;
  user: Client | null;
}

export default function ProfileScreen({ onLogout, user }: Props) {
  const [profileUser, setProfileUser] = useState<Client | null>(user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await container.authRepository.getCurrentUser();
        if (mounted) {
          setProfileUser(user);
        }
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Neuspesno ucitavanje profila.');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const resolvedUser = profileUser ?? user;
  const initials = useMemo(() => {
    const first = resolvedUser?.firstName?.trim()?.[0] ?? '';
    const last = resolvedUser?.lastName?.trim()?.[0] ?? '';
    return `${first}${last}`.toUpperCase() || 'K';
  }, [resolvedUser]);

  const fullName = resolvedUser ? `${resolvedUser.firstName} ${resolvedUser.lastName}`.trim() : 'Klijent';
  const profileRows = [
    { icon: 'person-outline' as const, label: 'Ime i prezime', value: fullName || '-' },
    { icon: 'mail-outline' as const, label: 'Email', value: resolvedUser?.email || '-' },
    { icon: 'call-outline' as const, label: 'Telefon', value: resolvedUser?.phone || '-' },
    { icon: 'location-outline' as const, label: 'Adresa', value: resolvedUser?.address || '-' },
    { icon: 'calendar-outline' as const, label: 'Datum rodjenja', value: resolvedUser?.dateOfBirth ? fmtDate(resolvedUser.dateOfBirth) : '-' },
    { icon: 'male-female-outline' as const, label: 'Pol', value: mapGender(resolvedUser?.gender) },
  ];

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Profil</Text>

      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{fullName || 'Klijent'}</Text>
        <Text style={styles.email}>{resolvedUser?.email || 'Email nije dostupan'}</Text>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Osvezavam podatke iz baze...</Text>
          </View>
        ) : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      <View style={styles.infoCard}>
        {profileRows.map(({ icon, label, value }, index) => (
          <View key={label} style={[styles.infoRow, index > 0 && styles.infoRowBorder]}>
            <Ionicons name={icon} size={18} color={C.textMuted} style={styles.infoIcon} />
            <View style={styles.flex1}>
              <Text style={styles.infoLabel}>{label}</Text>
              <Text style={styles.infoValue}>{value}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color={C.danger} />
        <Text style={styles.logoutText}>Odjavi se</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>Banka 2026 v1.0 • Racunarski fakultet</Text>
    </ScrollView>
  );
}

function mapGender(value?: string): string {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) {
    return '-';
  }
  if (normalized === 'male' || normalized === 'm') {
    return 'Muski';
  }
  if (normalized === 'female' || normalized === 'f') {
    return 'Zenski';
  }
  return value ?? '-';
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  flex1Center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  avatarCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 20, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { color: C.textPrimary, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  email: { color: C.textSecondary, fontSize: 13, marginTop: 4, textAlign: 'center' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  loadingText: { color: C.textSecondary, fontSize: 12 },
  errorText: { color: C.danger, fontSize: 12, marginTop: 12, textAlign: 'center' },
  infoCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 18 },
  infoRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  infoIcon: { marginRight: 14 },
  infoLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.dangerGlow, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  logoutText: { color: C.danger, fontSize: 15, fontWeight: '600' },
  footer: { textAlign: 'center', color: C.textMuted, fontSize: 11, marginTop: 24 },
});
