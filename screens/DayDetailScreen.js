// screens/DayDetailScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DayDetailScreen({ route }) {
  const { date } = route.params;
  const [dueProcedures, setDueProcedures] = useState([]);

  useEffect(() => {
    const loadProceduresForDate = async () => {
      const data = await AsyncStorage.getItem('machines');
      if (!data) return;
      const machines = JSON.parse(data);
      const results = [];

      for (const machine of machines) {
        for (const proc of machine.procedures) {
          let dueDate;
          const interval = proc.intervalDays;
          const baseDate = proc.lastCompleted
            ? new Date(proc.lastCompleted)
            : new Date(machine.createdAt || new Date());

          dueDate = new Date(baseDate);
          while (dueDate < new Date(date)) {
            dueDate.setDate(dueDate.getDate() + interval);
          }

          const formattedDue = dueDate.toISOString().split('T')[0];
          const overdue = proc.lastCompleted
            ? (new Date() - new Date(proc.lastCompleted)) / (1000 * 60 * 60 * 24) >= proc.intervalDays
            : true;

          if (formattedDue === date) {
            results.push({
              id: `${machine.id}-${proc.id}`,
              machine: machine.name,
              name: proc.name,
              interval: interval,
              status: overdue ? 'Overdue' : 'Due',
              color: overdue ? 'red' : 'green',
            });
          }
        }
      }

      setDueProcedures(results);
    };

    loadProceduresForDate();
  }, [date]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Maintenance on {date}</Text>
      <FlatList
        data={dueProcedures}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.procItem, { borderLeftColor: item.color }]}>
            <Text style={styles.procText}>{item.name}</Text>
            <Text style={styles.sub}>{item.machine}</Text>
            <Text style={[styles.status, { color: item.color }]}>
              Status: {item.status}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No procedures due</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 16,
  },
  title: {
    fontSize: 20,
    color: '#0f0',
    marginBottom: 16,
    textAlign: 'center',
  },
  procItem: {
    borderLeftWidth: 4,
    backgroundColor: '#111',
    padding: 12,
    marginBottom: 10,
    borderRadius: 6,
  },
  procText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  sub: {
    fontSize: 14,
    color: '#aaa',
  },
  status: {
    marginTop: 6,
    fontWeight: 'bold',
  },
  empty: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 50,
  },
});
