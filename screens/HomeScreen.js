// screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
              <Text style={styles.machineText}>{item.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMachine(item.id)}>
              <Text style={styles.delete}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No machines added</Text>}
      />
      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Add Machine</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Enter Machine Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Machine name"
              placeholderTextColor="#888"
              value={newMachineName}
              onChangeText={setNewMachineName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.button} onPress={addMachine}>
                <Text style={styles.buttonText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: '#333' }]} 
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  header: {
    color: '#0f0',
    fontSize: 24,
    marginBottom: 16,
    textAlign: 'center',
  },
  machineItem: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 6,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  machineText: {
    color: '#fff',
    fontSize: 16,
  },
  delete: {
    color: '#f00',
    fontSize: 20,
    paddingHorizontal: 10,
  },
  empty: {
    color: '#666',
    textAlign: 'center',
    marginTop: 30,
  },
  addButton: {
    backgroundColor: '#0f0',
    padding: 14,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#111',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    color: '#0f0',
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#0f0',
    padding: 10,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
  },
});
