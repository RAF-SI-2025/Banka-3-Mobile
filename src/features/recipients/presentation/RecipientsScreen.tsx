import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C } from '../../../shared/constants/theme';
import { compareByNameThenAccount } from '../../../shared/utils/recipientOrder';
import { useRecipients } from '../../../shared/hooks/useFeatures';
import { PaymentRecipient } from '../../../shared/types/models';
import { FeatureHeader, ScreenState } from '../../../shared/components/FeaturePrimitives';

interface Props {
  onBack: () => void;
}

export default function RecipientsScreen({ onBack }: Props) {
  const { state, actions } = useRecipients();
  const recipients = useMemo(
    () => [...(state.data ?? [])].sort((a, b) => compareByNameThenAccount(a, b, item => item.name, item => item.accountNumber)),
    [state.data]
  );

  const [showForm, setShowForm] = useState(false);
  const [editingRecipient, setEditingRecipient] = useState<PaymentRecipient | null>(null);
  const [formName, setFormName] = useState('');
  const [formAccount, setFormAccount] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDelete, setShowDelete] = useState<PaymentRecipient | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const openAdd = () => {
    setEditingRecipient(null);
    setFormName('');
    setFormAccount('');
    setErrors({});
    setActionError(null);
    setShowForm(true);
  };

  const openEdit = (recipient: PaymentRecipient) => {
    setEditingRecipient(recipient);
    setFormName(recipient.name);
    setFormAccount(recipient.accountNumber);
    setErrors({});
    setActionError(null);
    setShowForm(true);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};
    const normalizedAccount = formAccount.replace(/\D/g, '');
    if (!formName.trim()) {
      nextErrors.name = 'Unesite naziv primaoca';
    }
    if (!formAccount.trim()) {
      nextErrors.account = 'Unesite broj racuna';
    } else if (normalizedAccount.length !== 18) {
      nextErrors.account = 'Broj racuna mora imati tacno 18 cifara';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      if (editingRecipient) {
        await actions.update(editingRecipient.id, formName.trim(), formAccount.trim());
      } else {
        await actions.add(formName.trim(), formAccount.trim());
      }
      setShowForm(false);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Neuspesno cuvanje primaoca.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!showDelete) {
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await actions.remove(showDelete.id);
      setShowDelete(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Neuspesno brisanje primaoca.');
    } finally {
      setSubmitting(false);
    }
  };

  if (state.loading && recipients.length === 0) {
    return <ScreenState title="Primaoci placanja" onBack={onBack} loading />;
  }

  if (state.error && recipients.length === 0) {
    return <ScreenState title="Primaoci placanja" onBack={onBack} error={state.error} />;
  }

  return (
    <ScrollView style={styles.flex1} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <FeatureHeader title="Primaoci placanja" onBack={onBack} />

      <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addText}>Dodaj primaoca</Text>
      </TouchableOpacity>

      {state.error ? <Text style={styles.inlineError}>{state.error}</Text> : null}

      {recipients.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="people-outline" size={48} color={C.textMuted} />
          <Text style={styles.emptyText}>Nemate sacuvane primaoce.</Text>
        </View>
      ) : (
        recipients.map(recipient => (
          <View key={recipient.id} style={styles.recipientRow}>
            <View style={styles.recipientIcon}>
              <Ionicons name="person" size={18} color={C.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={styles.recipientName}>{recipient.name}</Text>
              <Text style={styles.recipientAcc}>{recipient.accountNumber}</Text>
            </View>
            <View style={styles.recipientActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(recipient)}>
                <Ionicons name="create-outline" size={18} color={C.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowDelete(recipient)}>
                <Ionicons name="trash-outline" size={18} color={C.danger} />
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      <Modal visible={showForm} transparent animationType="slide" onRequestClose={() => setShowForm(false)}>
        <View style={styles.mOverlay}>
          <View style={styles.mSheet}>
            <View style={styles.mHead}>
              <Text style={styles.mTitle}>{editingRecipient ? 'Izmeni primaoca' : 'Novi primalac'}</Text>
              <TouchableOpacity onPress={() => setShowForm(false)} disabled={submitting}>
                <Ionicons name="close" size={24} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>NAZIV PRIMAOCA</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={formName}
                onChangeText={setFormName}
                placeholder="Ime ili naziv"
                placeholderTextColor={C.textMuted}
              />
            </View>
            {errors.name ? <Text style={styles.errText}>{errors.name}</Text> : null}

            <Text style={[styles.label, { marginTop: 16 }]}>BROJ RACUNA</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={formAccount}
                onChangeText={setFormAccount}
                placeholder="333000112345678910"
                placeholderTextColor={C.textMuted}
              />
            </View>
            <Text style={styles.accountHint}>Unesite tacno 18 cifara. Crtice i razmaci su dozvoljeni.</Text>
            {errors.account ? <Text style={styles.errText}>{errors.account}</Text> : null}
            {actionError ? <Text style={styles.errText}>{actionError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setShowForm(false)} disabled={submitting}>
                <Text style={styles.secBtnText}>Ponisti</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1.5 }]} onPress={handleSave} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>{editingRecipient ? 'Sacuvaj' : 'Dodaj'}</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showDelete !== null} transparent animationType="fade" onRequestClose={() => setShowDelete(null)}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteCard}>
            <Ionicons name="trash" size={40} color={C.danger} style={styles.deleteIcon} />
            <Text style={styles.deleteTitle}>Obrisi primaoca?</Text>
            <Text style={styles.deleteSub}>
              {showDelete?.name ?? ''} ce biti uklonjen iz liste primaoca.
            </Text>
            {actionError ? <Text style={styles.errText}>{actionError}</Text> : null}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secBtn} onPress={() => setShowDelete(null)} disabled={submitting}>
                <Text style={styles.secBtnText}>Otkazi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, styles.deleteBtn]} onPress={handleDelete} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Obrisi</Text>}
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
  flex1Centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  label: { color: C.textSecondary, fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 8 },
  inputWrap: { backgroundColor: C.bgInput, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, color: C.textPrimary, fontSize: 15, padding: 14 },
  accountHint: { color: C.textMuted, fontSize: 11, marginTop: 6, marginLeft: 4 },
  errText: { color: C.danger, fontSize: 12, marginTop: 4 },
  inlineError: { color: C.danger, fontSize: 12, marginBottom: 12 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, borderRadius: 14, padding: 14, marginBottom: 20 },
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
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  deleteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 24 },
  deleteCard: { backgroundColor: C.bgCard, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: C.border },
  deleteIcon: { alignSelf: 'center', marginBottom: 16 },
  deleteTitle: { color: C.textPrimary, fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  deleteSub: { color: C.textSecondary, fontSize: 13, textAlign: 'center' },
  deleteBtn: { flex: 1, backgroundColor: C.danger },
});
