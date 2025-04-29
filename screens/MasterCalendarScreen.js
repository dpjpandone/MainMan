import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/globalStyles';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

export default function MasterCalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [machineName, setMachineName] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [procedureDescription, setProcedureDescription] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [nonRoutineProcedures, setNonRoutineProcedures] = useState([]);
  const [companyId, setCompanyId] = useState(null);
  const navigation = useNavigation();
  const [expandedId, setExpandedId] = useState(null);
  
  const loadNonRoutineProcedures = async (companyId) => {
    console.log('Loading non-routine procedures for companyId:', companyId);
  
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/non_routine_procedures?company_id=eq.${companyId}&order=due_date.asc`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
  
      const data = await response.json();
      console.log('Fetched procedures:', data);
  
      const now = new Date();
      const enriched = (data || []).map((proc) => {
        const due = new Date(proc.due_date);
        const diffDays = Math.floor((due - now) / (1000 * 60 * 60 * 24));
  
        let color = 'blue';
        let status = `Due in ${diffDays} days`;
  
        if (diffDays < 0) {
          color = 'red';
          status = 'Past Due';
        } else if (diffDays < 30) {
          color = 'orange';
        }
  
        return {
          ...proc,
          dueDate: due,
          color,
          status,
        };
      });
  
      setNonRoutineProcedures(enriched);
    } catch (error) {
      console.error('Error fetching non-routine procedures:', error);
    }
  };
  
  const scheduleProcedure = async () => {
    console.log('--- Schedule Button Pressed ---');
    console.log('companyId:', companyId);
    console.log('selectedDate:', selectedDate);
    console.log('machineName:', machineName);
    console.log('procedureName:', procedureName);
  
    if (!selectedDate || !machineName.trim() || !procedureName.trim() || !companyId) {
      console.warn('Missing fields. Aborting scheduling.');
      Alert.alert('Missing Info', 'Please complete all fields including company ID.');
      return;
    }
  
    const payload = {
      company_id: companyId,
      machine_name: machineName.trim(),
      procedure_name: procedureName.trim(),
      description: procedureDescription.trim() || 'Scheduled from calendar',
      due_date: selectedDate,
    };
  
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/non_routine_procedures`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
  
      console.log('Supabase insert status:', response.status);
  
      if (response.ok) {
        console.log('Non-routine procedure inserted successfully');
        setModalVisible(false);
        setMachineName('');
        setProcedureName('');
        setProcedureDescription('');
        loadNonRoutineProcedures(companyId);
      } else {
        const errorText = await response.text();
        console.error('Insert failed:', errorText);
        Alert.alert('Insert Error', errorText);
      }
    } catch (error) {
      console.error('Network or parsing error:', error);
      Alert.alert('Error', 'Something went wrong during scheduling.');
    }
  };

  const deleteNonRoutineProcedure = async (id) => {
    Alert.alert(
      'Delete Procedure',
      'Are you sure you want to delete this non-routine procedure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${SUPABASE_URL}/rest/v1/non_routine_procedures?id=eq.${id}&company_id=eq.${companyId}`, {
                method: 'DELETE',
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Prefer': 'return=minimal',
                },
              });
  
              console.log('Delete status:', response.status);
  
              if (response.ok) {
                console.log('Procedure deleted successfully');
                loadNonRoutineProcedures(companyId);
              } else {
                const errorText = await response.text();
                console.error('Delete failed:', errorText);
                Alert.alert('Delete Error', errorText);
              }
            } catch (error) {
              console.error('Network error during delete:', error);
              Alert.alert('Error', 'Something went wrong during delete.');
            }
          },
        },
      ]
    );
  };
    
  useEffect(() => {
    const init = async () => {
      console.log('Initializing MasterCalendarScreen...');
      const session = await AsyncStorage.getItem('loginData');
      console.log('Raw loginData from AsyncStorage:', session);
      const parsed = JSON.parse(session);
      console.log('Parsed loginData:', parsed);
      const id = parsed?.companyId;
      console.log('Extracted companyId:', id);
      if (id) {
        setCompanyId(id);
        loadNonRoutineProcedures(id);
      } else {
        console.error('No companyId found during init.');
      }
    };
    init();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('MasterCalendarScreen focused.');
      if (companyId) {
        loadNonRoutineProcedures(companyId);
      }
    });
    return unsubscribe;
  }, [navigation, companyId]);

  return (
    <View style={styles.container}>
      <View style={styles.calendarContainer}>
        <Calendar
          markingType="simple"
          onDayPress={(day) => {
            console.log('Date selected:', day.dateString);
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

      <ScrollView style={styles.procedureListContainer}>
  {nonRoutineProcedures.map((item) => {
    const isExpanded = expandedId === item.id;

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.procedureCard,
            {
              backgroundColor: item.color,
              flexDirection: 'column',
              paddingVertical: 12,
              paddingHorizontal: 16,
              marginBottom: 8,
            },
          ]}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardText}>
                {item.machine_name}: {item.procedure_name}
              </Text>
              <Text style={styles.cardText}>Due on: {item.dueDate.toDateString()}</Text>
            </View>
            <TouchableOpacity
  onPress={() => deleteNonRoutineProcedure(item.id)}
  style={{ padding: 10 }}
>
  <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 28 }}>✕</Text>
</TouchableOpacity>
          </View>

          {isExpanded && (
            <View style={{ marginTop: 10 }}>
              <Text style={[styles.cardText, { color: '#fff' }]}>
                {item.description || 'No additional details.'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  })}
</ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Schedule Non-Routine Maintenance</Text>

            <Text style={styles.label}>Machine Name:</Text>
            <TextInput
              value={machineName}
              onChangeText={setMachineName}
              placeholder="Enter machine or task name"
              placeholderTextColor="#777"
              style={styles.input}
            />

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
