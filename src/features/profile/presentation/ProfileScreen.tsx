import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { MOCK_USER } from '../../../shared/data/mockData';

interface Props { onLogout: () => void; }

export default function ProfileScreen({ onLogout }: Props) {
  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Profil</Text>

      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{MOCK_USER.firstName[0]}{MOCK_USER.lastName[0]}</Text>
        </View>
        <Text style={styles.name}>{MOCK_USER.firstName} {MOCK_USER.lastName}</Text>
        <Text style={styles.email}>{MOCK_USER.email}</Text>
      </View>

      <View style={styles.infoCard}>
        {[
          { icon: 'person-outline' as const, label: 'Ime i prezime', value: `${MOCK_USER.firstName} ${MOCK_USER.lastName}` },
          { icon: 'mail-outline' as const, label: 'Email', value: MOCK_USER.email },
          { icon: 'call-outline' as const, label: 'Telefon', value: MOCK_USER.phone },
          { icon: 'location-outline' as const, label: 'Adresa', value: MOCK_USER.address },
        ].map(({ icon, label, value }, i) => (
          <View key={label} style={[styles.infoRow, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
            <Ionicons name={icon} size={18} color={C.textMuted} style={{ marginRight: 14 }} />
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

      <Text style={styles.footer}>Banka 2026 v1.0 • Računarski fakultet</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  title: { color: C.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  avatarCard: { backgroundColor: C.bgCard, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: C.border, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 20, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 14, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 8 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  email: { color: C.textSecondary, fontSize: 13, marginTop: 4 },
  infoCard: { backgroundColor: C.bgCard, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 14, paddingHorizontal: 18 },
  infoLabel: { color: C.textMuted, fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { color: C.textPrimary, fontSize: 14, fontWeight: '500', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.dangerGlow, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },
  logoutText: { color: C.danger, fontSize: 15, fontWeight: '600' },
  footer: { textAlign: 'center', color: C.textMuted, fontSize: 11, marginTop: 24 },
});
