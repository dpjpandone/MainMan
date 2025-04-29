// screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/globalStyles';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function HomeScreen({ navigation }) {
  const [machines, setMachines] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    const fetchCompanyAndMachines = async () => {
      try {
        const session = await AsyncStorage.getItem('loginData');
        const parsedSession = JSON.parse(session);
        const companyId = parsedSession?.companyId;

        if (!companyId) {
          console.error('No companyId found.');
          return;
        }

        setCompanyId(companyId);
        console.log('Loaded companyId:', companyId);

        const { data, error } = await supabase
          .from('machines')
          .select('*')
          .eq('company_id', companyId);

        if (error) {
          console.error('Error fetching machines:', error.message);
        } else {
          setMachines(data);
        }
      } catch (error) {
        console.error('Unexpected error loading machines:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', fetchCompanyAndMachines);
    return unsubscribe;
  }, [navigation]);

  const goToMachine = (machineId) => {
    navigation.navigate('MachineScreen', { machineId });
  };

  const addMachine = async () => {
    if (!newMachineName.trim()) {
      Alert.alert('Error', 'Please enter a machine name.');
      return;
    }
    if (!companyId) {
      Alert.alert('Error', 'Company ID not loaded yet.');
      return;
    }

    console.log('Adding machine for companyId:', companyId);

    try {
      const { data, error } = await supabase
        .from('machines')
        .insert([{ name: newMachineName.trim(), company_id: companyId }])
        .select();

      if (error) {
        console.error('Supabase Insert Error:', error.message);
        Alert.alert('Error', 'Failed to add machine: ' + error.message);
        return;
      }

      console.log('Inserted machine:', data);

      setMachines((prevMachines) => [...prevMachines, ...data]);
      setNewMachineName('');
      setModalVisible(false);
    } catch (error) {
      console.error('Unexpected error adding machine:', error);
      Alert.alert('Error', 'An unexpected error occurred.');
    }
  };

  const deleteMachine = async (id) => {
    Alert.alert(
      'Delete Machine',
      'Are you sure you want to delete this machine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('machines')
                .delete()
                .eq('id', id)
                .eq('company_id', companyId);

              if (error) {
                console.error('Error deleting machine:', error.message);
                Alert.alert('Error', 'Failed to delete machine.');
                return;
              }

              setMachines((prevMachines) => prevMachines.filter((m) => m.id !== id));
            } catch (error) {
              console.error('Unexpected error deleting machine:', error);
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          },
        },
      ]
    );
  };

  const handleDevLogout = async () => {
    await AsyncStorage.removeItem('loginData');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Machines</Text>

      <FlatList
        data={machines}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.machineItem}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => goToMachine(item.id)}
            >
              <Text style={styles.procName}>{item.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMachine(item.id)}>
              <Text style={[styles.buttonText, { color: '#f00', fontSize: 20 }]}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyListText}>No machines added</Text>}
      />

      <TouchableOpacity style={styles.buttonWhite} onPress={handleDevLogout}>
        <Text style={styles.buttonText}>Change Credentials</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Add Machine</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitleOutside}>Enter Machine Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Machine name"
              placeholderTextColor="#888"
              value={newMachineName}
              onChangeText={setNewMachineName}
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.homeModalButton} onPress={addMachine}>
                <Text style={styles.homeModalButtonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.homeModalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.homeModalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
