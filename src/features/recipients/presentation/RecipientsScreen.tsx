import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { MOCK_RECIPIENTS } from '../../../shared/data/mockData';
import { compareByNameThenAccount } from '../../../shared/utils/recipientOrder';

interface Props { onBack: () => void; }

type Recipient = { id: number; name: string; account: string };

export default function RecipientsScreen({ onBack }: Props) {
  const [recipients, setRecipients] = useState<Recipient[]>([...MOCK_RECIPIENTS]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDelete, setShowDelete] = useState<number | null>(null);

  const openAdd = () => { setEditingId(null); setFormName(''); setFormAccount(''); setErrors({}); setShowForm(true); };
  const openEdit = (r: Recipient) => { setEditingId(r.id); setFormName(r.name); setFormAccount(r.account); setErrors({}); setShowForm(true); };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formName.trim()) e.name = 'Unesite naziv';
    if (!formAccount.trim()) e.account = 'Unesite broj računa';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editingId) {
      setRecipients(prev => prev.map(r => r.id === editingId ? { ...r, name: formName.trim(), account: formAccount.trim() } : r));
    } else {
      const newId = Math.max(...recipients.map(r => r.id), 0) + 1;
      setRecipients(prev => [...prev, { id: newId, name: formName.trim(), account: formAccount.trim() }]);
    }
    setShowForm(false);
  };

  const handleDelete = (id: number) => {
    setRecipients(prev => prev.filter(r => r.id !== id));
    setShowDelete(null);
  };

  const sortedRecipients = [...recipients].sort((a, b) => compareByNameThenAccount(a, b, r => r.name, r => r.account));

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.hRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}><Ionicons name="chevron-back" size={20} color={C.textSecondary} /></TouchableOpacity>
        <Text style={styles.title}>Primaoci plaćanja</Text>
      </View>

      {/* Add button */}
      <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addText}>Dodaj primaoca</Text>
      </TouchableOpacity>

      {/* Recipients list */}
      {sortedRecipients.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={48} color={C.textMuted} />
          <Text style={styles.emptyText}>Nemate sačuvane primaoce</Text>
        </View>
      ) : sortedRecipients.map(r => (
        <View key={r.id} style={styles.recipientRow}>
          <View style={styles.recipientIcon}><Ionicons name="person" size={18} color={C.primary} /></View>
          <View style={styles.flex1}>
            <Text style={styles.recipientName}>{r.name}</Text>
            <Text style={styles.recipientAcc}>{r.account}</Text>
          </View>
          <View style={styles.recipientActions}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(r)}>
              <Ionicons name="create-outline" size={18} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setShowDelete(r.id)}>
              <Ionicons name="trash-outline" size={18} color={C.danger} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Add/Edit Modal */}
      <Modal visible={showForm} transparent animationType="slide">
        <View style={styles.mOverlay}>
          <View style={styles.mSheet}>
            <View style={styles.mHead}>
              <Text style={styles.mTitle}>{editingId ? 'Izmeni primaoca' : 'Novi primalac'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity>
            </View>

            <Text style={styles.label}>NAZIV PRIMAOCA</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={formName} onChangeText={setFormName}
                placeholder="Ime ili naziv" placeholderTextColor={C.textMuted} />
            </View>
            {errors.name && <Text style={styles.errText}>{errors.name}</Text>}

            <Text style={[styles.label, { marginTop: 16 }]}>BROJ RAČUNA</Text>
            <View style={styles.inputWrap}>
              <TextInput style={styles.input} value={formAccount} onChangeText={setFormAccount}
                placeholder="000-0000000000000-00" placeholderTextColor={C.textMuted} keyboardType="numeric" />
            </View>
            {errors.account && <Text style={styles.errText}>{errors.account}</Text>}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.secBtnText}>Poništi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1.5 }]} onPress={handleSave}>
                <Text style={styles.primaryBtnText}>{editingId ? 'Sačuvaj' : 'Dodaj'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation */}
      <Modal visible={showDelete !== null} transparent animationType="fade">
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteCard}>
            <Ionicons name="trash" size={40} color={C.danger} style={{ alignSelf: 'center', marginBottom: 16 }} />
            <Text style={styles.deleteTitle}>Obriši primaoca?</Text>
            <Text style={styles.deleteSub}>
              {sortedRecipients.find(r => r.id === showDelete)?.name || ''} će biti uklonjen iz liste primaoca.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setShowDelete(null)}>
                <Text style={styles.secBtnText}>Otkaži</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, backgroundColor: C.danger }]}
                onPress={() => handleDelete(showDelete!)}>
                <Text style={styles.primaryBtnText}>Obriši</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  hRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  title: { color: C.textPrimary, fontSize: 20, fontWeight: '700' },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  errText: { color: C.danger, fontSize: 12, marginTop: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, padding: 14, marginBottom: 20, shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  addText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: C.textMuted, fontSize: 14, marginTop: 12 },
  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bgCard, borderRadius: 16, padding: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: C.border, marginBottom: 8 },
  recipientIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primarySoft, justifyContent: 'center', alignItems: 'center' },
  recipientName: { color: C.textPrimary, fontSize: 14, fontWeight: '600' },
  recipientAcc: { color: C.textMuted, fontSize: 12, marginTop: 2 },
  recipientActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  secBtn: { flex: 1, backgroundColor: C.bgCard, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  secBtnText: { color: C.textSecondary, fontSize: 15, fontWeight: '600' },
  mOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  mSheet: { backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  mHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  mTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700' },
  deleteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
  deleteCard: { backgroundColor: C.bgCard, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: C.border },
  deleteTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  deleteSub: { color: C.textSecondary, fontSize: 13, textAlign: 'center' },
});
