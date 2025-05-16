// utils/fileUtils.js

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY, supabase } from './supaBaseConfig';
import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { styles, PendingHourglass } from '../styles/globalStyles';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { wrapWithSync, tryNowOrQueue } from './SyncManager';
import { addInAppLog } from '../utils/InAppLogger';
import { ImageCaptionPrompt } from '../utils/captionUtils';
const SHOW_HOURGLASS = true; // 🔁 Toggle to test impact on black thumbnails

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

    if (result.canceled || !result.assets?.length) return;

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

    const payload = {
      localUri,
      label: sanitizedLabel,
      procedureId,
      fileName,
      fileUrls: updatedUrls,
      setFileUrls,
      fileLabels: updatedLabels,
      setFileLabels,
    };

    await tryNowOrQueue('uploadProcedureFile', payload);

  } catch (err) {
    addInAppLog(`[ERROR] File selection or queuing failed: ${err.message}`);
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

      const deleteIndex = fileUrls.findIndex((uri) => uri === uriToDelete);
      if (deleteIndex === -1) {
        addInAppLog(`[SKIP] File not found in list: ${uriToDelete}`);
        return;
      }

      const updatedUrls = fileUrls.filter((_, i) => i !== deleteIndex);
      const updatedLabels = fileLabels.filter((_, i) => i !== deleteIndex);

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

      addInAppLog(`[DELETE] Removed file from DB and memory: ${uriToDelete}`);

      if (refreshMachine) refreshMachine();
    });
  } catch (error) {
    addInAppLog(`[DELETE FAIL] Could not delete file: ${error.message}`);
    throw error;
  }
}
 
export async function uploadFileToSupabase({
  localUri,
  label,
  procedureId,
  fileName,
  setFileUrls,
  fileUrls,
  setFileLabels,
  fileLabels,
}) {
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;

  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (!fileInfo.exists) {
    addInAppLog(`[SKIP] Local file not found—uploadProcedureFile aborted: ${localUri}`);
    return;
  }

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
        Authorization: `Bearer ${SUPABASE_KEY}`,
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

    // ✅ Memory patch: replace localUri with publicUrl
if (setFileUrls && Array.isArray(fileUrls)) {
  let didPatch = false;

  const updatedUrlsInMemory = fileUrls.map(uri => {
    if (uri === localUri || (uri.startsWith('file://') && uri.includes(fileName))) {
      didPatch = true;
      return publicUrl;
    }
    return uri;
  });

  if (!didPatch && !updatedUrlsInMemory.includes(publicUrl)) {
    updatedUrlsInMemory.push(publicUrl);
    addInAppLog(`[FALLBACK] Appending publicUrl manually: ${publicUrl}`);
  }

  setFileUrls(updatedUrlsInMemory);
  addInAppLog(`[MEMORY PATCH] Final fileUrls: ${JSON.stringify(updatedUrlsInMemory)}`);
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
  captions = { image: {}, file: {} },
  detailsEditMode,
  attachmentDeleteMode,
  onDeleteAttachment,
  onSelectImage,
  onEditCaption,
})
{
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

const renderImage = (uri, index) => {

  return (
    <View key={`img-${index}`} style={{ position: 'relative' }}>
      <View style={{ alignItems: 'center' }}>
        <TouchableOpacity onPress={() => attachmentDeleteMode ? onDeleteAttachment(uri) : onSelectImage(index)}>
          <Image source={{ uri }} style={styles.thumbnail} />
          {attachmentDeleteMode && renderStrike()}
        </TouchableOpacity>

{captions?.image?.[uri] && (
  <View style={{
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(32, 32, 32, 0.6)', // soft dark overlay
    paddingVertical: 2,
    paddingHorizontal: 4,
  }}>
<Text style={styles.captionText} numberOfLines={2}>
  {captions.image[uri]}
</Text>
  </View>
)}
      </View>

{SHOW_HOURGLASS && uri.startsWith('file://') && <PendingHourglass />}

      {detailsEditMode && !attachmentDeleteMode && (
<TouchableOpacity
  onPress={() => onEditCaption(uri)}
  style={{
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#00ff00',
    padding: 4,
    zIndex: 3,
  }}
>
  <MaterialCommunityIcons name="pencil" color="#000" size={18} />
</TouchableOpacity>
      )}
    </View>
  );
};

const renderFile = (uri, index) => (
  <View key={`file-${index}`} style={{ position: 'relative' }}>
    <TouchableOpacity
      onPress={() => attachmentDeleteMode ? onDeleteAttachment(uri) : Linking.openURL(uri)}
      style={styles.pdfTouchable}
    >
      <MaterialCommunityIcons name="file-cog-outline" color="#0f0" size={27} />
      <Text style={styles.pdfLabelText} numberOfLines={3}>
        {fileLabels?.[index] || 'Unlabeled'}
      </Text>
    </TouchableOpacity>
    {uri.startsWith('file://') && <PendingHourglass />}
    {attachmentDeleteMode && (
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
