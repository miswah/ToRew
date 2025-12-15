import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, CONSTANTS } from '../../constants/theme';
import { useGame } from '../../context/GameContext';
import PointPopup from '../common/PointPopup';

export default function HeroSection() {
  const { points, tasks, popups, removePopup } = useGame();

  const currentLevel = Math.floor(points / CONSTANTS.LEVEL_THRESHOLD) + 1;
  const xpTowardsNext = points % CONSTANTS.LEVEL_THRESHOLD;
  const levelProgress = (xpTowardsNext / CONSTANTS.LEVEL_THRESHOLD) * 100;

  const todayIndex = new Date().getDay();
  const dailyTasks = tasks.filter(t => t.repeatDays.length === 0 || t.repeatDays.includes(todayIndex));
  const totalDaily = dailyTasks.length;
  const completedDaily = dailyTasks.filter(t => t.completed).length;
  const dailyPercent = totalDaily === 0 ? 0 : (completedDaily / totalDaily) * 100;

  return (
    <View style={styles.heroContainer}>
      <View style={styles.heroTop}>
        <View>
          <Text style={styles.heroTitle}>GAMIFY<Text style={{color: COLORS.primary}}>LIFE</Text></Text>
          <Text style={styles.heroDate}>{new Date().toDateString()}</Text>
        </View>
        <View style={styles.pointsAnchor}>
          {popups.map(p => <PointPopup key={p.id} {...p} onFinish={removePopup} />)}
          <View style={styles.streakBadgeHeader}>
             <MaterialCommunityIcons name="star" size={20} color={COLORS.gold} />
          </View>
        </View>
      </View>

      <View style={styles.levelCard}>
        <View style={styles.levelBadge}>
          <Text style={styles.levelLabel}>LVL</Text>
          <Text style={styles.levelValue}>{currentLevel}</Text>
        </View>
        <View style={styles.xpSection}>
          <View style={styles.xpTextRow}>
            <Text style={styles.xpLabel}>Experience</Text>
            <Text style={styles.xpValue}>{xpTowardsNext} <Text style={{color: '#666'}}>/</Text> {CONSTANTS.LEVEL_THRESHOLD} XP</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${levelProgress}%`, backgroundColor: COLORS.gold }]} />
          </View>
        </View>
      </View>

      <View style={styles.dailyTracker}>
        <View style={styles.trackerRow}>
          <Text style={styles.trackerLabel}>Daily Quests</Text>
          <Text style={styles.trackerValue}>{completedDaily}/{totalDaily}</Text>
        </View>
        <View style={[styles.progressBarBg, { height: 6, marginTop: 5, backgroundColor: '#333' }]}>
          <View style={[styles.progressBarFill, { width: `${dailyPercent}%`, backgroundColor: COLORS.secondary }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  heroContainer: { backgroundColor: COLORS.card, padding: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8, marginBottom: 15, zIndex: 10 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  heroTitle: { fontSize: 22, fontWeight: '900', color: 'white', letterSpacing: 1 },
  heroDate: { color: COLORS.textDim, fontSize: 12, marginTop: 2, textTransform: 'uppercase', fontWeight: '600' },
  pointsAnchor: { position: 'relative', alignItems: 'flex-end', justifyContent: 'center', width: 60 },
  streakBadgeHeader: { backgroundColor: '#332200', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255, 152, 0, 0.3)' },
  levelCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  levelBadge: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: COLORS.primary, marginRight: 15 },
  levelLabel: { fontSize: 10, color: COLORS.textDim, fontWeight: 'bold' },
  levelValue: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  xpSection: { flex: 1 },
  xpTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel: { color: COLORS.textDim, fontSize: 12, fontWeight: '600' },
  xpValue: { color: COLORS.gold, fontSize: 12, fontWeight: 'bold' },
  progressBarBg: { height: 10, backgroundColor: '#111', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 5 },
  dailyTracker: { backgroundColor: '#252525', borderRadius: 12, padding: 12 },
  trackerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  trackerLabel: { color: 'white', fontSize: 12, fontWeight: '600' },
  trackerValue: { color: COLORS.secondary, fontSize: 12, fontWeight: 'bold' },
});