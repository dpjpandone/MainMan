// screens/LoginScreen.js

import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppContext } from '../contexts/AppContext';
import RegisterCompanyModal from './RegisterCompanyModal';
import AddUserModal from './AddUserModal';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function LoginScreen({ navigation }) {
  const { loginData, setLoginData } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRegisterCompanyModal, setShowRegisterCompanyModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('Login error:', error);
        Alert.alert('Login Failed', 'Invalid email or password.');
        return;
      }

      const user = data.user;
      const companyId = user?.user_metadata?.company_id;
      const role = user?.user_metadata?.role;
      const username = user?.user_metadata?.username || '';

      if (!companyId || !role) {
        Alert.alert('Login Error', 'Missing company or role information.');
        return;
      }

      const sessionData = {
        companyId,
        userId: user.id,
        username,
        role,
      };

      await AsyncStorage.setItem('loginData', JSON.stringify(sessionData));
      setLoginData(sessionData);

      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],  // ✅ fixed!
      });

    } catch (error) {
      console.error('Unexpected login error:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#777"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#777"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowRegisterCompanyModal(true)}>
        <Text style={{ color: '#0f0', textAlign: 'center', marginTop: 20 }}>
          Register Company
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowAddUserModal(true)}>
        <Text style={{ color: '#0f0', textAlign: 'center', marginTop: 20 }}>
          Add New User
        </Text>
      </TouchableOpacity>

      {/* 🔥 Modals */}
      {showRegisterCompanyModal && (
        <RegisterCompanyModal
          visible={showRegisterCompanyModal}
          onClose={() => setShowRegisterCompanyModal(false)}
        />
      )}

      {showAddUserModal && loginData && (
        <AddUserModal
          visible={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          companyId={loginData.companyId}
        />
      )}

      {/* DEV Button */}
      <TouchableOpacity onPress={() => {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],  // ✅ fixed here too!
        });
      }}>
        <Text style={{ color: '#0f0', textAlign: 'center', marginTop: 40 }}>
          [DEV] Go To Main Tabs
        </Text>
      </TouchableOpacity>

    </View>
  );
}
