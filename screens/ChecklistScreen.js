// ChecklistScreen.js

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { styles } from '../styles/globalStyles';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../utils/supaBaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function ChecklistScreen() {
  const [pastDueProcedures, setPastDueProcedures] = useState([]);
  const [dueSoonProcedures, setDueSoonProcedures] = useState([]);
  const navigation = useNavigation();

  const fetchProcedures = async () => {
    try {
      const session = await AsyncStorage.getItem('loginData');
      const parsedSession = JSON.parse(session);
      const companyId = parsedSession?.companyId;

      if (!companyId) return;

      const { data, error } = await supabase
        .from('procedures')
        .select('id, procedure_name, interval_days, last_completed, due_date, machine_id, machines(name)')
        .eq('company_id', companyId);

      if (error) {
        console.error('Error fetching procedures:', error.message);
        return;
      }

      const now = new Date();
      const pastDue = [];
      const dueSoon = [];

      data.forEach((proc) => {
        const lastCompleted = proc.last_completed ? new Date(proc.last_completed) : null;
        const intervalDays = proc.interval_days;
        const machineName = proc.machines?.name || 'Unknown Machine';
        const item = { ...proc, machineName };

        if (!lastCompleted) {
          pastDue.push(item);
        } else {
          const diff = Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24));
          const daysLeft = intervalDays - diff;
          if (diff > intervalDays) {
            pastDue.push(item);
          } else if (daysLeft < 7) {
            dueSoon.push(item);
          }
        }
      });

      setPastDueProcedures(pastDue);
      setDueSoonProcedures(dueSoon);
    } catch (error) {
      console.error('Unexpected error fetching procedures:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProcedures();
    }, [])
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={{ color: '#0f0', textAlign: 'center', marginTop: 20 }}>
        {`Past Due: ${pastDueProcedures.length}, Due Soon: ${dueSoonProcedures.length}`}
      </Text>

      {pastDueProcedures.length > 0 && (
        <>
          <Text style={styles.header}>Past Due Procedures</Text>
          {pastDueProcedures.map((item) => (
            <ProcedureCard key={item.id} item={item} navigation={navigation} isPastDue />
          ))}
        </>
      )}

      {dueSoonProcedures.length > 0 && (
        <View style={{ marginTop: 30 }}>
          <Text style={styles.dueSoonHeader}>Due Soon:</Text>
          {dueSoonProcedures.map((item) => (
            <ProcedureCard key={item.id} item={item} navigation={navigation} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function ProcedureCard({ item, navigation, isPastDue: initialPastDue = false }) {
  const [textColor, setTextColor] = useState('#f00');
  const now = new Date();
  let isPastDue = initialPastDue;
  let label = '';
  let labelColor = isPastDue ? '#f00' : '#ff6600';
  let buttonStyle = styles.buttonWhite;

  if (!item.is_non_routine) {
    if (!item.last_completed) {
      isPastDue = true;
      label = 'No completion recorded';
      buttonStyle = styles.buttonRed;
      labelColor = '#f00';
    } else {
      const lastCompleted = new Date(item.last_completed);
      const diff = Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24));
      const daysDiff = diff - item.interval_days;
      if (daysDiff > 0) {
        isPastDue = true;
        label = `${daysDiff} days past due`;
        buttonStyle = styles.buttonRed;
        labelColor = '#f00';
      } else {
        const daysUntilDue = Math.abs(daysDiff);
        label = `due in ${daysUntilDue} days`;
        if (daysUntilDue >= 5) labelColor = '#0f0';
      }
    }
  }

  useEffect(() => {
    if (isPastDue) {
      const intervalId = setInterval(() => {
        setTextColor((prev) => (prev === '#f00' ? '#ffff00' : '#f00'));
      }, 500);
      return () => clearInterval(intervalId);
    }
  }, [isPastDue]);

  const goToProcedure = (machineId) => {
    navigation.navigate('Machines', {
      screen: 'Machine',
      params: { machineId },
    });
  };

  return (
    <View style={styles.procCard}>
      <Text style={[styles.procText, isPastDue && { color: textColor }]}>
        {item.procedure_name}
      </Text>
      <Text style={styles.machineText}>Machine: {item.machineName}</Text>
      <View style={styles.labelRow}>
        <Text style={[styles.labelText, { color: labelColor }]}>{label}</Text>
      </View>
      <TouchableOpacity style={buttonStyle} onPress={() => goToProcedure(item.machine_id)}>
        <Text style={styles.buttonText}>Go to Procedure</Text>
      </TouchableOpacity>
    </View>
  );
}
