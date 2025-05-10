import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSync } from './SyncContext';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function SoftSyncWarning({ autoDismiss = true, duration = 3000 }) {
  const { syncFailed, syncAcknowledged } = useSync();
  const [visible, setVisible] = useState(false);
  const translateY = useSharedValue(-50);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    if (syncFailed && !syncAcknowledged) {
      setVisible(true);
      translateY.value = withTiming(0, { duration: 300 });
  
      if (autoDismiss) {
        setTimeout(() => {
          translateY.value = withTiming(-50, { duration: 300 });
          setVisible(false);
        }, duration);
      }
    }
  }, [syncFailed, syncAcknowledged]);
  
  if (!visible) return null;

  return (
<Animated.View style={[styles.banner, animatedStyle]}>
<Text style={styles.text}>⚠️ Sync issue detected. Retrying...</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    width: SCREEN_WIDTH,
    backgroundColor: '#222',
    borderBottomWidth: 1,
    borderBottomColor: '#f00',
    zIndex: 9999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#f00',
    fontSize: 13,
    fontFamily: 'Courier',
  },
});
