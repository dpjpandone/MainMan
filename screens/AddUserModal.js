// screens/AddUserModal.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

export default function AddUserModal({ visible, onClose, companyId }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleAddUser = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill out all fields.');
      return;
    }

    if (!companyId) {
      Alert.alert('Error', 'Company information not loaded. Please try again.');
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          role: 'employee',
          companyId: companyId,  // ✅ Now using passed prop correctly
        }),
      });

      if (!response.ok) {
        console.error('User creation failed:', await response.text());
        Alert.alert('Error', 'Failed to create user.');
        return;
      }

      Alert.alert('Success', 'Employee registered successfully.');
      setUsername('');
      setPassword('');
      onClose();
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register user.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitleOutside}>Add New Employee</Text>

          <TextInput
            style={styles.input}
            placeholder="Employee Username"
            placeholderTextColor="#777"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Employee Password"
            placeholderTextColor="#777"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleAddUser}>
            <Text style={styles.buttonText}>Add User</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
