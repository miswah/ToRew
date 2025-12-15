import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS, CONSTANTS } from '../constants/theme';
import { useGame } from '../context/GameContext';

const DaySelector = ({ selectedDays, toggleDay }) => (
  <View style={styles.daySelector}>
    {CONSTANTS.DAYS.map((day, index) => {
      const isSelected = selectedDays.includes(index);
      return (
        <TouchableOpacity key={index} style={[styles.dayCircle, isSelected && styles.dayCircleActive]} onPress={() => toggleDay(index)}>
          <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export default function TasksScreen() {
  const { tasks, addTask, toggleTask, deleteTask } = useGame();
  const [taskInput, setTaskInput] = useState('');
  const [dueTimeStr, setDueTimeStr] = useState('');
  const [taskPenalty, setTaskPenalty] = useState('');
  const [taskReward, setTaskReward] = useState('');
  const [selectedRepeatDays, setSelectedRepeatDays] = useState([]);
  const [showTaskOptions, setShowTaskOptions] = useState(false);

  const handleAdd = () => {
    if (!taskInput.trim()) return;
    let dueMins = null;
    if (dueTimeStr.includes(':')) {
        const [h, m] = dueTimeStr.split(':').map(Number);
        if (!isNaN(h) && !isNaN(m)) dueMins = h * 60 + m;
    }
    addTask({
        id: Date.now().toString(), text: taskInput, dueTimeMins: dueMins, dueDisplay: dueTimeStr,
        penalty: parseInt(taskPenalty) || 0, reward: parseInt(taskReward) || 10, repeatDays: selectedRepeatDays,
        streak: 0, completed: false, failed: false, lastCompletedDate: null
    });
    setTaskInput(''); setDueTimeStr(''); setTaskPenalty(''); setTaskReward(''); setSelectedRepeatDays([]); setShowTaskOptions(false);
  };

  const renderItem = ({ item }) => {
    const todayIndex = new Date().getDay();
    if (item.repeatDays.length > 0 && !item.repeatDays.includes(todayIndex)) return null;
    return (
      <View style={[styles.card, item.failed && styles.cardFailed]}>
        <TouchableOpacity onPress={() => toggleTask(item.id)} disabled={item.failed} style={styles.checkboxContainer}>
          <MaterialCommunityIcons name={item.failed ? "close-box" : (item.completed ? "checkbox-marked" : "checkbox-blank-outline")} size={24} color={item.failed ? COLORS.danger : (item.completed ? COLORS.secondary : COLORS.textDim)} />
        </TouchableOpacity>
        <View style={{flex: 1}}>
          <View style={styles.titleRow}>
            <Text style={[styles.cardText, item.completed && styles.strikethrough]}>{item.text}</Text>
            {item.repeatDays.length > 0 && <View style={styles.streakBadge}><MaterialCommunityIcons name="fire" size={14} color={COLORS.orange} /><Text style={styles.streakText}>{item.streak}</Text></View>}
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, {color: COLORS.secondary}]}>{item.reward} XP</Text>
            {item.dueDisplay ? <Text style={[styles.metaText, { marginLeft: 10, color: COLORS.gold }]}>{item.dueDisplay}</Text> : null}
          </View>
        </View>
        <TouchableOpacity onPress={() => deleteTask(item.id)}><MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.textDim} /></TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="New Quest..." placeholderTextColor={COLORS.textDim} value={taskInput} onChangeText={setTaskInput} />
          <TouchableOpacity style={styles.optionsToggle} onPress={() => setShowTaskOptions(!showTaskOptions)}>
              <MaterialCommunityIcons name={showTaskOptions ? "chevron-up" : "chevron-down"} size={24} color={COLORS.textDim} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
            <MaterialCommunityIcons name="plus" size={24} color="white" />
          </TouchableOpacity>
        </View>
        {showTaskOptions && (
          <View style={styles.optionsContainer}>
            <Text style={styles.sectionLabel}>Repeat On:</Text>
            <DaySelector selectedDays={selectedRepeatDays} toggleDay={(d) => setSelectedRepeatDays(p => p.includes(d) ? p.filter(x => x !== d) : [...p, d])} />
            <View style={styles.extraRow}>
              <TextInput style={styles.inputSmall} placeholder="Due (HH:MM)" placeholderTextColor={COLORS.textDim} value={dueTimeStr} onChangeText={setDueTimeStr} maxLength={5} />
              <TextInput style={styles.inputSmall} placeholder="Penalty" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={taskPenalty} onChangeText={setTaskPenalty} />
              <TextInput style={styles.inputSmall} placeholder="Reward" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={taskReward} onChangeText={setTaskReward} />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
      <FlatList data={tasks} keyExtractor={item => item.id} contentContainerStyle={{ paddingBottom: 100 }} renderItem={renderItem} />
    </View>
  );
}

// Add Component Specific Styles
const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  input: { flex: 1, backgroundColor: COLORS.card, color: 'white', padding: 15, borderRadius: 10 },
  addButton: { backgroundColor: COLORS.secondary, width: 50, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  optionsToggle: { padding: 10 },
  optionsContainer: { backgroundColor: '#252525', padding: 15, borderRadius: 10, marginBottom: 20 },
  sectionLabel: { color: COLORS.textDim, marginBottom: 10, fontSize: 12, fontWeight: 'bold' },
  extraRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  inputSmall: { flex: 1, backgroundColor: '#1a1a1a', color: 'white', padding: 10, borderRadius: 8, marginHorizontal: 2, textAlign: 'center' },
  daySelector: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCircle: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  dayCircleActive: { backgroundColor: COLORS.primary },
  dayText: { color: COLORS.textDim, fontSize: 12 },
  dayTextActive: { color: 'white', fontWeight: 'bold' },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  cardFailed: { borderColor: COLORS.danger, borderWidth: 1 },
  checkboxContainer: { marginRight: 15 },
  cardText: { color: 'white', fontSize: 16, fontWeight: '500' },
  strikethrough: { textDecorationLine: 'line-through', color: COLORS.textDim },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#332200', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  streakText: { color: COLORS.gold, fontSize: 12, fontWeight: 'bold', marginLeft: 2 },
  metaRow: { flexDirection: 'row', marginTop: 4 },
  metaText: { fontSize: 12, color: COLORS.textDim },
});