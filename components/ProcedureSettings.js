import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/globalStyles';
import { supabase } from '../utils/supaBaseConfig';
import { wrapWithSync } from '../utils/SyncManager';
import { tryNowOrQueue } from '../utils/SyncManager';
import { StaleDataOverlay, subscribeToReconnect } from '../contexts/SyncContext';

export default function ProcedureSettings({ visible, onClose, procedureId }) {
  const [intervalDays, setIntervalDays] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
const [companyId, setCompanyId] = useState(null);

const loadProcedureSettings = async () => {
  setLoading(true);
  try {
    await wrapWithSync('fetchProcedureSettings', async () => {
      const session = await AsyncStorage.getItem('loginData');
      const parsed = JSON.parse(session);
      const resolvedCompanyId = parsed?.companyId;

      if (!resolvedCompanyId) throw new Error('Missing companyId');

      setCompanyId(resolvedCompanyId);

      const { data, error } = await supabase
        .from('procedures')
        .select('interval_days, last_completed, machine_id')
        .eq('id', procedureId)
        .eq('company_id', resolvedCompanyId)
        .single();

      if (error || !data) throw error;

      setIntervalDays(data.interval_days?.toString() || '');
      if (data.last_completed) {
        const iso = new Date(data.last_completed).toISOString().split('T')[0];
        setSelectedDate(iso);
      }
    });
  } catch (error) {
    if (__DEV__) console.warn('Error fetching procedure:', error);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
  if (!visible || !procedureId) return;

  loadProcedureSettings();
}, [visible, procedureId]);

useEffect(() => {
  if (!visible || !procedureId) return;

  const unsubscribe = subscribeToReconnect(loadProcedureSettings);
  return unsubscribe;
}, [visible, procedureId]);


const handleSave = async () => {
  if (!intervalDays || isNaN(intervalDays)) {
    Alert.alert('Invalid Interval', 'Please enter a valid number of days.');
    return;
  }

  try {
    console.log('💾 Saving procedure metadata...');
    const session = await AsyncStorage.getItem('loginData');
    const parsedSession = JSON.parse(session);
    const userId = parsedSession?.userId;

    await tryNowOrQueue(
      'updateProcedureSettings',
      {
        procedureId,
        intervalDays,
        selectedDate,
        userId,
      },
      { attempts: 3, delayMs: 1000 }
    );

    console.log('✅ Procedure update succeeded');


    console.log('🎯 All updates done, closing modal');
    onClose();

  } catch (error) {
    console.warn('[⚠️ SAVE ERROR]', error);
  }
};


return (
  <>
    <Modal visible={visible} transparent={false} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <View style={styles.modalContainer}>

        
          <View style={{ marginTop: 10, marginBottom: 20, flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={{ color: '#0f0', fontSize: 22, fontWeight: 'bold' }}>Procedure Settings</Text>
          </View>
        {!loading && <StaleDataOverlay />}

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
                onDayPress={(day) => setSelectedDate(day.dateString)}
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

  </>
);
}
