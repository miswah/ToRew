import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../constants/theme';
import { useGame } from '../context/GameContext';

export default function RewardsScreen() {
  const { rewards, inventory, points, addReward, buyReward, redeemInventoryItem, deleteRewardStoreItem } = useGame();
  const [rewardName, setRewardName] = useState('');
  const [rewardCost, setRewardCost] = useState('');

  const handleAdd = () => {
    if (!rewardName || !rewardCost) return;
    addReward({ id: Date.now().toString(), text: rewardName, cost: parseInt(rewardCost) });
    setRewardName(''); setRewardCost('');
  };

  const handleRedeem = (item) => {
    Alert.alert("Redeem Item", `Use "${item.text}" now?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Redeem", onPress: () => redeemInventoryItem(item) }
    ]);
  };

  return (
    <ScrollView contentContainerStyle={{paddingBottom: 100}}>
      {inventory.length > 0 && (
        <View style={styles.inventoryContainer}>
          <Text style={styles.sectionHeader}>My Inventory</Text>
          {inventory.map((item) => (
            <View key={item.instanceId} style={styles.inventoryCard}>
              <View style={{flex: 1}}>
                <Text style={styles.cardText}>{item.text}</Text>
                <Text style={{color: COLORS.textDim, fontSize: 10}}>Bought: {item.purchaseDate}</Text>
              </View>
              <TouchableOpacity style={styles.redeemButton} onPress={() => handleRedeem(item)}>
                <Text style={styles.redeemText}>Redeem</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionHeader}>Shop</Text>
      <View style={styles.inputRow}>
        <TextInput style={[styles.input, {flex: 2}]} placeholder="Reward Name" placeholderTextColor={COLORS.textDim} value={rewardName} onChangeText={setRewardName} />
        <TextInput style={[styles.input, {flex: 1, marginLeft: 10}]} placeholder="Cost" placeholderTextColor={COLORS.textDim} keyboardType="numeric" value={rewardCost} onChangeText={setRewardCost} />
        <TouchableOpacity style={[styles.addButton, {marginLeft: 10}]} onPress={handleAdd}>
            <MaterialCommunityIcons name="plus" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {rewards.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={{flex: 1}}>
            <Text style={styles.cardText}>{item.text}</Text>
            <Text style={{color: COLORS.gold, fontSize: 12}}>{item.cost} XP</Text>
          </View>
          <TouchableOpacity style={[styles.buyButton, points < item.cost && {backgroundColor: '#444'}]} onPress={() => buyReward(item)} disabled={points < item.cost}>
            <Text style={{color: 'white', fontWeight: 'bold', fontSize: 12}}>Buy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteRewardStoreItem(item.id)} style={{marginLeft: 15}}>
            <MaterialCommunityIcons name="close" size={20} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  inventoryContainer: { marginBottom: 20 },
  inventoryCard: { backgroundColor: '#252525', borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, borderLeftColor: COLORS.green },
  redeemButton: { backgroundColor: COLORS.green, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  redeemText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  sectionHeader: { color: COLORS.textDim, fontSize: 14, fontWeight: 'bold', marginBottom: 10, marginTop: 5, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  input: { flex: 1, backgroundColor: COLORS.card, color: 'white', padding: 15, borderRadius: 10 },
  addButton: { backgroundColor: COLORS.secondary, width: 50, height: 50, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  card: { backgroundColor: COLORS.card, borderRadius: 12, padding: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  cardText: { color: 'white', fontSize: 16, fontWeight: '500' },
  buyButton: { backgroundColor: COLORS.primary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
});