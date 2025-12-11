import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    AppState,
    Easing,
    FlatList,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- Constants ---
const LEVEL_THRESHOLD = 500; // XP needed to level up
const COLORS = {
  background: '#121212',
  card: '#1E1E1E',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  gold: '#FFD700',
  text: '#FFFFFF',
  textDim: '#AAAAAA',
  danger: '#CF6679',
  orange: '#FF9800',
  blue: '#2196F3' // New color for challenges
};

const STORAGE_KEY = '@gamify_todo_v5';
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// --- Helper Functions ---
const getWeekNumber = (d) => {
  // ISO week date helper
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getCurrentDateStr = () => new Date().toISOString().split('T')[0];

// --- Components ---
const PointPopup = ({ id, value, bonus, onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const posAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(posAnim, { toValue: -60, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, delay: 200, useNativeDriver: true })
        .start(() => onFinish(id));
    });
  }, []);

  const isPositive = value > 0;
  const displayValue = isPositive 
    ? (bonus > 0 ? `+${value}\n(+${bonus} Streak!)` : `+${value}`) 
    : `${value}`;

  return (
    <Animated.View style={[styles.popupContainer, { opacity: fadeAnim, transform: [{ translateY: posAnim }] }]}>
      <Text style={[styles.popupText, { color: isPositive ? COLORS.gold : COLORS.danger }]}>{displayValue}</Text>
    </Animated.View>
  );
};

