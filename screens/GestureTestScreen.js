// screens/GestureTestScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';

export default function GestureTestScreen() {
  const onGestureEvent = (event) => {
    console.log('🖐️ Pan Gesture:', event.nativeEvent.translationX, event.nativeEvent.translationY);
  };

  return (
    <PanGestureHandler onGestureEvent={onGestureEvent}>
      <View style={styles.container}>
        <Text style={styles.text}>Drag anywhere — check console logs</Text>
      </View>
    </PanGestureHandler>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  text: { color: '#0f0', fontSize: 18, textAlign: 'center', padding: 20 }
});
