// screens/AddUserModal.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';
import { createClient } from '@supabase/supabase-js';

export default function AddUserModal({ visible, onClose, companyId }) {

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [initials, setInitials] = useState('');
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  const handleAddUser = async () => {
    if (!username.trim() || !password.trim() || !initials.trim()) {
      Alert.alert('Missing Fields', 'Please fill out all fields.');
      return;
    }
  
    if (!companyId) {
      Alert.alert('Error', 'Company information not loaded. Please try again.');
      return;
    }
  
    try {
      // Step 1: Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: username.trim(), // username is used as email here
        password: password,
        options: {
          data: {
            company_id: companyId,
            role: 'employee',
          },
        },
      });
  
      if (authError || !authData.user) {
        console.error('Signup error:', authError);
        Alert.alert('Error', 'Failed to create employee account.');
        return;
      }
  
      const userId = authData.user.id;
  
      // Step 2: Insert initials into profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: userId, initials: initials.trim().toUpperCase() }]);
  
      if (profileError) {
        console.error('Profile insertion error:', profileError);
        Alert.alert('Error', 'Failed to save user initials.');
        return;
      }
  
      Alert.alert('Success', 'Employee registered successfully.');
      setUsername('');
      setPassword('');
      setInitials('');
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
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
<TextInput
  style={styles.input}
  placeholder="Initials"
  placeholderTextColor="#777"
  value={initials}
  onChangeText={setInitials}
  autoCapitalize="characters"
  maxLength={5}
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