const DaySelector = ({ selectedDays, toggleDay }) => (
  <View style={styles.daySelector}>
    {DAYS.map((day, index) => {
      const isSelected = selectedDays.includes(index);
      return (
        <TouchableOpacity 
          key={index} 
          style={[styles.dayCircle, isSelected && styles.dayCircleActive]}
          onPress={() => toggleDay(index)}
        >
          <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>{day}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export default function App() {
  // Data State
  const [points, setPoints] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [popups, setPopups] = useState([]);

  // UI State
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'challenges', 'rewards'
  
  // -- Task Inputs --
  const [taskInput, setTaskInput] = useState('');
  const [dueTimeStr, setDueTimeStr] = useState('');
  const [taskPenalty, setTaskPenalty] = useState('');
  const [taskReward, setTaskReward] = useState('');
  const [selectedRepeatDays, setSelectedRepeatDays] = useState([]);
  const [showTaskOptions, setShowTaskOptions] = useState(false);

  // -- Challenge Inputs --
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengePoints, setChallengePoints] = useState('');
  const [challengeType, setChallengeType] = useState('daily'); // 'daily' or 'weekly'

  // -- Reward Inputs --
  const [rewardName, setRewardName] = useState('');
  const [rewardCost, setRewardCost] = useState('');

  // --- Lifecycle ---
  useEffect(() => { loadData(); }, []);
  useEffect(() => { saveData(); }, [points, tasks, rewards, challenges]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (nextAppState === "active") checkForResets();
    });
    return () => subscription.remove();
  }, [tasks, challenges]);

  useEffect(() => {
    const interval = setInterval(checkExpirations, 10000);
    return () => clearInterval(interval);
  }, [tasks]);

  // --- Logic: Data Persistence ---
  const saveData = async () => {
    try {
      const data = { points, tasks, rewards, challenges };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {}
  };

  const loadData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue) {
        const data = JSON.parse(jsonValue);
        setPoints(data.points || 0);
        setTasks(data.tasks || []);
        setRewards(data.rewards || []);
        setChallenges(data.challenges || []);
        checkForResets(data.tasks, data.challenges);
      }
    } catch (e) {}
  };

  // --- Logic: Reset System ---
  const checkForResets = (currentTasks = tasks, currentChallenges = challenges) => {
    const today = getCurrentDateStr();
    const currentWeek = getWeekNumber(new Date());

    let needsUpdate = false;

    // 1. Reset Repeating Tasks (Daily)
    const updatedTasks = currentTasks.map(t => {
      if (t.repeatDays.length > 0 && t.completed && t.lastCompletedDate !== today) {
        needsUpdate = true;
        return { ...t, completed: false, failed: false };
      }
      return t;
    });

    // 2. Reset Challenges (Daily & Weekly)
    const updatedChallenges = currentChallenges.map(c => {
      // Daily Reset
      if (c.type === 'daily' && c.completed && c.lastCompletedDate !== today) {
        needsUpdate = true;
        return { ...c, completed: false };
      }
      // Weekly Reset
      if (c.type === 'weekly' && c.completed && c.lastCompletedWeek !== currentWeek) {
        needsUpdate = true;
        return { ...c, completed: false };
      }
      return c;
    });

    if (needsUpdate) {
      setTasks(updatedTasks);
      setChallenges(updatedChallenges);
    }
  };

  // --- Logic: Expirations (Tasks only) ---
  const checkExpirations = () => {
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const todayIndex = now.getDay();
    let hasChanges = false;
    let pointsChange = 0;

    const updatedTasks = tasks.map(task => {
      const isToday = task.repeatDays.length === 0 || task.repeatDays.includes(todayIndex);
      if (!task.completed && !task.failed && task.dueTimeMins !== null && isToday) {
        if (currentMins > task.dueTimeMins) {
          hasChanges = true;
          pointsChange -= task.penalty;
          return { ...task, failed: true, streak: 0 };
        }
      }
      return task;
    });

    if (hasChanges) {
      setTasks(updatedTasks);
      if (pointsChange !== 0) {
        updatePoints(pointsChange);
        Alert.alert("Time's Up!", `Penalty applied.`);
      }
    }
  };

  // --- Logic: Points ---
  const updatePoints = (amount, bonus = 0) => {
    setPoints(prev => Math.max(0, prev + amount + bonus));
    const id = Date.now().toString() + Math.random();
    setPopups(prev => [...prev, { id, value: amount, bonus }]);
  };

  const removePopup = (id) => setPopups(prev => prev.filter(p => p.id !== id));

  // --- Logic: Tasks ---
  const addTask = () => {
    if (!taskInput.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    let dueMins = null;
    if (dueTimeStr.includes(':')) {
      const [h, m] = dueTimeStr.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) dueMins = h * 60 + m;
    }

    setTasks([{
      id: Date.now().toString(),
      text: taskInput,
      dueTimeMins: dueMins,
      dueDisplay: dueTimeStr,
      penalty: parseInt(taskPenalty) || 0,
      reward: parseInt(taskReward) || 10,
      repeatDays: selectedRepeatDays,
      streak: 0,
      completed: false,
      failed: false,
      lastCompletedDate: null
    }, ...tasks]);

    setTaskInput(''); setDueTimeStr(''); setTaskPenalty(''); 
    setTaskReward(''); setSelectedRepeatDays([]); setShowTaskOptions(false);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        if (t.failed) return t;
        const isCompleting = !t.completed;
        if (isCompleting) {
          const bonus = t.streak * 5;
          updatePoints(t.reward, bonus);
          return { ...t, completed: true, streak: t.streak + 1, lastCompletedDate: getCurrentDateStr() };
        } else {
          // Undo
          const prevStreak = Math.max(0, t.streak - 1);
          const bonusWas = prevStreak * 5;
          updatePoints(-(t.reward + bonusWas));
          return { ...t, completed: false, streak: prevStreak, lastCompletedDate: null };
        }
      }
      return t;
    }));
  };

  const deleteTask = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setTasks(tasks.filter(t => t.id !== id));
  };

  // --- Logic: Challenges ---
  const addChallenge = () => {
    if (!challengeTitle.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    setChallenges([{
      id: Date.now().toString(),
      title: challengeTitle,
      reward: parseInt(challengePoints) || 50,
      type: challengeType, // 'daily' or 'weekly'
      streak: 0,
      completed: false,
      lastCompletedDate: null,
      lastCompletedWeek: null
    }, ...challenges]);

    setChallengeTitle(''); setChallengePoints('');
  };

  const toggleChallenge = (id) => {
    setChallenges(challenges.map(c => {
      if (c.id === id) {
        const isCompleting = !c.completed;
        if (isCompleting) {
          // Daily Streak Bonus = Streak * 10
          // Weekly Streak Bonus = Streak * 50
          const multiplier = c.type === 'daily' ? 10 : 50;
          const bonus = c.streak * multiplier;
          
          updatePoints(c.reward, bonus);
          return { 
            ...c, 
            completed: true, 
            streak: c.streak + 1,
            lastCompletedDate: getCurrentDateStr(),
            lastCompletedWeek: getWeekNumber(new Date())
          };
        } else {
          // Undo
          const prevStreak = Math.max(0, c.streak - 1);
          const multiplier = c.type === 'daily' ? 10 : 50;
          const bonusWas = prevStreak * multiplier;
          updatePoints(-(c.reward + bonusWas));
          return { ...c, completed: false, streak: prevStreak };
        }
      }
      return c;
    }));
  };

  const deleteChallenge = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    setChallenges(challenges.filter(c => c.id !== id));
  };

  // --- Logic: Rewards ---
  const addReward = () => {
    if (!rewardName || !rewardCost) return;
    setRewards([...rewards, { id: Date.now().toString(), text: rewardName, cost: parseInt(rewardCost) }]);
    setRewardName(''); setRewardCost('');
  };

  const redeemReward = (r) => {
    if (points >= r.cost) {
      Alert.alert("Redeem", `Spend ${r.cost} XP?`, [{ text: "Cancel" }, { text: "Yes", onPress: () => updatePoints(-r.cost) }]);
    } else Alert.alert("Locked", "Not enough XP");
  };

  const deleteReward = (id) => setRewards(rewards.filter(r => r.id !== id));

  // --- Renderers ---
