import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/theme';
import { getCurrentDateStr } from '../../utils/helpers';

export default function DailyLogModal({ visible, onClose, tasks }) {
  const today = getCurrentDateStr();
  const completedToday = tasks.filter(t => t.completed && t.lastCompletedDate === today);

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Today's Log</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>Tasks completed: {completedToday.length}</Text>
          <ScrollView style={{maxHeight: 400}}>
            {completedToday.length === 0 ? (
              <Text style={{color: COLORS.textDim, textAlign: 'center', marginTop: 20}}>No tasks completed today yet.</Text>
            ) : (
              completedToday.map(t => (
                <View key={t.id} style={styles.logItem}>
                  <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.secondary} />
                  <Text style={styles.logText}>{t.text}</Text>
                  <Text style={styles.logPoints}>+{t.reward} XP</Text>
                </View>
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={styles.closeModalBtn} onPress={onClose}>
            <Text style={styles.closeModalText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: COLORS.card, borderRadius: 20, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  modalSubtitle: { color: COLORS.textDim, marginBottom: 10 },
  logItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#333' },
  logText: { flex: 1, color: 'white', marginLeft: 10 },
  logPoints: { color: COLORS.secondary, fontWeight: 'bold' },
  closeModalBtn: { backgroundColor: COLORS.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  closeModalText: { color: 'white', fontWeight: 'bold' }
});