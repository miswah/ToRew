import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { Alert, AppState, LayoutAnimation, Platform, UIManager } from 'react-native';
import { CONSTANTS } from '../constants/theme';
import { getCurrentDateStr, getWeekNumber } from '../utils/helpers';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const [points, setPoints] = useState(0);
  const [tasks, setTasks] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [popups, setPopups] = useState([]);

  // --- Persistence ---
  useEffect(() => { loadData(); }, []);
  useEffect(() => { saveData(); }, [points, tasks, rewards, challenges, inventory, logs]); // <--- Added logs dependency

  // --- Game Loop & App State (Same as before) ---
  useEffect(() => {
    const interval = setInterval(checkExpirations, 10000);
    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", nextAppState => {
      if (nextAppState === "active") checkForResets();
    });
    return () => subscription.remove();
  }, [tasks, challenges]);

  const saveData = async () => {
    try {
      const data = { points, tasks, rewards, challenges, inventory, logs };
      await AsyncStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify(data));
    } catch (e) { console.error("Save Error", e); }
  };

  const loadData = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(CONSTANTS.STORAGE_KEY);
      if (jsonValue) {
        const data = JSON.parse(jsonValue);
        setPoints(data.points || 0);
        setTasks(data.tasks || []);
        setRewards(data.rewards || []);
        setChallenges(data.challenges || []);
        setInventory(data.inventory || []);
        setLogs(data.logs || []); // <--- Load logs
        checkForResets(data.tasks, data.challenges);
      }
    } catch (e) { console.error("Load Error", e); }
  };

  // --- Logic Helpers (updatePoints, etc. same as before) ---
  const updatePoints = (amount, bonus = 0) => {
    setPoints(prev => Math.max(0, prev + amount + bonus));
    const id = Date.now().toString() + Math.random();
    setPopups(prev => [...prev, { id, value: amount, bonus }]);
  };

  const removePopup = (id) => setPopups(prev => prev.filter(p => p.id !== id));

  // --- Resets & Expirations (Same as before) ---
  const checkForResets = (currentTasks = tasks, currentChallenges = challenges) => {
    const today = getCurrentDateStr();
    const currentWeek = getWeekNumber(new Date());
    let needsUpdate = false;

    const updatedTasks = currentTasks.map(t => {
      if (t.repeatDays.length > 0 && t.completed && t.lastCompletedDate !== today) {
        needsUpdate = true;
        return { ...t, completed: false, failed: false };
      }
      return t;
    });

    const updatedChallenges = currentChallenges.map(c => {
      if (c.type === 'daily' && c.completed && c.lastCompletedDate !== today) {
        needsUpdate = true;
        return { ...c, completed: false };
      }
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

  // --- Actions ---
  const actions = {
    addTask: (taskData) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setTasks([taskData, ...tasks]);
    },
    toggleTask: (id) => {
        setTasks(tasks.map(t => {
            if (t.id === id) {
              if (t.failed) return t;
              const isCompleting = !t.completed;
              if (isCompleting) {
                const bonus = t.streak * 5;
                updatePoints(t.reward, bonus);
                return { ...t, completed: true, streak: t.streak + 1, lastCompletedDate: getCurrentDateStr() };
              } else {
                const prevStreak = Math.max(0, t.streak - 1);
                updatePoints(-(t.reward + (prevStreak * 5)));
                return { ...t, completed: false, streak: prevStreak, lastCompletedDate: null };
              }
            }
            return t;
        }));
    },
    deleteTask: (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setTasks(tasks.filter(t => t.id !== id));
    },
    addChallenge: (challengeData) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setChallenges([challengeData, ...challenges]);
    },
    toggleChallenge: (id) => {
        setChallenges(challenges.map(c => {
            if (c.id === id) {
              const isCompleting = !c.completed;
              const multiplier = c.type === 'daily' ? 10 : 50;
              if (isCompleting) {
                updatePoints(c.reward, c.streak * multiplier);
                return { ...c, completed: true, streak: c.streak + 1, lastCompletedDate: getCurrentDateStr(), lastCompletedWeek: getWeekNumber(new Date()) };
              } else {
                const prevStreak = Math.max(0, c.streak - 1);
                updatePoints(-(c.reward + (prevStreak * multiplier)));
                return { ...c, completed: false, streak: prevStreak };
              }
            }
            return c;
        }));
    },
    deleteChallenge: (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setChallenges(challenges.filter(c => c.id !== id));
    },
    addReward: (rewardData) => setRewards([...rewards, rewardData]),
    buyReward: (r) => {
        if (points >= r.cost) {
          updatePoints(-r.cost);
          const inventoryItem = { ...r, instanceId: Date.now().toString(), purchaseDate: new Date().toLocaleDateString() };
          setInventory([inventoryItem, ...inventory]);
          Alert.alert("Purchased!", `${r.text} added to Inventory.`);
        } else Alert.alert("Locked", "Not enough XP");
    },
    redeemInventoryItem: (item) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setInventory(inventory.filter(i => i.instanceId !== item.instanceId));
        Alert.alert("Success", "Reward redeemed. Enjoy!");
    },
    deleteRewardStoreItem: (id) => setRewards(rewards.filter(r => r.id !== id)),
    
    addLog: (entry) => {
        const today = getCurrentDateStr();
        // Check if user already logged today to give bonus
        const alreadyLoggedToday = logs.some(l => l.date === today);
        
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setLogs([entry, ...logs]);

        if (!alreadyLoggedToday) {
            updatePoints(5);
            Alert.alert("Journal Saved", "You earned +5 XP for your first entry today!");
        } else {
            Alert.alert("Journal Saved", "Entry recorded.");
        }
    },
    deleteLog: (id) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
        setLogs(logs.filter(l => l.id !== id));
    },
    removePopup
  };

  return (
    <GameContext.Provider value={{ points, tasks, challenges, rewards, inventory, logs, popups, ...actions }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => useContext(GameContext);