const renderHeader = () => {
    // 1. Level Logic
    const currentLevel = Math.floor(points / LEVEL_THRESHOLD) + 1;
    const xpTowardsNext = points % LEVEL_THRESHOLD;
    const levelProgress = (xpTowardsNext / LEVEL_THRESHOLD) * 100;

    // 2. Daily Task Progress Logic
    const today = getCurrentDateStr(); // Ensure this helper exists in your scope (it's in the previous code)
    const dailyTasks = tasks.filter(t => {
      // Only count tasks that are meant for today (repeating or one-off)
      const todayIndex = new Date().getDay();
      return t.repeatDays.length === 0 || t.repeatDays.includes(todayIndex);
    });
    const totalDaily = dailyTasks.length;
    const completedDaily = dailyTasks.filter(t => t.completed).length;
    const dailyPercent = totalDaily === 0 ? 0 : (completedDaily / totalDaily) * 100;

    return (
      <View style={styles.heroContainer}>
        {/* Top Row: Title & Animation Anchor */}
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroTitle}>GAMIFY<Text style={{color: COLORS.primary}}>LIFE</Text></Text>
            <Text style={styles.heroDate}>{new Date().toDateString()}</Text>
          </View>
          
          {/* Points Popup Anchor */}
          <View style={styles.pointsAnchor}>
            {popups.map(p => <PointPopup key={p.id} {...p} onFinish={removePopup} />)}
            <View style={styles.streakBadgeHeader}>
              <MaterialCommunityIcons name="fire" size={20} color={COLORS.orange} />
              {/* Calculate total streak across all tasks for a 'global' streak vibe if desired, or just show an icon */}
            </View>
          </View>
        </View>

        {/* Middle Row: Level & XP Bar */}
        <View style={styles.levelCard}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelLabel}>LVL</Text>
            <Text style={styles.levelValue}>{currentLevel}</Text>
          </View>

          <View style={styles.xpSection}>
            <View style={styles.xpTextRow}>
              <Text style={styles.xpLabel}>Experience</Text>
              <Text style={styles.xpValue}>{xpTowardsNext} <Text style={{color: '#666'}}>/</Text> {LEVEL_THRESHOLD} XP</Text>
            </View>
            
            {/* XP Bar */}
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${levelProgress}%`, backgroundColor: COLORS.gold }]} />
            </View>
          </View>
        </View>

        {/* Bottom Row: Daily Quest Progress */}
        <View style={styles.dailyTracker}>
          <View style={styles.trackerRow}>
            <Text style={styles.trackerLabel}>Daily Quests</Text>
            <Text style={styles.trackerValue}>{completedDaily}/{totalDaily}</Text>
          </View>
          {/* Daily Bar */}
          <View style={[styles.progressBarBg, { height: 6, marginTop: 5, backgroundColor: '#333' }]}>
            <View style={[styles.progressBarFill, { width: `${dailyPercent}%`, backgroundColor: COLORS.secondary }]} />
          </View>
        </View>
      </View>
    );
  };

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      {['tasks', 'challenges', 'rewards'].map(tab => (
        <TouchableOpacity 
          key={tab} 
          style={[styles.tab, activeTab === tab && styles.activeTab]} 
          onPress={() => setActiveTab(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      {renderHeader()}
      {renderTabs()}

      <View style={styles.content}>
        {activeTab === 'tasks' && (
          <>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} placeholder="New Quest..." placeholderTextColor={COLORS.textDim} value={taskInput} onChangeText={setTaskInput} />
                <TouchableOpacity style={styles.optionsToggle} onPress={() => setShowTaskOptions(!showTaskOptions)}>
                   <MaterialCommunityIcons name={showTaskOptions ? "chevron-up" : "chevron-down"} size={24} color={COLORS.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={addTask}>
                  <MaterialCommunityIcons name="plus" size={24} color="white" />
                </TouchableOpacity>
              </View>
              {showTaskOptions && (
                <View style={styles.optionsContainer}>
                  <Text style={styles.sectionLabel}>Repeat On:</Text>
                  <DaySelector selectedDays={selectedRepeatDays} toggleDay={(d) => {
                    setSelectedRepeatDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
                  }} />
                  <View style={styles.extraRow}>
                    <TextInput style={styles.inputSmall} placeholder="Due (HH:MM)" placeholderTextColor={COLORS.textDim} value={dueTimeStr} onChangeText={setDueTimeStr} maxLength={5} />
                    <TextInput style={styles.inputSmall} placeholder="Penalty" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={taskPenalty} onChangeText={setTaskPenalty} />
                    <TextInput style={styles.inputSmall} placeholder="Reward" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={taskReward} onChangeText={setTaskReward} />
                  </View>
                </View>
              )}
            </KeyboardAvoidingView>
            <FlatList
              data={tasks}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              renderItem={({ item }) => {
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
              }}
            />
          </>
        )}

        {activeTab === 'challenges' && (
          <>
            <View style={styles.inputRow}>
              <TextInput style={[styles.input, {flex: 2}]} placeholder="Challenge Goal" placeholderTextColor={COLORS.textDim} value={challengeTitle} onChangeText={setChallengeTitle} />
              <TextInput style={[styles.input, {flex: 1, marginLeft: 5}]} placeholder="XP" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={challengePoints} onChangeText={setChallengePoints} />
              <TouchableOpacity style={[styles.addButton, {marginLeft: 5}]} onPress={addChallenge}>
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

            <FlatList
              data={challenges}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              renderItem={({ item }) => (
                <View style={[styles.card, { borderColor: item.type === 'weekly' ? COLORS.gold : COLORS.blue, borderWidth: 1 }]}>
                  <TouchableOpacity onPress={() => toggleChallenge(item.id)} style={styles.checkboxContainer}>
                     <MaterialCommunityIcons name={item.completed ? "trophy" : "trophy-outline"} size={24} color={item.completed ? COLORS.gold : COLORS.textDim} />
                  </TouchableOpacity>
                  <View style={{flex: 1}}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.cardText, item.completed && styles.strikethrough]}>{item.title}</Text>
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
              )}
            />
          </>
        )}

        {activeTab === 'rewards' && (
          <>
            <View style={styles.inputRow}>
              <TextInput style={[styles.input, {flex: 2}]} placeholder="Reward Name" placeholderTextColor={COLORS.textDim} value={rewardName} onChangeText={setRewardName} />
              <TextInput style={[styles.input, {flex: 1, marginLeft: 10}]} placeholder="Cost" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={rewardCost} onChangeText={setRewardCost} />
              <TouchableOpacity style={[styles.addButton, {marginLeft: 10}]} onPress={addReward}>
                 <MaterialCommunityIcons name="plus" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <FlatList 
              data={rewards} 
              keyExtractor={item => item.id}
              renderItem={({item}) => (
                <View style={styles.card}>
                  <View style={{flex: 1}}>
                    <Text style={styles.cardText}>{item.text}</Text>
                    <Text style={{color: COLORS.gold, fontSize: 12}}>{item.cost} XP</Text>
                  </View>
                  <TouchableOpacity style={[styles.buyButton, points < item.cost && {backgroundColor: '#444'}]} onPress={() => redeemReward(item)} disabled={points < item.cost}>
                    <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>Buy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteReward(item.id)} style={{marginLeft: 15}}>
                    <MaterialCommunityIcons name="close" size={20} color={COLORS.textDim} />
                  </TouchableOpacity>
                </View>
              )}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.card, zIndex: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  headerSubtitle: { fontSize: 16, color: COLORS.gold, fontWeight: 'bold' },
  pointsContainer: { position: 'relative', width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  popupContainer: { position: 'absolute', top: 0, right: 40, width: 150, alignItems: 'flex-end', zIndex: 99 },
  popupText: { fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginVertical: 10, backgroundColor: '#333', borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textDim, fontWeight: '600', fontSize: 12 },
  activeTabText: { color: 'white' },
  content: { flex: 1, paddingHorizontal: 20 },
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
  buyButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  typeSelector: { flexDirection: 'row', marginBottom: 15, justifyContent: 'center' },
  typeBtn: { paddingVertical: 6, paddingHorizontal: 20, backgroundColor: '#333', marginHorizontal: 5, borderRadius: 20 },
  typeBtnActive: { backgroundColor: COLORS.blue },
    typeText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  
  // --- HERO / HEADER STYLES ---
  heroContainer: {
    backgroundColor: COLORS.card,
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    marginBottom: 15,
    zIndex: 10
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900', // Extra bold
    color: 'white',
    letterSpacing: 1,
  },
  heroDate: {
    color: COLORS.textDim,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    fontWeight: '600'
  },
  pointsAnchor: {
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'center',
    width: 60,
  },
  streakBadgeHeader: {
    backgroundColor: '#332200', 
    padding: 8, 
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 152, 0, 0.3)'
  },

  // --- Level Card ---
  levelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  levelBadge: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    marginRight: 15,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  levelLabel: {
    fontSize: 10,
    color: COLORS.textDim,
    fontWeight: 'bold',
  },
  levelValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  xpSection: {
    flex: 1,
  },
  xpTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  xpLabel: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  xpValue: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // --- Progress Bars ---
  progressBarBg: {
    height: 10,
    backgroundColor: '#111',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },

  // --- Daily Tracker ---
  dailyTracker: {
    backgroundColor: '#252525',
    borderRadius: 12,
    padding: 12,
  },
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  trackerLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  trackerValue: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  // --- Animation Popups (Updated positions) ---
  popupContainer: { position: 'absolute', top: 10, right: 10, width: 150, alignItems: 'flex-end', zIndex: 99 },
  popupText: { fontSize: 20, fontWeight: '900', textAlign: 'right', textShadowColor: 'black', textShadowRadius: 5 },

  // ... (Keep your existing styles for Tabs, Cards, Inputs, etc. below here) ...
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, backgroundColor: '#333', borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textDim, fontWeight: '600', fontSize: 12 },
  activeTabText: { color: 'white' },
  content: { flex: 1, paddingHorizontal: 20 },
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
  buyButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  typeSelector: { flexDirection: 'row', marginBottom: 15, justifyContent: 'center' },
  typeBtn: { paddingVertical: 6, paddingHorizontal: 20, backgroundColor: '#333', marginHorizontal: 5, borderRadius: 20 },
  typeBtnActive: { backgroundColor: COLORS.blue },
  typeText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});