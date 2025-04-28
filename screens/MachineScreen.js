//  MachineScreen.js

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import ProcedureCard from '../components/ProcedureCard';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY } from '../utils/supaBaseConfig';

export default function MachineScreen() {
  const route = useRoute();
  const { machineId } = route.params;
  const [machine, setMachine] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [interval, setInterval] = useState('');
  const [description, setDescription] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadMachine();
    }, [machineId])
  );

  const loadMachine = async () => {
    const data = await AsyncStorage.getItem('machines');
    if (!data) return;
    const machines = JSON.parse(data);
    const found = machines.find((m) => m.id === machineId);
    if (!found) return;
  
    found.procedures = [...(found.procedures || [])].sort((a, b) => {
      const now = new Date();
    
      const getOverdueDays = (proc) => {
        if (!proc.lastCompleted) return Infinity;
        const last = new Date(proc.lastCompleted);
        return (now - last) / (1000 * 60 * 60 * 24) - proc.intervalDays;
      };
    
      return getOverdueDays(b) - getOverdueDays(a); // Descending
    });
    

  
    console.log('🔍 [loadMachine] Machine loaded:', found);
    console.log('🔍 [loadMachine] Procedures after filtering:', found.procedures);
  
    setMachine(found);
  };
  

  const markComplete = async (procId) => {
    const data = await AsyncStorage.getItem('machines');
    const machines = JSON.parse(data);
    const updated = machines.map((m) => {
      if (m.id !== machineId) return m;
      return {
        ...m,
        procedures: m.procedures.filter((p) => {
          if (p.id !== procId) return true;
          p.lastCompleted = new Date().toISOString();
          return true;
        })
      };
    });
    await AsyncStorage.setItem('machines', JSON.stringify(updated));
    loadMachine();
  };

  const deleteProcedure = async (procId) => {
    const data = await AsyncStorage.getItem('machines');
    const machines = JSON.parse(data);
    const updated = machines.map((m) => {
      if (m.id !== machineId) return m;
      return {
        ...m,
        procedures: m.procedures.filter((p) => p.id !== procId)
      };
    });
    await AsyncStorage.setItem('machines', JSON.stringify(updated));
    loadMachine();
  };

  const addProcedure = async () => {
    if (!name.trim() || !interval) return;
    const newProc = {
      id: `${Date.now()}`,
      name: name.trim(),
      intervalDays: parseInt(interval),
      description,
      lastCompleted: null,
    };
    const data = await AsyncStorage.getItem('machines');
    const machines = JSON.parse(data);
    const updated = machines.map((m) =>
      m.id === machineId ? { ...m, procedures: [...m.procedures, newProc] } : m
    );
    await AsyncStorage.setItem('machines', JSON.stringify(updated));
    setModalVisible(false);
    setName(''); setInterval(''); setDescription('');
    loadMachine();
  };

  const renderProcedure = ({ item }) => (
    <ProcedureCard item={{ ...item, machineId }} onComplete={markComplete} onDelete={deleteProcedure} refreshMachine={loadMachine} />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{machine?.name}</Text>
       <FlatList data={(machine?.procedures || []).filter(p => !p.isNonRoutine)}
        keyExtractor={(item) => item.id}
         renderItem={renderProcedure}
/>

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Add Procedure</Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>New Procedure</Text>
            <TextInput placeholder="Procedure Name" placeholderTextColor="#777" value={name} onChangeText={setName} style={styles.input} />
            <TextInput placeholder="Interval (days)" placeholderTextColor="#777" keyboardType="numeric" value={interval} onChangeText={setInterval} style={styles.input} />
            <TextInput placeholder="Description" placeholderTextColor="#777" value={description} onChangeText={setDescription} style={styles.input} />
            <TouchableOpacity style={styles.button} onPress={addProcedure}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}




