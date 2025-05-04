// screens/LoginScreen.js

import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store'; // 🔥 New!
import { AppContext } from '../contexts/AppContext';
import RegisterCompanyModal from './RegisterCompanyModal';
import AddUserModal from './AddUserModal';
import { supabase } from '../utils/supaBaseConfig';

export default function LoginScreen({ navigation }) {
  const { loginData, setLoginData } = useContext(AppContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showRegisterCompanyModal, setShowRegisterCompanyModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [rememberMe, setRememberMe] = useState(true); // default = true

  useEffect(() => {
  
    const checkStoredCredentials = async () => {
      try {
        const storedEmail = await SecureStore.getItemAsync('storedEmail');
        const storedPassword = await SecureStore.getItemAsync('storedPassword');
  
        if (storedEmail && storedPassword) {
          console.log('Stored credentials found. Pre-filling login fields...');
          setEmail(storedEmail);
          setPassword(storedPassword);
        }
      } catch (error) {
        console.error('Error accessing stored credentials:', error);
      }
    };
  
    checkStoredCredentials();
  }, []);
  
  const handleLogin = async (providedEmail, providedPassword, autoLogin = false) => {
    const loginEmail = providedEmail || email;
    const loginPassword = providedPassword || password;

    if (!loginEmail.trim() || !loginPassword.trim()) {
      if (!autoLogin) {
        Alert.alert('Missing Fields', 'Please enter your email and password.');
      }
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        console.error('Login error:', error);
        if (!autoLogin) {
          Alert.alert('Login Failed', 'Invalid email or password.');
        }
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

      // 🔥 Store credentials securely after successful login
      if (!autoLogin) {
        await SecureStore.setItemAsync('storedEmail', loginEmail.trim());
        await SecureStore.setItemAsync('storedPassword', loginPassword);
        console.log('Credentials stored securely.');
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });

    } catch (error) {
      console.error('Unexpected login error:', error);
      if (!autoLogin) {
        Alert.alert('Error', 'An unexpected error occurred.');
      }
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
<TouchableOpacity
  onPress={() => setRememberMe(!rememberMe)}
  style={styles.rememberMeWrapper}
>
  <Text style={styles.rememberMeToggle}>
    [ {rememberMe ? 'x' : ' '} ] Remember Me
  </Text>
</TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => handleLogin()}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowRegisterCompanyModal(true)}>
        <Text style={{ color: '#0f0', textAlign: 'center', marginTop: 20 }}>
          Register Company
        </Text>
      </TouchableOpacity>

      {loginData?.role === 'admin' && (
  <TouchableOpacity onPress={() => setShowAddUserModal(true)}>
    <Text style={{ color: '#0f0', textAlign: 'center', marginTop: 20 }}>
      Add New User
    </Text>
  </TouchableOpacity>
)}

      {/* 🔥 Modals */}
      {showRegisterCompanyModal && (
        <RegisterCompanyModal
          visible={showRegisterCompanyModal}
          onClose={() => setShowRegisterCompanyModal(false)}
        />
      )}

      {showAddUserModal && loginData?.role === 'admin' && (
        <AddUserModal
          visible={showAddUserModal}
          onClose={() => setShowAddUserModal(false)}
          companyId={loginData.companyId}
        />
      )}

{loginData?.role === 'admin' && (
  <TouchableOpacity
    onPress={async () => {
      await AsyncStorage.removeItem('loginData');
      setLoginData(null);
    }}
  >
    <Text style={{ color: '#FF0000', textAlign: 'center', marginTop: 20 }}>
      [ Log Out ]
    </Text>
  </TouchableOpacity>
)}


    </View>
  );
}
