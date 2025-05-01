// utils/fileUtils.js

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY } from './supaBaseConfig';
import React, { useState, useRef } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Image, FlatList } from 'react-native';
import { styles } from '../styles/globalStyles';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export function FileLabelPrompt({ visible, onSubmit, onCancel }) {
    const [label, setLabel] = useState('');
  
    const handleConfirm = () => {
      onSubmit(label.trim() || 'Untitled PDF');
      setLabel('');
    };
  
    const handleCancel = () => {
      setLabel('');
      onCancel();
    };
  
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { padding: 20 }]}>
            <Text style={[styles.cardText, { marginBottom: 10 }]}>Enter a label for this file:</Text>
            <TextInput
              value={label}
              onChangeText={setLabel}
              style={[styles.input, { marginBottom: 20 }]}
              placeholder="e.g., Maintenance Manual"
              placeholderTextColor="#888"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <TouchableOpacity onPress={handleCancel} style={[styles.fixedButton, styles.deleteButton]}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={styles.fixedButton}>
                <Text style={styles.buttonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  export async function uploadProcedureFile({
  procedureId,
  fileUrls,
  setFileUrls,
  scrollToEnd,
  fileLabels,
  setFileLabels,
  label,
}) {
  try {
    console.log('Opening document picker...');
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });

    console.log('Picker result:', result);

    if (!result.canceled && result.assets?.length > 0) {
      const file = result.assets[0];
      const uri = file.uri;
      const fileName = `${procedureId}-${Date.now()}.pdf`;
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;

      console.log('Selected file:', uri);
      console.log('Uploading to:', uploadUrl);
      
// Temporary hardcoded label (we'll replace with modal input later)
const userLabel = label?.trim() || 'Untitled PDF';

const uploadResponse = await FileSystem.uploadAsync(uploadUrl, uri, {
  httpMethod: 'PUT',
  headers: {
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/pdf',
    'x-upsert': 'true',
  },
  uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
});

      console.log('Upload response:', uploadResponse);

      if (uploadResponse.status === 200) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;
        const updatedUrls = [...(fileUrls || []), publicUrl];
        const updatedLabels = [...(fileLabels || []), userLabel];
        setFileUrls(updatedUrls);
        setFileLabels(updatedLabels);

        console.log('Upload successful, updating procedure record:', publicUrl);

        await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${procedureId}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            file_urls: updatedUrls,
            file_labels: updatedLabels,
          }),
        });

        setTimeout(() => {
          if (scrollToEnd) scrollToEnd();
        }, 300);
      } else {
        alert(`Upload failed: ${uploadResponse.status}`);
      }
    } else {
      console.log('No file selected or picker cancelled.');
    }
  } catch (err) {
    console.error('File upload error:', err);
    alert('Upload failed: ' + err.message);
  }
}
  
// Delete Document Helper
export async function deleteProcedureFile({
    uriToDelete,
    fileUrls,
    setFileUrls,
    fileLabels,
    setFileLabels,
    procedureId,
    refreshMachine,
  }) {
      try {
      const fileName = uriToDelete.split('/').pop();
      const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;
      console.log('Deleting file:', deleteUrl);
  
      const deleteResponse = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
      });
  
      console.log('Delete response:', deleteResponse.status);
  
      const updatedFiles = (fileUrls || []).filter((uri) => uri !== uriToDelete);
      const updatedLabels = (fileLabels || []).filter((_, i) => fileUrls[i] !== uriToDelete);
        
      setFileUrls(updatedFiles);
      setFileLabels(updatedLabels);
  
      await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${procedureId}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          file_urls: updatedFiles,
          file_labels: updatedLabels,
        }),
      });
  
      if (refreshMachine) refreshMachine();
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  }
      

  
  export function AttachmentGridViewer({
    imageUrls,
    fileUrls,
    fileLabels,
    editMode,
    onDeleteAttachment,
    onSelectImage,
    flatListRef,
  }) {
    const combinedItems = [
      ...imageUrls.map((uri, i) => ({ type: 'image', uri, index: i })),
      ...fileUrls.map((uri, i) => ({ type: 'file', uri, index: i })),
    ];
  
    const renderStrike = () => (
      <View style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2
      }}>
        <View style={{
          position: 'absolute',
          width: '140%',
          height: 4,
          backgroundColor: '#ff0000',
          transform: [{ rotate: '-45deg' }]
        }} />
      </View>
    );
  
    const renderItem = ({ item }) => {
      if (item.type === 'image') {
        return (
          <View key={`img-${item.index}`} style={{ position: 'relative' }}>
            <TouchableOpacity onPress={() => editMode ? onDeleteAttachment(item.uri) : onSelectImage(item.index)}>
              <Image source={{ uri: item.uri }} style={styles.thumbnail} />
              {editMode && renderStrike()}
            </TouchableOpacity>
          </View>
        );
      } else {
        return (
          <View key={`file-${item.index}`} style={{ position: 'relative' }}>
            <TouchableOpacity
              onPress={() => editMode ? onDeleteAttachment(item.uri) : Linking.openURL(item.uri)}
              style={{
                width: 80,
                height: 80,
                borderRadius: 4,
                backgroundColor: '#222',
                marginRight: 8,
                marginBottom: 8,
                justifyContent: 'flex-start',
                alignItems: 'center',
                paddingTop: 6,
                paddingHorizontal: 2,
              }}
            >
              <MaterialCommunityIcons name="file-cog" color="#0f0" size={27} />
              <Text
                style={{
                  color: '#0f0',
                  fontSize: 10,
                  textAlign: 'center',
                  marginTop: 4,
                }}
                numberOfLines={3}
              >
                {fileLabels?.[item.index] || 'Unlabeled'}
              </Text>
            </TouchableOpacity>
            {editMode && renderStrike()}
          </View>
        );
      }
    };
  
    return (
        <FlatList
          ref={flatListRef}
          data={combinedItems}
          keyExtractor={(item) => `${item.type}-${item.index}`}
          renderItem={renderItem}
          numColumns={3}
          columnWrapperStyle={{ justifyContent: 'flex-start', gap: 10 }}
          contentContainerStyle={{ alignItems: 'center', paddingBottom: 10 }}
          initialScrollIndex={Math.max(combinedItems.length - 1, 0)} // just in case
          getItemLayout={(data, index) => ({
            length: 88, // item height (80px + 8px margin)
            offset: 88 * index,
            index,
          })}
        />
      );
  }
          
  