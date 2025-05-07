// utils/JobQueue.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const JOB_QUEUE_KEY = 'syncJobQueue';

// ---------------------------
// Load all jobs from storage
// ---------------------------
export async function loadJobs() {
  const raw = await AsyncStorage.getItem(JOB_QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

// ---------------------------
// Save full queue to storage
// ---------------------------
async function saveJobs(jobs) {
  await AsyncStorage.setItem(JOB_QUEUE_KEY, JSON.stringify(jobs));
}

// ---------------------------
// Add new job to queue
// ---------------------------
export async function addJob(label, payload) {
    const jobs = await loadJobs();
    const newJob = {
      id: uuid.v4(), // ✅ use correct RN-compatible UUID
      label,
      payload,
      attemptCount: 0,
      lastAttempt: 0,
      createdAt: Date.now(),
      status: 'queued', // or 'in_progress', 'failed', 'done'
    };
    jobs.push(newJob);
    await saveJobs(jobs);
    return newJob;
  }
// ---------------------------
// Update job status
// ---------------------------
export async function updateJobStatus(id, status) {
  const jobs = await loadJobs();
  const updated = jobs.map(job =>
    job.id === id ? { ...job, status } : job
  );
  await saveJobs(updated);
}

// ---------------------------
// Increment retry count
// ---------------------------
export async function incrementRetry(id) {
  const jobs = await loadJobs();
  const updated = jobs.map(job =>
    job.id === id
      ? { ...job, attemptCount: job.attemptCount + 1, lastAttempt: Date.now() }
      : job
  );
  await saveJobs(updated);
}

// ---------------------------
// Mark job as failed
// ---------------------------
export async function markJobAsFailed(id) {
  await updateJobStatus(id, 'failed');
}

// ---------------------------
// Remove job (after success)
// ---------------------------
export async function removeJob(id) {
  const jobs = await loadJobs();
  const updated = jobs.filter(job => job.id !== id);
  await saveJobs(updated);
}
