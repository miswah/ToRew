import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
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

// Enable LayoutAnimation for Android
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

// --- Constants & Theme ---
const COLORS = {
  background: '#121212',
  card: '#1E1E1E',
  primary: '#BB86FC',
  secondary: '#03DAC6',
  gold: '#FFD700',
  text: '#FFFFFF',
  textDim: '#AAAAAA',
  danger: '#CF6679',
  failed: '#B00020',
};

const STORAGE_KEY = '@gamify_todo_data_v3';

// --- Floating Animation Component ---
const PointPopup = ({ id, value, onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const posAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(posAnim, { toValue: -50, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, delay: 200, useNativeDriver: true })
        .start(() => onFinish(id));
    });
  }, []);

  const isPositive = value > 0;
  const displayValue = isPositive ? `+${value}` : `${value}`;

  return (
    <Animated.View style={[styles.popupContainer, { opacity: fadeAnim, transform: [{ translateY: posAnim }] }]}>
      <Text style={[styles.popupText, { color: isPositive ? COLORS.gold : COLORS.danger }]}>{displayValue}</Text>
    </Animated.View>
  );
};

// --- Animated List Item Component ---
const AnimatedItem = ({ children, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 50, // Stagger effect
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

export default function App() {
  const [points, setPoints] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [popups, setPopups] = useState([]);
  
  // Input states
  const [taskInput, setTaskInput] = useState('');
  const [taskDuration, setTaskDuration] = useState(''); // In minutes
  const [taskPenalty, setTaskPenalty] = useState('');
  const [taskReward, setTaskReward] = useState(''); // Custom reward
  const [showTaskOptions, setShowTaskOptions] = useState(false);

  const [rewardName, setRewardName] = useState('');
  const [rewardCost, setRewardCost] = useState('');

  // --- Lifecycle ---
  useEffect(() => { loadData(); }, []);
  useEffect(() => { saveData(); }, [points, tasks, rewards]);

  // --- GAME LOOP: Check for expired tasks every 10 seconds ---
  useEffect(() => {
    const interval = setInterval(() => {
      checkExpirations();
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [tasks]);

  const checkExpirations = () => {
    const now = Date.now();
    let pointsChange = 0;
    let hasChanges = false;

    const updatedTasks = tasks.map(task => {
      // If task is active, has a due time, and the time has passed
      if (!task.completed && !task.failed && task.dueTime && task.dueTime < now) {
        hasChanges = true;
        pointsChange -= task.penalty;
        return { ...task, failed: true }; // Mark as failed
      }
      return task;
    });

    if (hasChanges) {
      setTasks(updatedTasks);
      if (pointsChange !== 0) updatePoints(pointsChange);
      Alert.alert("Quest Failed!", "A quest expired. Penalty applied.");
    }
  };

  const saveData = async () => {
    try {
      const data = { points, tasks, rewards };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) { console.error(e); }
  };

  const loadData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
      if (jsonValue != null) {
        const data = JSON.parse(jsonValue);
        setPoints(data.points || 0);
        setTasks(data.tasks || []);
        setRewards(data.rewards || []);
      }
    } catch (e) { console.error(e); }
  };

  // --- Logic ---
  const triggerPointAnimation = (value) => {
    const id = Date.now().toString() + Math.random();
    setPopups(prev => [...prev, { id, value }]);
  };

  const removePopup = (id) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  };

  const updatePoints = (amount) => {
    setPoints(prev => Math.max(0, prev + amount));
    triggerPointAnimation(amount);
  };

  const addTask = () => {
    if (!taskInput.trim()) return;
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const penaltyVal = parseInt(taskPenalty) || 0;
    const rewardVal = parseInt(taskReward) || 10; // Default to 10 if empty
    const durationVal = parseInt(taskDuration);

    let dueTime = null;
    if (!isNaN(durationVal) && durationVal > 0) {
      dueTime = Date.now() + (durationVal * 60 * 1000); // Current time + minutes
    }

    const newTask = { 
      id: Date.now().toString(), 
      text: taskInput, 
      dueTime: dueTime,
      penalty: penaltyVal,
      reward: rewardVal,
      completed: false,
      failed: false
    };
    setTasks([newTask, ...tasks]);
    
    setTaskInput('');
    setTaskDuration('');
    setTaskPenalty('');
    setTaskReward('');
    setShowTaskOptions(false);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        if (task.failed) return task; // Cannot toggle failed tasks

        const isNowCompleted = !task.completed;
        if (isNowCompleted) updatePoints(task.reward);
        else updatePoints(-task.reward);
        
        return { ...task, completed: isNowCompleted };
      }
      return task;
    }));
  };

  const deleteTask = (task) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
    // If deleting an incomplete task with penalty (that hasn't failed yet)
    if (!task.completed && !task.failed && task.penalty > 0) {
      Alert.alert(
        "Abandon Quest?",
        `Giving up will cost ${task.penalty} points.`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Abandon", 
            onPress: () => {
              updatePoints(-task.penalty);
              setTasks(tasks.filter(t => t.id !== task.id));
            }
          }
        ]
      );
    } else {
      setTasks(tasks.filter(t => t.id !== task.id));
    }
  };

  const addReward = () => {
    if (!rewardName.trim() || !rewardCost.trim()) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    setRewards([...rewards, { 
      id: Date.now().toString(), 
      text: rewardName, 
      cost: parseInt(rewardCost) 
    }]);
    setRewardName('');
    setRewardCost('');
  };

  const redeemReward = (reward) => {
    if (points >= reward.cost) {
      Alert.alert(
        "Buy Reward",
        `Purchase "${reward.text}"?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Buy", 
            onPress: () => {
              updatePoints(-reward.cost);
            }
          }
        ]
      );
    } else {
      Alert.alert("Locked", "You need more XP to unlock this.");
    }
  };

  const deleteReward = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRewards(rewards.filter(r => r.id !== id));
  };

  // --- Time Formatter ---
  const getRemainingTime = (dueTime) => {
    if (!dueTime) return null;
    const diff = dueTime - Date.now();
    if (diff <= 0) return "Expired";
    const minutes = Math.ceil(diff / 60000);
    if (minutes > 60) return `${Math.floor(minutes/60)}h remaining`;
    return `${minutes}m remaining`;
  };

  // --- Render Functions ---
  const renderTaskItem = ({ item, index }) => (
    <AnimatedItem index={index}>
      <View style={[styles.card, item.failed && styles.cardFailed]}>
        <TouchableOpacity 
          onPress={() => toggleTask(item.id)} 
          style={styles.checkboxContainer}
          disabled={item.failed}
        >
          <MaterialCommunityIcons 
            name={item.failed ? "close-box" : (item.completed ? "checkbox-marked" : "checkbox-blank-outline")} 
            size={24} 
            color={item.failed ? COLORS.danger : (item.completed ? COLORS.secondary : COLORS.textDim)} 
          />
        </TouchableOpacity>
        
        <View style={{flex: 1}}>
          <Text style={[styles.cardText, item.completed && styles.strikethrough, item.failed && styles.textFailed]}>
            {item.text}
          </Text>
          
          <View style={styles.metaRow}>
            <Text style={[styles.metaText, {color: COLORS.secondary}]}>
               <MaterialCommunityIcons name="trophy-outline" size={12} /> {item.reward} XP
            </Text>
            {item.dueTime && !item.completed && !item.failed && (
               <Text style={[styles.metaText, { marginLeft: 10, color: COLORS.gold }]}>
                 <MaterialCommunityIcons name="clock-outline" size={12} /> {getRemainingTime(item.dueTime)}
               </Text>
            )}
            {item.failed && (
               <Text style={[styles.metaText, { marginLeft: 10, color: COLORS.danger }]}>
                 EXPIRED (-{item.penalty})
               </Text>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={() => deleteTask(item)}>
          <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.textDim} />
        </TouchableOpacity>
      </View>
    </AnimatedItem>
  );

  const renderRewardItem = ({ item, index }) => (
    <AnimatedItem index={index}>
      <View style={styles.card}>
        <View style={{flex: 1}}>
          <Text style={styles.cardText}>{item.text}</Text>
          <Text style={styles.costText}>{item.cost} Points</Text>
        </View>
        <TouchableOpacity 
          style={[styles.buyButton, points < item.cost && styles.disabledButton]}
          onPress={() => redeemReward(item)}
          disabled={points < item.cost}
        >
          <Text style={styles.buyButtonText}>Buy</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => deleteReward(item.id)} style={{marginLeft: 15}}>
          <MaterialCommunityIcons name="close-circle-outline" size={24} color={COLORS.textDim} />
        </TouchableOpacity>
      </View>
    </AnimatedItem>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>GamifyLife</Text>
          <Text style={styles.headerSubtitle}>XP: {points}</Text>
        </View>
        <View style={styles.pointsContainer}>
          {popups.map(p => <PointPopup key={p.id} id={p.id} value={p.value} onFinish={removePopup} />)}
          <MaterialCommunityIcons name="star-face" size={28} color={COLORS.gold} />
        </View>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity style={[styles.tab, activeTab === 'tasks' && styles.activeTab]} onPress={() => setActiveTab('tasks')}>
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>Quests</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'rewards' && styles.activeTab]} onPress={() => setActiveTab('rewards')}>
          <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>Rewards</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'tasks' ? (
          <>
            {/* Task Input Section */}
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputSection}>
              <View style={styles.mainInputRow}>
                <TextInput
                  style={styles.input}
                  placeholder="New Quest..."
                  placeholderTextColor={COLORS.textDim}
                  value={taskInput}
                  onChangeText={setTaskInput}
                />
                <TouchableOpacity style={styles.optionsToggle} onPress={() => setShowTaskOptions(!showTaskOptions)}>
                  <MaterialCommunityIcons name={showTaskOptions ? "chevron-up" : "chevron-down"} size={24} color={COLORS.textDim} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={addTask}>
                  <MaterialCommunityIcons name="plus" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {showTaskOptions && (
                <View style={styles.extraOptionsContainer}>
                  <View style={styles.extraOptionsRow}>
                    <TextInput
                      style={[styles.inputSmall, { flex: 1, marginRight: 5 }]}
                      placeholder="Minutes to expire"
                      placeholderTextColor={COLORS.textDim}
                      keyboardType="numeric"
                      value={taskDuration}
                      onChangeText={setTaskDuration}
                    />
                     <TextInput
                      style={[styles.inputSmall, { flex: 1, marginLeft: 5 }]}
                      placeholder="Penalty Pts"
                      placeholderTextColor={COLORS.textDim}
                      keyboardType="numeric"
                      value={taskPenalty}
                      onChangeText={setTaskPenalty}
                    />
                  </View>
                  <View style={[styles.extraOptionsRow, { marginTop: 10 }]}>
                    <TextInput
                      style={[styles.inputSmall, { flex: 1 }]}
                      placeholder="Reward Pts (Default: 10)"
                      placeholderTextColor={COLORS.textDim}
                      keyboardType="numeric"
                      value={taskReward}
                      onChangeText={setTaskReward}
                    />
                  </View>
                </View>
              )}
            </KeyboardAvoidingView>
            
            <FlatList
              data={tasks}
              renderItem={renderTaskItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No active quests.</Text>}
            />
          </>
        ) : (
          <>
             <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 2 }]}
                placeholder="Reward Name"
                placeholderTextColor={COLORS.textDim}
                value={rewardName}
                onChangeText={setRewardName}
              />
              <TextInput
                style={[styles.input, { flex: 1, marginLeft: 10 }]}
                placeholder="Cost"
                placeholderTextColor={COLORS.textDim}
                keyboardType="numeric"
                value={rewardCost}
                onChangeText={setRewardCost}
              />
              <TouchableOpacity style={[styles.addButton, {marginLeft: 10}]} onPress={addReward}>
                <MaterialCommunityIcons name="plus" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={rewards}
              renderItem={renderRewardItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={<Text style={styles.emptyText}>Stock up the shop!</Text>}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.gold,
    fontWeight: 'bold',
  },
  pointsContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40, 
    height: 40
  },
  // Animation Styles
  popupContainer: {
    position: 'absolute',
    top: 0, 
    right: 30, // Position next to the star
    alignItems: 'center',
    zIndex: 20,
    width: 100
  },
  popupText: {
    fontSize: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textDim,
    fontWeight: '600',
  },
  activeTabText: {
    color: 'white',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  // Input Styles
  inputSection: {
    marginBottom: 20,
  },
  mainInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  extraOptionsContainer: {
    marginTop: 10,
    backgroundColor: '#2C2C2C',
    padding: 10,
    borderRadius: 10,
  },
  extraOptionsRow: {
    flexDirection: 'row',
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  inputSmall: {
    backgroundColor: '#1a1a1a',
    color: COLORS.text,
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
  },
  optionsToggle: {
    padding: 10,
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
    borderRadius: 10,
    marginLeft: 5,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  // List Item Styles
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardFailed: {
    borderColor: COLORS.danger,
    borderWidth: 1,
    opacity: 0.8
  },
  checkboxContainer: {
    marginRight: 15,
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  textFailed: {
    color: COLORS.danger,
    textDecorationLine: 'line-through'
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '600'
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: COLORS.textDim,
  },
  costText: {
    color: COLORS.gold,
    fontSize: 12,
  },
  buyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#444',
  },
  buyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textDim,
    marginTop: 50,
    fontSize: 16,
  }
});