import React, { useState, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import {
  View,
  StyleSheet,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../styles/globalStyles';


export default function MasterCalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [machines, setMachines] = useState([]);
  const [selectedMachine, setSelectedMachine] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [procedureDescription, setProcedureDescription] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [nonRoutineProcedures, setNonRoutineProcedures] = useState([]);
  const navigation = useNavigation();
  
  const deleteNonRoutineProcedure = async (procId, machineId) => {
    const data = await AsyncStorage.getItem('machines');
    const machinesList = data ? JSON.parse(data) : [];
  
    const updatedMachines = machinesList.map((m) => {
      if (m.id !== machineId) return m;
      return {
        ...m,
        procedures: m.procedures.filter((p) => p.id !== procId)
      };
    });
  
    await AsyncStorage.setItem('machines', JSON.stringify(updatedMachines));
    loadNonRoutineProcedures(updatedMachines);
  };
  

  // Load machines from AsyncStorage
  const loadMachines = async () => {
    const data = await AsyncStorage.getItem('machines');
    if (data) {
      const machinesList = JSON.parse(data);
      setMachines(machinesList);
      loadNonRoutineProcedures(machinesList);
    }
  };

  // Load non-routine procedures from machines
  const loadNonRoutineProcedures = (machinesList) => {
    const procedures = [];
    machinesList.forEach((machine) => {
      machine.procedures.forEach((proc) => {
        if (proc.isNonRoutine && proc.dueDate) {
          const dueDate = new Date(proc.dueDate);
          const now = new Date();
          const diffDays = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
          const item = { ...proc, machineId: machine.id, machineName: machine.name, dueDate };


          if (diffDays < 0) {
            item.status = 'Past Due';
            item.color = 'red';
          } else if (diffDays < 30) {
            item.status = `Due in ${diffDays} days`;
            item.color = 'orange';
          } else {
            item.status = `Due in ${diffDays} days`;
            item.color = 'blue';
          }

          procedures.push(item);
        }
      });
    });
    setNonRoutineProcedures(procedures);  // Update the state to re-render the list
  };

  // Schedule a new procedure (non-routine)
  const scheduleProcedure = async () => {
    if (!selectedDate || !selectedMachine || !procedureName.trim()) {
      Alert.alert('Please select a machine and enter a procedure name.');
      return;
    }

    const machinesData = await AsyncStorage.getItem('machines');
    const machinesList = machinesData ? JSON.parse(machinesData) : [];

    const machineIndex = machinesList.findIndex(m => m.id === selectedMachine);
    if (machineIndex === -1) return;

    const newProcedure = {
      id: `${Date.now()}`,
      name: procedureName.trim(),
      description: procedureDescription.trim() || 'Scheduled from calendar',
      intervalDays: 0,
      dueDate: selectedDate,
      lastCompleted: null,
      isNonRoutine: true,
    };



    // Update the procedure list for the selected machine
    machinesList[machineIndex].procedures.push(newProcedure);

    // Save updated machines list
    await AsyncStorage.setItem('machines', JSON.stringify(machinesList));

    // After saving the new procedure, reload the non-routine procedures list
    loadNonRoutineProcedures(machinesList);

    setModalVisible(false);
    setSelectedMachine('');
    setProcedureName('');
    setProcedureDescription('');
  };

  useEffect(() => {
    loadMachines();
  }, []);

  // Listen for focus to refresh non-routine procedures every time calendar screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadMachines();
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Fixed Calendar */}
      <View style={styles.calendarContainer}>
        <Calendar
          markingType="simple"
          onDayPress={(day) => {
            setSelectedDate(day.dateString);
            setModalVisible(true);
          }}
          theme={{
            backgroundColor: '#000',
            calendarBackground: '#000',
            textSectionTitleColor: '#0f0',
            dayTextColor: '#fff',
            todayTextColor: '#0f0',
            arrowColor: '#0f0',
            monthTextColor: '#0f0',
            selectedDayBackgroundColor: '#0f0',
          }}
        />
      </View>

      {/* Non-Routine Procedures List (Scrollable) */}
      <ScrollView style={styles.procedureListContainer}>
  {nonRoutineProcedures.map((item) => (
    <View key={item.id} style={[styles.procedureCard, { backgroundColor: item.color, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardText}>{item.machineName}: {item.name}</Text>
        <Text style={styles.cardText}>Due on: {item.dueDate.toDateString()}</Text>
      </View>
      <TouchableOpacity onPress={() => deleteNonRoutineProcedure(item.id, item.machineId)}>
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>X</Text>
      </TouchableOpacity>
    </View>
  ))}
</ScrollView>



      {/* Modal for Scheduling Non-Routine Procedures */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Schedule Non-Routine Maintenance</Text>
            <Text style={styles.label}>Select Machine:</Text>
            <Picker
              selectedValue={selectedMachine}
              onValueChange={(itemValue) => setSelectedMachine(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="--Select Machine--" value="" />
              {machines.map((machine) => (
                <Picker.Item key={machine.id} label={machine.name} value={machine.id} />
              ))}
            </Picker>

            <Text style={styles.label}>Procedure Name:</Text>
            <TextInput
              value={procedureName}
              onChangeText={setProcedureName}
              placeholder="Enter procedure name"
              placeholderTextColor="#777"
              style={styles.input}
            />

            <Text style={styles.label}>Procedure Description:</Text>
            <TextInput
              value={procedureDescription}
              onChangeText={setProcedureDescription}
              placeholder="Enter procedure details"
              placeholderTextColor="#777"
              multiline
              numberOfLines={4}
              style={[styles.input, { minHeight: 80 }]}
            />

            <TouchableOpacity style={styles.button} onPress={scheduleProcedure}>
              <Text style={styles.buttonText}>Schedule</Text>
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

