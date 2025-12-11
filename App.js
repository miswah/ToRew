import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
    Alert,
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
};

const STORAGE_KEY = '@gamify_todo_data';

export default function App() {
  const [points, setPoints] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' or 'rewards'
  
  // Input states
  const [taskInput, setTaskInput] = useState('');
  const [rewardName, setRewardName] = useState('');
  const [rewardCost, setRewardCost] = useState('');

  // --- Load Data on Startup ---
  useEffect(() => {
    loadData();
  }, []);

  // --- Save Data Whenever State Changes ---
  useEffect(() => {
    saveData();
  }, [points, tasks, rewards]);

  const saveData = async () => {
    try {
      const data = { points, tasks, rewards };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save data', e);
    }
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
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };

  // --- Logic: Tasks ---
  const addTask = () => {
    if (!taskInput.trim()) return;
    const newTask = { 
      id: Date.now().toString(), 
      text: taskInput, 
      completed: false 
    };
    setTasks([newTask, ...tasks]);
    setTaskInput('');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const isNowCompleted = !task.completed;
        // Reward 10 points for completing, remove 10 if unchecking
        if (isNowCompleted) setPoints(prev => prev + 10);
        else setPoints(prev => Math.max(0, prev - 10));
        
        return { ...task, completed: isNowCompleted };
      }
      return task;
    }));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  // --- Logic: Rewards ---
  const addReward = () => {
    if (!rewardName.trim() || !rewardCost.trim()) return;
    const cost = parseInt(rewardCost);
    if (isNaN(cost)) {
      Alert.alert("Invalid Cost", "Please enter a valid number for the cost.");
      return;
    }

    const newReward = {
      id: Date.now().toString(),
      text: rewardName,
      cost: cost
    };
    setRewards([...rewards, newReward]);
    setRewardName('');
    setRewardCost('');
  };

  const redeemReward = (reward) => {
    if (points >= reward.cost) {
      Alert.alert(
        "Redeem Reward",
        `Are you sure you want to buy "${reward.text}" for ${reward.cost} points?`,
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Buy", 
            onPress: () => {
              setPoints(prev => prev - reward.cost);
              Alert.alert("Success!", "You purchased a reward. Enjoy!");
            }
          }
        ]
      );
    } else {
      Alert.alert("Insufficient Funds", "Complete more tasks to earn points!");
    }
  };

  const deleteReward = (id) => {
    setRewards(rewards.filter(r => r.id !== id));
  };

  // --- Render Components ---

  const renderHeader = () => (
    <View style={styles.header}>
      <View>
        <Text style={styles.headerTitle}>GamifyLife</Text>
        <Text style={styles.headerSubtitle}>Productivity Store</Text>
      </View>
      <View style={styles.pointsContainer}>
        <MaterialCommunityIcons name="star-face" size={24} color={COLORS.gold} />
        <Text style={styles.pointsText}>{points}</Text>
      </View>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabContainer}>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'tasks' && styles.activeTab]} 
        onPress={() => setActiveTab('tasks')}
      >
        <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>Tasks</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.tab, activeTab === 'rewards' && styles.activeTab]} 
        onPress={() => setActiveTab('rewards')}
      >
        <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>Rewards</Text>
      </TouchableOpacity>
    </View>
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
      <Text style={[styles.cardText, item.completed && styles.strikethrough]}>
        {item.text}
      </Text>
      {item.completed && <Text style={styles.pointsBadge}>+10</Text>}
      <TouchableOpacity onPress={() => deleteTask(item.id)}>
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
      {renderTabs()}

      <View style={styles.content}>
        {activeTab === 'tasks' ? (
          <>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Add a new task..."
                placeholderTextColor={COLORS.textDim}
                value={taskInput}
                onChangeText={setTaskInput}
              />
              <TouchableOpacity style={styles.addButton} onPress={addTask}>
                <MaterialCommunityIcons name="plus" size={24} color="white" />
              </TouchableOpacity>
            </KeyboardAvoidingView>
            
            <FlatList
              data={tasks}
              renderItem={renderTaskItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={<Text style={styles.emptyText}>No tasks yet. Get to work!</Text>}
            />
          </>
        ) : (
          <>
             <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.inputRow}>
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
            </KeyboardAvoidingView>

            <FlatList
              data={rewards}
              renderItem={renderRewardItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={<Text style={styles.emptyText}>Add rewards you want to buy!</Text>}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  pointsText: {
    color: COLORS.gold,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 5,
  },
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
  inputWrapper: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.card,
    color: COLORS.text,
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    borderRadius: 10,
    marginLeft: 10,
  },
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
    marginTop: 4,
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