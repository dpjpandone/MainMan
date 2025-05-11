// utils/fileUtils.js

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY, supabase } from './supaBaseConfig';
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { styles } from '../styles/globalStyles';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { wrapWithSync, tryNowOrQueue } from './SyncManager';
import { addInAppLog } from '../utils/InAppLogger';

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
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
  
      if (!result.canceled && result.assets?.length > 0) {
        const file = result.assets[0];
        const localUri = file.uri;
  
        const sanitizedLabel = label?.trim().replace(/[^a-z0-9_\-]/gi, '_') || 'Untitled';
        const fileName = `${sanitizedLabel}-${procedureId}-${Date.now()}.pdf`;
  
        // ✅ Optimistically update local gallery
        const updatedUrls = [...(fileUrls || []), localUri];
        const updatedLabels = [...(fileLabels || []), sanitizedLabel];
  
        setFileUrls(updatedUrls);
        setFileLabels(updatedLabels);
  
        if (scrollToEnd) {
          setTimeout(scrollToEnd, 300);
        }
  
        // 🧠 Queue upload job
        await tryNowOrQueue('uploadProcedureFile', {
          localUri,
          label: sanitizedLabel,
          procedureId,
          fileName,
        }, { attempts: 3, delayMs: 1000 });
      }
    } catch (err) {
      console.error('File selection or queuing failed:', err);
    }
  }
    

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
    await wrapWithSync('deleteProcedureFile', async () => {
      const fileName = uriToDelete.split('/').pop();

      const { error: storageError } = await supabase
        .storage
        .from(SUPABASE_BUCKET)
        .remove([fileName]);

      if (storageError) throw storageError;

      const updatedUrls = fileUrls.filter((uri) => uri !== uriToDelete);
      const updatedLabels = fileLabels.filter((_, i) => fileUrls[i] !== uriToDelete);

      setFileUrls(updatedUrls);
      setFileLabels(updatedLabels);

      const { error: dbError } = await supabase
        .from('procedures')
        .update({
          file_urls: updatedUrls,
          file_labels: updatedLabels,
        })
        .eq('id', procedureId);

      if (dbError) throw dbError;

      if (refreshMachine) refreshMachine();
    });
  } catch (error) {
    console.error('Failed to delete file:', error);
  }
}
 
export async function uploadFileToSupabase({ localUri, label, procedureId, fileName }) {
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;

  // ✅ Check if local file exists before upload
  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (!fileInfo.exists) {
    addInAppLog(`[SKIP] Local file not found—uploadProcedureFile aborted: ${localUri}`);
    return;
  }

  // 🔐 Prevent duplicate insert
  const { data: procDataCheck, error: checkError } = await supabase
    .from('procedures')
    .select('file_urls, file_labels')
    .eq('id', procedureId)
    .single();

  if (checkError) throw checkError;
  if (procDataCheck?.file_urls?.includes(publicUrl)) {
    addInAppLog(`[UPLOAD] File already exists in DB, skipping: ${publicUrl}`);
    return;
  }

  try {
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;
    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/pdf',
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (result.status !== 200) {
      addInAppLog(`[UPLOAD RETRY] HTTP ${result.status} for ${fileName}`);
      throw new Error('Supabase upload failed');
    }

    const { file_urls = [], file_labels = [] } = procDataCheck;
    const updatedUrls = [...file_urls, publicUrl];
    const updatedLabels = [...file_labels, label];

    const { error: updateError } = await supabase
      .from('procedures')
      .update({
        file_urls: updatedUrls,
        file_labels: updatedLabels,
      })
      .eq('id', procedureId);

    if (updateError) throw updateError;

    addInAppLog(`[UPLOAD] File uploaded and database updated: ${publicUrl}`);
    
    
    // 🧹 Clean up local file after successful upload
    if (localUri.startsWith('file://')) {
      try {
        await FileSystem.deleteAsync(localUri, { idempotent: true });
        addInAppLog(`[CLEANUP] Deleted local file after upload: ${localUri}`);
      } catch (cleanupError) {
        addInAppLog(`[CLEANUP FAIL] Could not delete local file: ${cleanupError.message}`);
      }
    }

  
  } catch (error) {
    addInAppLog(`[QUEUE RETRY] File upload will retry later: ${error.message}`);
    throw error;
  }
}


export function AttachmentGridViewer({
    imageUrls,
    fileUrls,
    fileLabels,
    editMode,
    onDeleteAttachment,
    onSelectImage,
  }) {
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

  const renderImage = (uri, index) => (
    <View key={`img-${index}`} style={{ position: 'relative' }}>
      <TouchableOpacity onPress={() => editMode ? onDeleteAttachment(uri) : onSelectImage(index)}>
        <Image source={{ uri }} style={styles.thumbnail} />
        {editMode && renderStrike()}
      </TouchableOpacity>
    </View>
  );

  const renderFile = (uri, index) => (
    <View key={`file-${index}`} style={{ position: 'relative' }}>
      <TouchableOpacity
        onPress={() => editMode ? onDeleteAttachment(uri) : Linking.openURL(uri)}
        style={styles.pdfTouchable}
      >
        <MaterialCommunityIcons name="file-cog" color="#0f0" size={27} />
        <Text style={styles.pdfLabelText} numberOfLines={3}>
          {fileLabels?.[index] || 'Unlabeled'}
        </Text>
      </TouchableOpacity>
  
      {editMode && (
        <View style={styles.pdfStrikeWrapper}>
          <View style={styles.pdfStrikeLine} />
        </View>
      )}
    </View>
  );
              
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
      {[...(imageUrls || [])].map(renderImage)}
      {[...(fileUrls || [])].map(renderFile)}
    </View>
  );
}