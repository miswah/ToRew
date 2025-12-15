import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DailyLogModal from '../components/common/DailyLogModal';
import { COLORS } from '../constants/theme';
import { useGame } from '../context/GameContext';

export default function ChallengesScreen() {
  const { challenges, tasks, addChallenge, toggleChallenge, deleteChallenge } = useGame();
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengePoints, setChallengePoints] = useState('');
  const [challengeType, setChallengeType] = useState('daily');
  const [showLogModal, setShowLogModal] = useState(false);

  const handleAdd = () => {
    if (!challengeTitle.trim()) return;
    addChallenge({
        id: Date.now().toString(), title: challengeTitle, reward: parseInt(challengePoints) || 50,
        type: challengeType, streak: 0, completed: false, lastCompletedDate: null, lastCompletedWeek: null
    });
    setChallengeTitle(''); setChallengePoints('');
  };

  return (
    <ScrollView contentContainerStyle={{paddingBottom: 100}}>
        <DailyLogModal visible={showLogModal} onClose={() => setShowLogModal(false)} tasks={tasks} />
        
        <TouchableOpacity style={styles.logButton} onPress={() => setShowLogModal(true)}>
            <MaterialCommunityIcons name="history" size={20} color="white" />
            <Text style={styles.logButtonText}>View Today's Completed Tasks</Text>
        </TouchableOpacity>

        <View style={styles.inputRow}>
            <TextInput style={[styles.input, {flex: 2}]} placeholder="New Challenge" placeholderTextColor={COLORS.textDim} value={challengeTitle} onChangeText={setChallengeTitle} />
            <TextInput style={[styles.input, {flex: 1, marginLeft: 5}]} placeholder="XP" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={challengePoints} onChangeText={setChallengePoints} />
            <TouchableOpacity style={[styles.addButton, {marginLeft: 5}]} onPress={handleAdd}>
                <MaterialCommunityIcons name="plus" size={24} color="white" />
            </TouchableOpacity>
        </View>
        <View style={styles.typeSelector}>
            <TouchableOpacity onPress={() => setChallengeType('daily')} style={[styles.typeBtn, challengeType === 'daily' && styles.typeBtnActive]}>
                <Text style={styles.typeText}>Daily</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setChallengeType('weekly')} style={[styles.typeBtn, challengeType === 'weekly' && styles.typeBtnActive]}>
                <Text style={styles.typeText}>Weekly</Text>
            </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Active</Text>
        {challenges.filter(c => !c.completed).map(item => (
            <View key={item.id} style={[styles.card, { borderColor: item.type === 'weekly' ? COLORS.gold : COLORS.blue, borderWidth: 1 }]}>
                <TouchableOpacity onPress={() => toggleChallenge(item.id)} style={styles.checkboxContainer}>
                    <MaterialCommunityIcons name="trophy-outline" size={24} color={COLORS.textDim} />
                </TouchableOpacity>
                <View style={{flex: 1}}>
                    <View style={styles.titleRow}>
                        <Text style={styles.cardText}>{item.title}</Text>
                        <View style={[styles.streakBadge, { backgroundColor: '#222' }]}>
                            <MaterialCommunityIcons name="lightning-bolt" size={14} color={COLORS.gold} />
                            <Text style={styles.streakText}>{item.streak}</Text>
                        </View>
                    </View>
                    <View style={styles.metaRow}>
                        <Text style={{color: COLORS.textDim, fontSize: 12, marginRight: 10}}>{item.type.toUpperCase()}</Text>
                        <Text style={{color: COLORS.gold, fontSize: 12}}>{item.reward} XP</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => deleteChallenge(item.id)}><MaterialCommunityIcons name="close" size={20} color={COLORS.textDim} /></TouchableOpacity>
            </View>
        ))}

        {challenges.filter(c => c.completed).length > 0 && (
            <>
            <Text style={[styles.sectionHeader, {marginTop: 20}]}>Completed</Text>
            {challenges.filter(c => c.completed).map(item => (
                <View key={item.id} style={[styles.card, { opacity: 0.6 }]}>
                    <TouchableOpacity onPress={() => toggleChallenge(item.id)} style={styles.checkboxContainer}>
                        <MaterialCommunityIcons name="trophy" size={24} color={COLORS.gold} />
                    </TouchableOpacity>
                    <View style={{flex: 1}}>
                        <Text style={[styles.cardText, styles.strikethrough]}>{item.title}</Text>
                        <Text style={{color: COLORS.gold, fontSize: 12}}>Completed!</Text>
                    </View>
                    <TouchableOpacity onPress={() => deleteChallenge(item.id)}><MaterialCommunityIcons name="close" size={20} color={COLORS.textDim} /></TouchableOpacity>
                </View>
            ))}
            </>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  input: { flex: 1, backgroundColor: COLORS.card, color: 'white', padding: 15, borderRadius: 10 },
  addButton: { backgroundColor: COLORS.secondary, width: 50, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  typeSelector: { flexDirection: 'row', marginBottom: 15, justifyContent: 'center' },
  typeBtn: { paddingVertical: 6, paddingHorizontal: 20, backgroundColor: '#333', marginHorizontal: 5, borderRadius: 20 },
  typeBtnActive: { backgroundColor: COLORS.blue },
  typeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  logButton: { flexDirection: 'row', backgroundColor: '#333', padding: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  logButtonText: { color: 'white', fontWeight: '600', marginLeft: 8 },
  sectionHeader: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 5, textTransform: 'uppercase' },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  checkboxContainer: { marginRight: 15 },
  cardText: { color: 'white', fontSize: 16, fontWeight: '500' },
  strikethrough: { textDecorationLine: 'line-through', color: COLORS.textDim },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#332200', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  streakText: { color: COLORS.gold, fontSize: 12, fontWeight: 'bold', marginLeft: 2 },
  metaRow: { flexDirection: 'row', marginTop: 4 },
});