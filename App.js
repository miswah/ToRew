import { useState } from 'react';
import { Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import HeroSection from './src/components/hero/HeroSection';
import { COLORS } from './src/constants/theme';
import { GameProvider } from './src/context/GameContext';
import ChallengesScreen from './src/screens/ChallengesScreen';
import RewardsScreen from './src/screens/RewardsScreen';
import TasksScreen from './src/screens/TasksScreen';

function MainLayout() {
  const [activeTab, setActiveTab] = useState('tasks');

  const renderContent = () => {
    switch (activeTab) {
      case 'tasks': return <TasksScreen />;
      case 'challenges': return <ChallengesScreen />;
      case 'rewards': return <RewardsScreen />;
      default: return <TasksScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      
      <HeroSection />

      <View style={styles.tabContainer}>
        {['tasks', 'challenges', 'rewards'].map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.content}>
        {renderContent()}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <GameProvider>
      <MainLayout />
    </GameProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, paddingTop: Platform.OS === 'android' ? 30 : 0 },
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, backgroundColor: '#333', borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.textDim, fontWeight: '600', fontSize: 12 },
  activeTabText: { color: 'white' },
  content: { flex: 1, paddingHorizontal: 20 },
});