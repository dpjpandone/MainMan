// MachineScreen.js

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import ProcedureCard from '../components/ProcedureCard';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supaBaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Calendar } from 'react-native-calendars';

export default function MachineScreen() {
  const route = useRoute();
  const { machineId } = route.params;

  const [machine, setMachine] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [interval, setInterval] = useState('');
  const [description, setDescription] = useState('');
  const [startingDate, setStartingDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadMachineAndProcedures();
    }, [machineId])
  );
      
  const loadMachineAndProcedures = async () => {
    try {
      const { data: machineData, error: machineError } = await supabase
        .from('machines')
        .select('*')
        .eq('id', machineId)
        .single();
  
      if (machineError || !machineData) {
        console.error('Machine fetch error:', machineError);
        return;
      }
  
      const { data: procedureData, error: procedureError } = await supabase
        .from('procedures')
        .select('*')
        .eq('machine_id', machineId)
        .order('last_completed', { ascending: false, nullsFirst: true });
  
      if (procedureError) {
        console.error('Procedure fetch error:', procedureError);
        return;
      }
  
      setMachine(machineData);
      setProcedures(procedureData || []);
    } catch (error) {
      console.error('Error loading machine and procedures:', error);
    }
  };
  
  const markComplete = async (proc) => {
    try {
      const now = new Date();
      const dueDate = new Date();
      dueDate.setDate(now.getDate() + parseInt(proc.interval_days || 0));
  
      const session = await AsyncStorage.getItem('loginData');
      const parsedSession = JSON.parse(session);
  
      const { error } = await supabase
        .from('procedures')
        .update({
          last_completed: now.toISOString(),
          due_date: dueDate.toISOString(),
          completed_by: parsedSession?.userId,
        })
        .eq('id', proc.id);
  
      if (error) {
        console.error('Supabase update error:', error);
        return;
      }
  
      loadMachineAndProcedures();
    } catch (error) {
      console.error('Failed to mark procedure complete:', error);
    }
  };
      
  const deleteProcedure = async (procId) => {
    try {
      const { error } = await supabase
        .from('procedures')
        .delete()
        .eq('id', procId);
  
      if (error) {
        console.error('Supabase delete error:', error.message);
        return;
      }
  
      loadMachineAndProcedures();
    } catch (error) {
      console.error('Failed to delete procedure:', error);
    }
  };
  
 const addProcedure = async () => {
  if (!name.trim() || !interval) return;

  try {
    const session = await AsyncStorage.getItem('loginData');
    const parsedSession = JSON.parse(session);
    const companyId = parsedSession?.companyId;

    if (!companyId) {
      console.error('No companyId found for adding procedure.');
      return;
    }

    const { error } = await supabase
      .from('procedures')
      .insert([{
        machine_id: machineId,
        procedure_name: name.trim(),
        description,
        interval_days: parseInt(interval),
        last_completed: startingDate.toISOString(),
        due_date: null,
        image_urls: [],
        company_id: companyId,
      }]);

    if (error) {
      console.error('Supabase insert error:', error.message);
      return;
    }

    setModalVisible(false);
    setName('');
    setInterval('');
    setDescription('');
    loadMachineAndProcedures();

  } catch (error) {
    console.error('Failed to add procedure:', error);
  }
};
  
  const renderProcedure = ({ item }) => (
    <ProcedureCard
      item={{ ...item, machineId }}
      onComplete={() => markComplete(item)}
      onDelete={deleteProcedure}
      refreshMachine={loadMachineAndProcedures} // ✅ add this line
    />
  );
    
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000" style="light" />
      <Text style={styles.header}>{machine?.name}</Text>

      <FlatList
  data={procedures.filter(p => !p.is_non_routine)}
  keyExtractor={(item) => item.id.toString()}  // ← fix here
  renderItem={renderProcedure}
/>

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Add Procedure</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>New Procedure</Text>

            <TextInput
              placeholder="Procedure Name"
              placeholderTextColor="#777"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
                        <TextInput
              placeholder="Description"
              placeholderTextColor="#777"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
            />

            <TextInput
              placeholder="Interval (days)"
              placeholderTextColor="#777"
              keyboardType="numeric"
              value={interval}
              onChangeText={setInterval}
              style={styles.input}
            />
            <Text style={{ color: '#0f0', marginBottom: 5 }}>Starting Date:</Text>
<TouchableOpacity
  onPress={() => setCalendarVisible(true)}
  style={[styles.input, { justifyContent: 'center' }]}
>
  <Text style={{ color: '#fff' }}>{startingDate.toDateString()}</Text>
</TouchableOpacity>



            <TouchableOpacity style={styles.button} onPress={addProcedure}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
  visible={calendarVisible}
  transparent={true}
  animationType="slide"
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContainer}>
      <Text style={styles.modalTitle}>Select Starting Date</Text>

      <Calendar
        onDayPress={(day) => {
          const selected = new Date(day.dateString);
          setStartingDate(selected);
          setCalendarVisible(false);
        }}
        markedDates={{
          [startingDate.toISOString().split('T')[0]]: {
            selected: true,
            selectedColor: '#0f0'
          }
        }}
        theme={{
          calendarBackground: '#111',
          dayTextColor: '#fff',
          monthTextColor: '#0f0',
          arrowColor: '#0f0',
          selectedDayTextColor: '#000',
          todayTextColor: '#0f0',
        }}
      />

      <TouchableOpacity onPress={() => setCalendarVisible(false)}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>
    </View>
  );
}
