// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RegisterCompanyModal from './RegisterCompanyModal';

export default function LoginScreen({ navigation }) {
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showRegisterCompanyModal, setShowRegisterCompanyModal] = useState(false);

  const handleLogin = async () => {
    if (!companyName.trim() || !password.trim() || !username.trim()) {
      Alert.alert('Missing Fields', 'Please fill out all fields.');
      return;
    }

    const loginData = {
      companyName: companyName.trim(),
      password: password.trim(),
      username: username.trim(),
    };

    try {
      await AsyncStorage.setItem('loginData', JSON.stringify(loginData));
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Failed to save login data:', error);
      Alert.alert('Error', 'Failed to save login data.');
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
        placeholder="Password"
        placeholderTextColor="#777"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#777"
        value={username}
        onChangeText={setUsername}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowRegisterCompanyModal(true)}>
        <Text style={{ color: '#0f0', textAlign: 'center', marginTop: 20 }}>
          Register Company
        </Text>
      </TouchableOpacity>

      {/* 🔥 Modal must be inside the View */}
      {showRegisterCompanyModal && (
        <RegisterCompanyModal 
          visible={showRegisterCompanyModal}
          onClose={() => setShowRegisterCompanyModal(false)}
        />
      )}
    </View>
  );
}
