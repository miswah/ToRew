import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text } from 'react-native';
import { COLORS } from '../../constants/theme';

export default function PointPopup({ id, value, bonus, onFinish }) {
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
}

const styles = StyleSheet.create({
  popupContainer: { position: 'absolute', top: 10, right: 10, width: 150, alignItems: 'flex-end', zIndex: 99 },
  popupText: { fontSize: 20, fontWeight: '900', textAlign: 'right', textShadowColor: 'black', textShadowRadius: 5 },
});