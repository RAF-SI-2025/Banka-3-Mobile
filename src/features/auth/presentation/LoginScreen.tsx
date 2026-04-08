import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';

export default function LoginScreen({ onLogin }: { onLogin: (email: string, password: string) => Promise<boolean> }) {
  const [email, setEmail] = useState('petar@primer.raf');
  const [password, setPassword] = useState('Test1234!');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: false }).start();
  }, []);

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password.trim()) { setError('Unesite email i lozinku'); return; }
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err.message || 'Greška pri prijavi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: C.bg }]}>
      <Animated.View style={[styles.flex1, styles.container, { opacity: fadeAnim }]}>
        <View style={styles.logoWrap}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={styles.logoTitle}>Banka</Text>
          <Text style={styles.logoSub}>Prijavite se na vaš nalog</Text>
        </View>

        <Text style={styles.label}>EMAIL</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="person-outline" size={18} color={C.textMuted} style={{ marginLeft: 14 }} />
          <TextInput style={styles.input} value={email} onChangeText={setEmail}
            placeholder="vas@email.com" placeholderTextColor={C.textMuted}
            keyboardType="email-address" autoCapitalize="none" />
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>LOZINKA</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="lock-closed-outline" size={18} color={C.textMuted} style={{ marginLeft: 14 }} />
          <TextInput style={[styles.input, { paddingRight: 48 }]} value={password}
            onChangeText={setPassword} placeholder="••••••••" placeholderTextColor={C.textMuted}
            secureTextEntry={!showPw} onSubmitEditing={handleLogin} />
          <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
            <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.textMuted} />
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity style={[styles.loginBtn, loading && { opacity: 0.6 }]}
          onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
          {loading ? (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={styles.loginBtnText}>  Prijavljivanje...</Text>
            </View>
          ) : <Text style={styles.loginBtnText}>Prijavi se</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }}>
          <Text style={{ color: C.primary, fontSize: 13, fontWeight: '500' }}>Zaboravili ste lozinku?</Text>
        </TouchableOpacity>

        <View style={styles.flex1} />
        <Text style={styles.footer}>Banka 2026 • Računarski fakultet</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  container: { padding: 24 },
  logoWrap: { alignItems: 'center', marginTop: 48, marginBottom: 48 },
  logoBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  logoTitle: { color: C.textPrimary, fontSize: 26, fontWeight: '700' },
  logoSub: { color: C.textSecondary, fontSize: 14, marginTop: 6 },
  label: { color: C.textSecondary, fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14, paddingLeft: 12 },
  eyeBtn: { position: 'absolute', right: 14 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.dangerGlow, borderRadius: 10, padding: 12, marginTop: 12 },
  errorText: { color: C.danger, fontSize: 13 },
  loginBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { textAlign: 'center', color: C.textMuted, fontSize: 11 },
});