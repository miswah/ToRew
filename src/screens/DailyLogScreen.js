import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { useGame } from '../context/GameContext';
import { getCurrentDateStr } from '../utils/helpers';

export default function DailyLogScreen() {
  const { addLog, logs, deleteLog } = useGame();
  
  // Form State
  const [learned, setLearned] = useState('');
  const [missed, setMissed] = useState('');
  const [notes, setNotes] = useState('');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const handleSave = () => {
    if (!learned.trim() && !missed.trim() && !notes.trim()) return;

    const entry = {
      id: Date.now().toString(),
      date: getCurrentDateStr(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      learned,
      missed,
      notes
    };

    addLog(entry);
    setLearned('');
    setMissed('');
    setNotes('');
  };

  const renderLogItem = ({ item }) => {
    const isExpanded = expandedLogId === item.id;
    
    return (
      <TouchableOpacity 
        style={styles.logCard} 
        onPress={() => setExpandedLogId(isExpanded ? null : item.id)}
        activeOpacity={0.9}
      >
        <View style={styles.logHeader}>
          <View>
            <Text style={styles.logDate}>{item.date}</Text>
            <Text style={styles.logTime}>{item.timestamp}</Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <MaterialCommunityIcons name={isExpanded ? "chevron-up" : "chevron-down"} size={24} color={COLORS.textDim} />
            {isExpanded && (
               <TouchableOpacity onPress={() => deleteLog(item.id)} style={{marginLeft: 15}}>
                 <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.danger} />
               </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Preview Line if collapsed */}
        {!isExpanded && (
            <Text style={styles.previewText} numberOfLines={1}>
                {item.learned || item.notes || item.missed}
            </Text>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <View style={styles.logContent}>
            {item.learned ? (
                <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionTitle, { color: COLORS.secondary }]}>
                        <MaterialCommunityIcons name="check-circle-outline" size={14} /> Learned / Wins
                    </Text>
                    <Text style={styles.sectionBody}>{item.learned}</Text>
                </View>
            ) : null}

            {item.missed ? (
                <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionTitle, { color: COLORS.danger }]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={14} /> Missed / Losses
                    </Text>
                    <Text style={styles.sectionBody}>{item.missed}</Text>
                </View>
            ) : null}

            {item.notes ? (
                <View style={styles.sectionBlock}>
                    <Text style={[styles.sectionTitle, { color: COLORS.blue }]}>
                        <MaterialCommunityIcons name="notebook-outline" size={14} /> Thoughts
                    </Text>
                    <Text style={styles.sectionBody}>{item.notes}</Text>
                </View>
            ) : null}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* INPUT SECTION */}
        <View style={styles.formContainer}>
          <Text style={styles.headerTitle}>Daily Journal (+5 XP)</Text>
          
          <Text style={styles.label}>What did you learn today?</Text>
          <TextInput 
            style={styles.input} 
            placeholder="New skill, completed task..." 
            placeholderTextColor={COLORS.textDim}
            value={learned}
            onChangeText={setLearned}
            multiline
          />

          <Text style={styles.label}>What did you miss?</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Distractions, skipped habits..." 
            placeholderTextColor={COLORS.textDim}
            value={missed}
            onChangeText={setMissed}
            multiline
          />

          <Text style={styles.label}>Other Notes</Text>
          <TextInput 
            style={[styles.input, { minHeight: 60 }]} 
            placeholder="Mood, ideas, rant..." 
            placeholderTextColor={COLORS.textDim}
            value={notes}
            onChangeText={setNotes}
            multiline
          />

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
        </View>

        {/* HISTORY SECTION */}
        <Text style={styles.historyHeader}>Past Entries</Text>
        <FlatList
          data={logs}
          keyExtractor={item => item.id}
          renderItem={renderLogItem}
          scrollEnabled={false} // Since we are inside a ScrollView
        />

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  formContainer: {
    backgroundColor: '#252525',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  headerTitle: {
    color: COLORS.gold,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    textTransform: 'uppercase'
  },
  label: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    backgroundColor: COLORS.card,
    color: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 40,
    textAlignVertical: 'top' // Android fix for multiline
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  historyHeader: {
    color: COLORS.textDim,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  
  // Log Item Styles
  logCard: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logDate: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  logTime: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  previewText: {
    color: COLORS.textDim,
    marginTop: 5,
    fontSize: 12,
    fontStyle: 'italic'
  },
  logContent: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 10,
  },
  sectionBlock: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  sectionBody: {
    color: '#ddd',
    fontSize: 14,
    lineHeight: 20,
  }
});