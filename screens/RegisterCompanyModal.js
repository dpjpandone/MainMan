// screens/RegisterCompanyModal.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

export default function RegisterCompanyModal({ visible, onClose }) {
  const [companyName, setCompanyName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleRegister = async () => {
    if (!companyName.trim() || !adminUsername.trim() || !adminPassword.trim()) {
      Alert.alert('Missing Fields', 'Please fill out all fields.');
      return;
    }

    try {
      // Step 1: Create the company
      const companyResponse = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          companyName: companyName.trim(),
          adminPassword: adminPassword.trim(),
        }),
      });

      const companyData = await companyResponse.json();

      if (!companyResponse.ok || !companyData[0]) {
        console.error('Company creation failed:', companyData);
        Alert.alert('Error', 'Failed to create company.');
        return;
      }

      const companyId = companyData[0].id;

      // Step 2: Create the admin user
      const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          username: adminUsername.trim(),
          password: adminPassword.trim(),
          role: 'admin',
          companyId: companyId,
        }),
      });

      if (!userResponse.ok) {
        console.error('Admin user creation failed:', await userResponse.text());
        Alert.alert('Error', 'Failed to create admin user.');
        return;
      }

      Alert.alert('Success', 'Company and admin user registered successfully.');

      setCompanyName('');
      setAdminUsername('');
      setAdminPassword('');
      onClose();
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Registration failed.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitleOutside}>Register New Company</Text>

          <TextInput
            style={styles.input}
            placeholder="Company Name"
            placeholderTextColor="#777"
            value={companyName}
            onChangeText={setCompanyName}
          />
          <TextInput
            style={styles.input}
            placeholder="Admin Username"
            placeholderTextColor="#777"
            value={adminUsername}
            onChangeText={setAdminUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Admin Password"
            placeholderTextColor="#777"
            secureTextEntry
            value={adminPassword}
            onChangeText={setAdminPassword}
          />

          <TouchableOpacity style={styles.button} onPress={handleRegister}>
            <Text style={styles.buttonText}>Submit</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
