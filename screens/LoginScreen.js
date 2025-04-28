// screens/LoginScreen.js
import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppContext } from '../contexts/AppContext';
import RegisterCompanyModal from './RegisterCompanyModal';
import AddUserModal from './AddUserModal';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

export default function LoginScreen({ navigation }) {
  const { loginData, setLoginData } = useContext(AppContext);
  const [companyName, setCompanyName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showRegisterCompanyModal, setShowRegisterCompanyModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  const handleLogin = async () => {
    if (!companyName.trim() || !username.trim() || !password.trim()) {
      Alert.alert('Missing Fields', 'Please fill out all fields.');
      return;
    }

    try {
      // Step 1: Lookup company by companyName
      const companyResponse = await fetch(`${SUPABASE_URL}/rest/v1/companies?companyName=eq.${companyName.trim()}`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });

      const companyData = await companyResponse.json();

      if (companyData.length === 0) {
        Alert.alert('Error', 'Company not found.');
        return;
      }

      const company = companyData[0];

      // Step 2: Lookup user by username and companyId
      const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${username.trim()}&companyId=eq.${company.id}`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });

      const userData = await userResponse.json();

      if (userData.length === 0) {
        Alert.alert('Error', 'User not found for this company.');
        return;
      }

      const user = userData[0];

      // Step 3: Verify password
      if (password.trim() !== user.password) {
        Alert.alert('Error', 'Invalid password.');
        return;
      }

      // Step 4: Save login session
      const sessionData = {
        companyId: company.id,
        companyName: company.companyName,
        userId: user.id,
        username: user.username,
        role: user.role,
      };

      await AsyncStorage.setItem('loginData', JSON.stringify(sessionData));
      setLoginData(sessionData); // ✅ Now in memory

      // Step 5: Navigate to Home
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });

    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert('Error', 'Failed to login.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Company Name"
        placeholderTextColor="#777"
        value={companyName}
        onChangeText={setCompanyName}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#777"
        value={username}
        onChangeText={setUsername}
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
          companyId={loginData.companyId} // ✅ Correctly passed from memory
        />
      )}
      <TouchableOpacity onPress={() => {
  navigation.reset({
    index: 0,
    routes: [{ name: 'Home' }],
  });
}}>
  <Text style={{ color: '#0f0', textAlign: 'center', marginTop: 40 }}>
    [DEV] Go To Home Screen
  </Text>
</TouchableOpacity>

    </View>
  );
}
