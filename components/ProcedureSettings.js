import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/globalStyles';
import { supabase } from '../utils/supaBaseConfig';
import { wrapWithSync } from '../utils/SyncManager';
import { SyncWarning } from '../contexts/SyncContext';

export default function ProcedureSettings({ visible, onClose, procedureId }) {
  const [intervalDays, setIntervalDays] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState(null);

  useEffect(() => {
    if (!visible || !procedureId) return;

    const fetchProcedure = async () => {
      setLoading(true);
      try {
        await wrapWithSync('fetchProcedureSettings', async () => {
          const session = await AsyncStorage.getItem('loginData');
          const parsed = JSON.parse(session);
          const resolvedCompanyId = parsed?.companyId;
          if (!resolvedCompanyId) {
            console.warn('Company ID not found.');
            return;
          }
          setCompanyId(resolvedCompanyId);
    
          const { data, error } = await supabase
            .from('procedures')
            .select('*')
            .eq('id', procedureId)
            .eq('company_id', resolvedCompanyId)
            .single();
    
          if (error) throw error;
    
          if (data) {
            setIntervalDays(data.interval_days?.toString() || '');
            if (data.last_completed) {
              const iso = new Date(data.last_completed).toISOString().split('T')[0];
              setSelectedDate(iso);
            }
          }
        });
      } catch (error) {
        console.error('Error fetching procedure:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProcedure();
  }, [visible, procedureId]);

  const handleSave = async () => {
    if (!intervalDays || isNaN(intervalDays)) {
      Alert.alert('Invalid Interval', 'Please enter a valid number of days.');
      return;
    }
  
    try {
      await wrapWithSync('saveProcedureSettings', async () => {
        const session = await AsyncStorage.getItem('loginData');
        const parsedSession = JSON.parse(session);
        const userId = parsedSession?.userId;
  
        const body = {
          interval_days: parseInt(intervalDays),
          last_completed: selectedDate ? new Date(selectedDate).toISOString() : null,
          completed_by: selectedDate ? userId : null,
        };
  
        const { error } = await supabase
          .from('procedures')
          .update(body)
          .eq('id', procedureId);
  
        if (error) throw error;
      });
  
      Alert.alert('Saved', 'Procedure settings updated.');
      onClose();
    } catch (error) {
    }
  };
  
  return (
<Modal visible={visible} transparent={false} animationType="slide">
  <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
    <SyncWarning />
    <View style={styles.modalContainer}>

    <View style={{ alignItems: 'center', marginTop: 10, marginBottom: 20 }}>
  <Text style={{ color: '#0f0', fontSize: 22, fontWeight: 'bold' }}>Procedure Settings</Text>
</View>

      {loading ? (
        <ActivityIndicator color="#0f0" style={{ marginTop: 20 }} />
      ) : (
        <>
          <Text style={[styles.cardText, { marginTop: 20 }]}>Interval Days:</Text>
          <TextInput
            style={styles.input}
            value={intervalDays}
            onChangeText={setIntervalDays}
            keyboardType="numeric"
            placeholder="Enter interval in days"
            placeholderTextColor="#777"
          />

          <Text style={[styles.cardText, { marginTop: 20 }]}>Last Completed:</Text>
          <Calendar
            onDayPress={day => setSelectedDate(day.dateString)}
            markedDates={
              selectedDate ? { [selectedDate]: { selected: true, marked: true } } : {}
            }
            theme={{
              calendarBackground: '#000',
              dayTextColor: '#0f0',
              monthTextColor: '#0f0',
              selectedDayBackgroundColor: '#0f0',
              selectedDayTextColor: '#000',
            }}
          />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <TouchableOpacity style={styles.fixedButton} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.fixedButton} onPress={handleSave}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  </View>
</Modal>
  );
}
