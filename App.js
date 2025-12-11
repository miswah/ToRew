import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

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
  success: '#4caf50'
};

const STORAGE_KEY = '@gamify_todo_data_v2';

// --- Floating Animation Component ---
const PointPopup = ({ id, value, onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const posAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(posAnim, {
        toValue: -40, // Move up
        duration: 800,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        delay: 200,
        useNativeDriver: true,
      }).start(() => onFinish(id));
    });
  }, []);

  const isPositive = value > 0;
  const displayValue = isPositive ? `+${value}` : `${value}`;

  return (
    <Animated.View style={[
      styles.popupContainer, 
      { 
        opacity: fadeAnim, 
        transform: [{ translateY: posAnim }] 
      }
    ]}>
      <Text style={[
        styles.popupText, 
        { color: isPositive ? COLORS.gold : COLORS.danger }
      ]}>
        {displayValue}
      </Text>
    </Animated.View>
  );
};

export default function App() {
  const [points, setPoints] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [popups, setPopups] = useState([]); // Store active animations
  
  // Input states
  const [taskInput, setTaskInput] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPenalty, setTaskPenalty] = useState('');
  const [showTaskOptions, setShowTaskOptions] = useState(false);

  const [rewardName, setRewardName] = useState('');
  const [rewardCost, setRewardCost] = useState('');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { saveData(); }, [points, tasks, rewards]);

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

  // --- Animation Logic ---
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

  // --- Logic: Tasks ---
  const addTask = () => {
    if (!taskInput.trim()) return;
    
    const penaltyValue = parseInt(taskPenalty);

    const newTask = { 
      id: Date.now().toString(), 
      text: taskInput, 
      due: taskDue.trim(),
      penalty: isNaN(penaltyValue) ? 0 : penaltyValue,
      completed: false 
    };
    setTasks([newTask, ...tasks]);
    
    // Reset inputs
    setTaskInput('');
    setTaskDue('');
    setTaskPenalty('');
    setShowTaskOptions(false);
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const isNowCompleted = !task.completed;
        // Standard Reward: 10 points
        if (isNowCompleted) updatePoints(10);
        else updatePoints(-10); // Revert points if unchecked
        
        return { ...task, completed: isNowCompleted };
      }
      return task;
    }));
  };

  const deleteTask = (task) => {
    // If task is incomplete and has a penalty, apply it
    if (!task.completed && task.penalty > 0) {
      Alert.alert(
        "Task Failed!",
        `Deleting this incomplete task will cost you ${task.penalty} points. Proceed?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Accept Fate", 
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

  // --- Logic: Rewards ---
  const addReward = () => {
    if (!rewardName.trim() || !rewardCost.trim()) return;
    const cost = parseInt(rewardCost);
    if (isNaN(cost)) return;

    setRewards([...rewards, { id: Date.now().toString(), text: rewardName, cost }]);
    setRewardName('');
    setRewardCost('');
  };

  const redeemReward = (reward) => {
    if (points >= reward.cost) {
      Alert.alert(
        "Redeem Reward",
        `Buy "${reward.text}" for ${reward.cost} points?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Buy", 
            onPress: () => {
              updatePoints(-reward.cost);
              Alert.alert("Enjoy!", "You earned it.");
            }
          }
        ]
      );
    } else {
      Alert.alert("Too Expensive", "Do more tasks to afford this!");
    }
  };

  const deleteReward = (id) => {
    setRewards(rewards.filter(r => r.id !== id));
  };

  // --- Render Helpers ---
  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>GamifyLife</Text>
        <Text style={styles.headerSubtitle}>Level Up Your Day</Text>
      </View>
      <View style={styles.pointsContainer}>
        {/* Render Active Animations */}
        {popups.map(p => (
          <PointPopup key={p.id} id={p.id} value={p.value} onFinish={removePopup} />
        ))}
        <MaterialCommunityIcons name="star-face" size={24} color={COLORS.gold} />
        <Text style={styles.pointsText}>{points}</Text>
      </View>
    </View>
  );

  const renderTaskInput = () => (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputSection}>
      <View style={styles.mainInputRow}>
        <TextInput
          style={styles.input}
          placeholder="New Quest..."
          placeholderTextColor={COLORS.textDim}
          value={taskInput}
          onChangeText={setTaskInput}
        />
        <TouchableOpacity 
          style={styles.optionsToggle} 
          onPress={() => setShowTaskOptions(!showTaskOptions)}
        >
          <MaterialCommunityIcons 
            name={showTaskOptions ? "chevron-up" : "chevron-down"} 
            size={24} color={COLORS.textDim} 
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {showTaskOptions && (
        <View style={styles.extraOptionsRow}>
          <TextInput
            style={[styles.inputSmall, { flex: 2 }]}
            placeholder="Due (e.g. 5pm)"
            placeholderTextColor={COLORS.textDim}
            value={taskDue}
            onChangeText={setTaskDue}
          />
          <TextInput
            style={[styles.inputSmall, { flex: 1, marginLeft: 10 }]}
            placeholder="Fail Pen."
            placeholderTextColor={COLORS.textDim}
            keyboardType="numeric"
            value={taskPenalty}
            onChangeText={setTaskPenalty}
          />
        </View>
      )}
    </KeyboardAvoidingView>
  );

  const renderTaskItem = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => toggleTask(item.id)} style={styles.checkboxContainer}>
        <MaterialCommunityIcons 
          name={item.completed ? "checkbox-marked" : "checkbox-blank-outline"} 
          size={24} 
          color={item.completed ? COLORS.secondary : COLORS.textDim} 
        />
      </TouchableOpacity>
      
      <View style={{flex: 1}}>
        <Text style={[styles.cardText, item.completed && styles.strikethrough]}>
          {item.text}
        </Text>
        {/* Meta Data Row */}
        <View style={styles.metaRow}>
          {item.due ? (
             <Text style={styles.metaText}>
               <MaterialCommunityIcons name="clock-outline" size={12} /> {item.due}
             </Text>
          ) : null}
          {item.penalty > 0 && !item.completed ? (
             <Text style={[styles.metaText, { color: COLORS.danger, marginLeft: 10 }]}>
               <MaterialCommunityIcons name="alert-circle-outline" size={12} /> -{item.penalty} on fail
             </Text>
          ) : null}
        </View>
      </View>

      {item.completed && <Text style={styles.pointsBadge}>+10</Text>}
      
      <TouchableOpacity onPress={() => deleteTask(item)}>
        <MaterialCommunityIcons name="trash-can-outline" size={24} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );

  const renderRewardItem = ({ item }) => (
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      {renderHeader()}
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tasks' && styles.activeTab]} 
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>Quests</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'rewards' && styles.activeTab]} 
          onPress={() => setActiveTab('rewards')}
        >
          <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>Rewards</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'tasks' ? (
          <>
            {renderTaskInput()}
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
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textDim,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.gold,
    position: 'relative', // For popup absolute positioning
  },
  pointsText: {
    color: COLORS.gold,
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  // Animation Styles
  popupContainer: {
    position: 'absolute',
    top: 20, 
    left: 0, 
    right: 0,
    alignItems: 'center',
    zIndex: 20,
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
    marginVertical: 15,
    marginHorizontal: 20,
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
  extraOptionsRow: {
    flexDirection: 'row',
    marginTop: 10,
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
    backgroundColor: COLORS.card,
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
  checkboxContainer: {
    marginRight: 15,
  },
  cardText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
    color: COLORS.textDim,
  },
  pointsBadge: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    marginRight: 15,
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