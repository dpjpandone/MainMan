import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/globalStyles';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

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
        const session = await AsyncStorage.getItem('loginData');
        const parsed = JSON.parse(session);
        const resolvedCompanyId = parsed?.companyId;
        if (!resolvedCompanyId) {
          console.warn('Company ID not found.');
          return;
        }
        setCompanyId(resolvedCompanyId);

        const url = `${SUPABASE_URL}/rest/v1/procedures?id=eq.${procedureId}&company_id=eq.${resolvedCompanyId}`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Accept: 'application/json',
            Prefer: 'return=representation',
          },
        });

        const data = await response.json();
        if (data.length > 0) {
          const proc = data[0];
          setIntervalDays(proc.interval_days?.toString() || '');
          if (proc.last_completed) {
            const iso = new Date(proc.last_completed).toISOString().split('T')[0];
            setSelectedDate(iso);
          }
        }
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
      const body = {
        interval_days: parseInt(intervalDays),
        last_completed: selectedDate ? new Date(selectedDate).toISOString() : null,
      };

      await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${procedureId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(body),
      });

      Alert.alert('Saved', 'Procedure settings updated.');
      onClose();
    } catch (error) {
      console.error('Failed to save procedure:', error);
      Alert.alert('Error', 'Could not save settings.');
    }
  };

  return (
<Modal visible={visible} transparent={false} animationType="slide">
  <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
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
