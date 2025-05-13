import React, { useState, useEffect } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, StatusBar, Keyboard } from 'react-native';
import { styles } from '../styles/globalStyles';

export function CaptionPrompt({ visible, onSubmit, onCancel, initialCaption = '' }) {
  const [caption, setCaption] = useState(initialCaption);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    setCaption(initialCaption || '');
  }, [initialCaption]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const handleSave = () => {
    onSubmit(caption.trim());
    setCaption('');
  };

  const handleClose = () => {
    onCancel();
    setCaption('');
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={{ flex: 1 }}>
            <TextInput
              style={[
                styles.input,
                {
                  textAlignVertical: 'top',
                  padding: 10,
                  height: 220,
                },
              ]}
              placeholder="Enter image caption..."
              placeholderTextColor="#777"
              multiline
              scrollEnabled
              value={caption}
              onChangeText={setCaption}
            />
          </View>

          {!keyboardVisible && (
            <View style={styles.fixedButtonRow}>
              <TouchableOpacity style={styles.fixedButton} onPress={handleSave}>
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.fixedButton, styles.deleteButton]} onPress={handleClose}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
