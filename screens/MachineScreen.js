// MachineScreen.js

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import ProcedureCard from '../components/ProcedureCard';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supaBaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { wrapWithSync } from '../utils/SyncManager';
import { CombinedSyncBanner } from '../contexts/SyncContext';
import { StatusBar, Platform,  } from 'react-native';
import { tryNowOrQueue, subscribeToJobComplete } from '../utils/SyncManager';
import { addInAppLog } from '../utils/InAppLogger';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ShopModal from '../components/ShopModal';

export default function MachineScreen() {
  const route = useRoute();
  const { machineId } = route.params;

  const [lastJobLabel, setLastJobLabel] = useState(null);
const [shopModalVisible, setShopModalVisible] = useState(false);
  
  const loadMachineAndProcedures = useCallback(async () => {
    await wrapWithSync('loadMachineAndProcedures', async () => {
      const { data: machineData } = await supabase
        .from('machines')
        .select('*')
        .eq('id', machineId)
        .single();
  
      const { data: proceduresData } = await supabase
        .from('procedures')
        .select('*')
        .eq('machine_id', machineId)
        .order('due_date', { ascending: true });
  
      setMachine(machineData);
      setProcedures([...proceduresData]);
    });
  }, [machineId]);
    

  useEffect(() => {
    const unsubscribe = subscribeToJobComplete((label, payload) => {
      addInAppLog(`[CALLBACK] Job complete received in MachineScreen: ${label}`);
  
      if (
        label === 'markProcedureComplete' ||
        label === 'updateProcedureSettings' ||
        label === 'addProcedure' // ✅ Add this line
      ) {
        addInAppLog(`[MATCH] Recognized label in MachineScreen: ${label}`);
        setLastJobLabel(label);
        loadMachineAndProcedures();
      } else {
        addInAppLog(`[SKIP] Ignored job: ${label}`);
      }
    });
    return unsubscribe;
  }, []);
  

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
      
    
  const deleteProcedure = async (procId) => {
    await wrapWithSync('deleteProcedure', async () => {
      const { error } = await supabase
        .from('procedures')
        .delete()
        .eq('id', procId);
  
      if (error) throw error;
  
      loadMachineAndProcedures();
    });
  };
  
  
  const markComplete = async (proc) => {
    addInAppLog(`[ACTION] markComplete() triggered for ${proc.id}`);

    try {
      const session = await AsyncStorage.getItem('loginData');
      const parsedSession = JSON.parse(session);
      const userId = parsedSession?.userId;
      addInAppLog(`[MARK] Preparing to run tryNowOrQueue for ${proc.id}`);
      await tryNowOrQueue('markProcedureComplete', {
        procedureId: proc.id,
        intervalDays: proc.interval_days,
        userId,
      }, {
        attempts: 3,
        delayMs: 1000,
      });
  
      loadMachineAndProcedures(); // ✅ Refresh view immediately
    } catch (error) {
      if (__DEV__) console.warn('[QUEUE ERROR] Failed to queue markComplete:', error);
    }
  };            
  
  const addProcedure = async () => {
    if (!name.trim() || !interval) return;
  
    setModalVisible(false); // Close modal for feedback
  
    try {
      const session = await AsyncStorage.getItem('loginData');
      const parsedSession = JSON.parse(session);
      const companyId = parsedSession?.companyId;
  
      const result = await tryNowOrQueue('addProcedure', {
        machineId,
        name: name.trim(),
        description,
        interval,
        startingDate,
        companyId,
      });
  
      // ✅ Notify user if it was a duplicate
      if (result === 'duplicate') {
        Alert.alert('Duplicate Procedure', 'A procedure with that name already exists for this machine.');
        return;
      }
  
      setName('');
      setInterval('');
      setDescription('');
      loadMachineAndProcedures(); // Optional: may be redundant if job completes later
    } catch (err) {
      if (__DEV__) console.warn('[QUEUE ERROR] Failed to queue addProcedure:', err);
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

    <View style={{ flex: 1 }}>
   
    <CombinedSyncBanner />

    
<View style={[styles.container]}>
  <StatusBar backgroundColor="#000" style="light" />

  <View style={{ alignItems: 'center', paddingTop: 40, marginBottom: 10 }}>
    <View style={{ maxWidth: '70%' }}>
      <Text
        style={[
          styles.header,
          {
            textAlign: 'center',
            flexWrap: 'wrap',
          },
        ]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {machine?.name || 'Machine'}
      </Text>
    </View>

    {/* Uncomment if you want the cog like HomeScreen */}
    {/*
    <TouchableOpacity
      onPress={() => navigation.navigate('Login')}
      style={{ position: 'absolute', left: 10, top: 40, padding: 6 }}
    >
      <MaterialCommunityIcons name="cog-outline" size={26} color="#0f0" />
    </TouchableOpacity>
    */}

    <TouchableOpacity
      onPress={() => setShopModalVisible(true)}
      style={{ position: 'absolute', right: 10, top: 40, padding: 6 }}
    >
      <MaterialCommunityIcons name="domain" size={26} color="#0f0" />
    </TouchableOpacity>
  </View>

<FlatList
  contentContainerStyle={{ paddingTop: 10 }}
  data={procedures.filter((p) => !p.is_non_routine)}
  keyExtractor={(item) => item.id.toString()}
  renderItem={renderProcedure}
/>

      <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
        <Text style={styles.addBtnText}>+ Add Procedure</Text>
      </TouchableOpacity>

     
      <Modal visible={modalVisible} transparent animationType="slide" statusBarTranslucent>
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

      {/* ----------------- Calendar Modal ----------------- */}
      <Modal visible={calendarVisible} transparent animationType="slide">
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
                  selectedColor: '#0f0',
                },
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
      <ShopModal
        visible={shopModalVisible}
        onClose={() => setShopModalVisible(false)}
onShopSelected={async (shopName) => {
  await tryNowOrQueue('updateMachineShop', { machineId, shop: shopName });
  loadMachineAndProcedures(); // <- Refresh machine.shop display
}}
        companyId={machine?.company_id}
        currentShop={machine?.shop}
      />
    </View>
    
  </View>
);
}
