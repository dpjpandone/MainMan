import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { styles } from '../styles/globalStyles';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';

export default function ProcedureSettings({ visible, onClose, procedureId, onSave }) {
  const [interval, setInterval] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    const fetchInterval = async () => {
      try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${procedureId}`, {
          method: 'GET',
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
          },
        });

        const data = await response.json();
        if (data.length > 0) {
          setInterval(data[0].interval_days?.toString() || '');
          setSelectedDate(data[0].last_completed?.split('T')[0] || '');
        }
      } catch (error) {
        console.error('Failed to fetch procedure data:', error);
      }
    };

    if (visible) {
      fetchInterval();
    }
  }, [visible]);

  const handleSave = () => {
    if (!interval || isNaN(interval) || parseInt(interval) <= 0) {
      alert('Please enter a valid interval.');
      return;
    }
    onSave(parseInt(interval), selectedDate);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitleOutside}>Edit Interval Settings</Text>

          <ScrollView>
            <Text style={styles.label}>Interval (days):</Text>
            <TextInput
              style={styles.input}
              value={interval}
              onChangeText={setInterval}
              keyboardType="numeric"
              placeholder="e.g. 30"
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Last Completed Date:</Text>
            <Calendar
              onDayPress={(day) => setSelectedDate(day.dateString)}
              markedDates={{
                [selectedDate]: {
                  selected: true,
                  selectedColor: '#0f0',
                },
              }}
              theme={{
                calendarBackground: '#000',
                dayTextColor: '#fff',
                monthTextColor: '#0f0',
                arrowColor: '#0f0',
                textSectionTitleColor: '#0f0',
                selectedDayBackgroundColor: '#0f0',
                selectedDayTextColor: '#000',
              }}
            />
          </ScrollView>

          <TouchableOpacity style={styles.button} onPress={handleSave}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
