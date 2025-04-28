// screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/globalStyles';

export default function HomeScreen({ navigation }) {
  const [machines, setMachines] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');

  useEffect(() => {
    const fetchMachines = async () => {
      const data = await AsyncStorage.getItem('machines');
      if (data) {
        setMachines(JSON.parse(data));
      }
    };

    const unsubscribe = navigation.addListener('focus', fetchMachines);
    return unsubscribe;
  }, [navigation]);

  const goToMachine = (machineId) => {
    navigation.navigate('Machine', { machineId });
  };

  const addMachine = async () => {
    if (!newMachineName.trim()) return;
    const newMachine = {
      id: Date.now().toString(),
      name: newMachineName.trim(),
      procedures: [],
      createdAt: new Date().toISOString(),
    };

    const updatedMachines = [...machines, newMachine];
    await AsyncStorage.setItem('machines', JSON.stringify(updatedMachines));
    setMachines(updatedMachines);
    setNewMachineName('');
    setModalVisible(false);
  };

  const deleteMachine = (id) => {
    const machine = machines.find((m) => m.id === id);
    if (!machine) return;

    Alert.alert(
      'Delete Machine',
      `Are you sure you want to delete "${machine.name}"? This will remove all associated procedures.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedMachines = machines.filter((m) => m.id !== id);
            await AsyncStorage.setItem('machines', JSON.stringify(updatedMachines));
            setMachines(updatedMachines);
          },
        },
      ]
    );
  };

  const handleDevLogout = async () => {
    await AsyncStorage.removeItem('loginData'); // only removes login
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
