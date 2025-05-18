// components/FailedSyncOverlay.js

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, Alert } from 'react-native';
import { useSync } from '../contexts/SyncContext';
import { runSyncQueue } from '../contexts/SyncContext';
import { setGlobalFailedJobs, setGlobalQueuedJobCount, acknowledgeSyncFailure } from '../contexts/SyncContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { removeJob, loadJobs } from '../utils/JobQueue';

async function confirmDeleteFailedJobs(failedJobs) {
  const stillFailed = [...failedJobs]; // snapshot
  for (const job of stillFailed) {
    await removeJob(job.id);
  }

  // 🧹 Clean leftover failed jobs
  const allJobs = await loadJobs();
  const filtered = allJobs.filter(j => j.status !== 'failed');
  await AsyncStorage.setItem('syncJobQueue', JSON.stringify(filtered));

  setGlobalFailedJobs([]);
  acknowledgeSyncFailure(true);
}

export default function FailedSyncOverlay() {
  const { failedJobs } = useSync();

  if (!failedJobs || failedJobs.length === 0) return null;

  const plural = failedJobs.length > 1;

return (
  <View style={styles.container}>
    {/* Delete Button on Left */}
    <TouchableOpacity
onPress={() => {
  Alert.alert(
    'Cancel Upload?',
    'This will remove the failed upload from the queue and it will not retry automatically.',
    [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDeleteFailedJobs(failedJobs),
      },
    ]
  );
}}
      style={[styles.button, styles.cancel]}
    >
      <Text style={styles.cancelText}>Delete</Text>
    </TouchableOpacity>

    {/* Centered Text */}
    <Text style={styles.text}>
      {failedJobs.length} UPLOAD{plural ? 'S' : ''} FAILED
    </Text>

    {/* Retry Button on Right */}
    <TouchableOpacity
      onPress={() => {
        failedJobs.forEach(job => {
          job.attemptCount = 0;
          job.status = 'queued';
        });
        setGlobalFailedJobs([]);
        setGlobalQueuedJobCount(prev => prev + failedJobs.length);
        runSyncQueue();
      }}
      style={[styles.button, styles.retry]}
    >
      <Text style={styles.retryText}>Retry</Text>
    </TouchableOpacity>
  </View>
);
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 2 : 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f00',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 0,
    zIndex: 10001,
  },
  text: {
    color: '#f00',
    fontSize: 14,
    fontFamily: 'Courier',
    flex: 1,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  retry: {
    backgroundColor: '#0f0',
  },
  cancel: {
    backgroundColor: '#f00',
    borderColor: '#000',
    borderWidth: 1,
  },
  retryText: {
    fontFamily: 'Courier',
    color: '#000',
    fontSize: 13,
  },
  cancelText: {
    fontFamily: 'Courier',
    color: '#000',
    fontSize: 13,
  },
});
