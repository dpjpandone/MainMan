import React, { useEffect, useState } from 'react';
import {View,Text,StyleSheet,TouchableOpacity,ScrollView} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { styles } from '../styles/globalStyles';
export default function ChecklistScreen() {
  const [pastDueProcedures, setPastDueProcedures] = useState([]);
  const [dueSoonProcedures, setDueSoonProcedures] = useState([]);
  const navigation = useNavigation();

  const fetchProcedures = async () => {
    const data = await AsyncStorage.getItem('machines');
    if (!data) return;
    const machines = JSON.parse(data);
    const now = new Date();
    const pastDue = [];
    const dueSoon = [];

    machines.forEach((machine) => {
      (machine.procedures || []).forEach((proc) => {
        const lastCompleted = proc.lastCompleted ? new Date(proc.lastCompleted) : null;
        const dueDate = proc.dueDate ? new Date(proc.dueDate) : null;

        const item = { ...proc, machineId: machine.id, machineName: machine.name };

        if (!proc.isNonRoutine) {
          if (!lastCompleted) {
            pastDue.push(item);
          } else {
            const diff = Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24));
            const daysLeft = proc.intervalDays - diff;
            if (diff > proc.intervalDays) {
              pastDue.push(item);
            } else if (daysLeft < 7) {
              dueSoon.push(item);
            }
          }
        }
      });
    });

    pastDue.sort((a, b) => {
      const now = new Date();
      const getDaysOverdue = (proc) => {
        if (!proc.lastCompleted) return Infinity;
        return Math.floor((now - new Date(proc.lastCompleted)) / (1000 * 60 * 60 * 24)) - proc.intervalDays;
      };
      return getDaysOverdue(b) - getDaysOverdue(a);
    });

    dueSoon.sort((a, b) => {
      const now = new Date();
      const getDaysUntilDue = (proc) => {
        if (!proc.lastCompleted) return 0;
        const last = new Date(proc.lastCompleted);
        return proc.intervalDays - Math.floor((now - last) / (1000 * 60 * 60 * 24));
      };
      return getDaysUntilDue(a) - getDaysUntilDue(b);
    });

    setPastDueProcedures(pastDue);
    setDueSoonProcedures(dueSoon);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchProcedures();
    });
    return unsubscribe;
  }, [navigation]);

  return (
    <ScrollView style={styles.container}>
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
  let daysDiff = 0;
  let label = '';
  let labelColor = isPastDue ? '#f00' : '#ff6600';
  let buttonStyle = styles.buttonWhite;

  if (!item.isNonRoutine) {
    if (!item.lastCompleted) {
      isPastDue = true;
      label = 'No completion recorded';
      buttonStyle = styles.buttonRed;
      labelColor = '#f00';
    } else {
      const lastCompleted = new Date(item.lastCompleted);
      const diff = Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24));
      daysDiff = diff - item.intervalDays;
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
      <Text style={[styles.procText, isPastDue && { color: textColor }]}>{item.name}</Text>
      <Text style={styles.machineText}>Machine: {item.machineName}</Text>
      <View style={styles.labelRow}>
        <Text style={[styles.labelText, { color: labelColor }]}>{label}</Text>
      </View>
      <TouchableOpacity style={buttonStyle} onPress={() => goToProcedure(item.machineId)}>
        <Text style={styles.buttonText}>Go to Procedure</Text>
      </TouchableOpacity>
    </View>
  );
};

