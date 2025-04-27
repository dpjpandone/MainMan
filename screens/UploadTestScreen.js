// screens/UploadTestScreen.js
import React from 'react';
import { View, Text, Button, Alert, StyleSheet } from 'react-native';

export default function UploadTestScreen() {
  const uploadDirectly = async () => {
    try {
      const content = 'Evatech direct upload test file';
      const fileName = `upload/test-cli-${Date.now()}.txt`;

      const res = await fetch(`https://pzmjrigansqyyfgruiwi.supabase.co/storage/v1/object/procedure-uploads/${fileName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6bWpyaWdhbnNxeXlmZ3J1aXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyNjEzNDUsImV4cCI6MjA2MDgzNzM0NX0.7JP-4K6-LRI_Tf5CT1BCiHr2_Kr8jqRtqvmtj1l56MI`
        },
        body: content
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      Alert.alert('✅ Upload Success', `Uploaded: ${fileName}`);
    } catch (err) {
      console.error('🔥 Upload failed:', err);
      Alert.alert('Upload Error', err.message || 'Unknown error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Direct Upload Test</Text>
      <Button title="Upload Text File" onPress={uploadDirectly} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  title: { color: '#0f0', fontSize: 20, marginBottom: 20 },
});
