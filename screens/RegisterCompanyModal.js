// screens/RegisterCompanyModal.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

export default function RegisterCompanyModal({ visible, onClose }) {
  const [companyName, setCompanyName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');

  const handleRegister = async () => {
    if (!companyName.trim() || !adminPassword.trim() || !employeePassword.trim()) {
      Alert.alert('Missing Fields', 'Please fill out all fields.');
      return;
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        companyName: companyName.trim(),
        adminPassword: adminPassword.trim(),
        employeePassword: employeePassword.trim(),
      }),
    });

    if (response.ok) {
      Alert.alert('Success', 'Company registered successfully.');
      setCompanyName('');
      setAdminPassword('');
      setEmployeePassword('');
      onClose();
    } else {
      console.error(await response.text());
      Alert.alert('Error', 'Failed to register company.');
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
            placeholder="Admin Password"
            placeholderTextColor="#777"
            secureTextEntry
            value={adminPassword}
            onChangeText={setAdminPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Employee Password"
            placeholderTextColor="#777"
            secureTextEntry
            value={employeePassword}
            onChangeText={setEmployeePassword}
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
