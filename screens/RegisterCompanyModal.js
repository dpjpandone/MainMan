// screens/RegisterCompanyModal.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function RegisterCompanyModal({ visible, onClose }) {
  const [companyName, setCompanyName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!companyName.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      Alert.alert('Missing Fields', 'Please fill out all fields.');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Insert company into companies table
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ company_name: companyName.trim() }])
        .select()
        .single(); // get inserted row back

      if (companyError) {
        console.error('Company creation error:', companyError);
        Alert.alert('Error', 'Failed to create company.');
        setLoading(false);
        return;
      }

      const companyId = companyData.id;

      // Step 2: Create Admin User in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail.trim(),
        password: adminPassword,
        options: {
          data: {
            company_id: companyId,
            role: 'admin',
          },
        },
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        Alert.alert('Error', 'Failed to create admin account.');
        setLoading(false);
        return;
      }

      Alert.alert('Success', 'Company registered and Admin account created.');
      
      // Clear fields
      setCompanyName('');
      setAdminEmail('');
      setAdminPassword('');

      // Close the modal (navigation happens outside if needed)
      onClose();

    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitleOutside}>Register New Company</Text>

          <TextInput
            style={styles.input}
            placeholder="Company Name"
            placeholderTextColor="#888"
            value={companyName}
            onChangeText={setCompanyName}
          />
          <TextInput
            style={styles.input}
            placeholder="Admin Email"
            placeholderTextColor="#888"
            value={adminEmail}
            onChangeText={setAdminEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Admin Password"
            placeholderTextColor="#888"
            value={adminPassword}
            onChangeText={setAdminPassword}
            secureTextEntry
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.homeModalButton, loading && { opacity: 0.5 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.homeModalButtonText}>Register</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.homeModalCancelButton} onPress={onClose}>
              <Text style={styles.homeModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
