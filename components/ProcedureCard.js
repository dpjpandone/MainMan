// components/ProcedureCard.js

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform, StatusBar, Keyboard } from 'react-native';
import { styles } from '../styles/globalStyles';
import { FullscreenImageViewerController, deleteProcedureImage, uploadProcedureImage } from '../utils/imageUtils';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY } from '../utils/supaBaseConfig';
import { InteractionManager } from 'react-native';
import { uploadProcedureFile, deleteProcedureFile, AttachmentGridViewer, FileLabelPrompt } from '../utils/fileUtils';
import * as Linking from 'expo-linking';

export default function ProcedureCard({ item, navigation, isPastDue: initialPastDue, onComplete, onDelete }){

  const [bgColor, setBgColor] = useState('#e4001e');
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [imageEditMode, setImageEditMode] = useState(false);
  const [description, setDescription] = useState(item.description || '');
  const [imageUrls, setImageUrls] = useState(item.imageUrls || []);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const galleryScrollRef = useRef(null);
  const [fileUrls, setFileUrls] = useState(item.fileUrls || []);
  const [fileLabels, setFileLabels] = useState(item.fileLabels || []);
  const [labelPromptVisible, setLabelPromptVisible] = useState(false);
  const [pendingUploadLabel, setPendingUploadLabel] = useState('');

  const now = new Date();
  const lastCompleted = item.last_completed ? new Date(item.last_completed) : null;
  const isPastDue = !lastCompleted || (Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24)) > item.intervalDays);
  
  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
  const daysRemaining = dueDate ? Math.floor((dueDate - now) / (1000 * 60 * 60 * 24)) : null;
  
  const renderLinkedDescription = (text) => {
    const parts = text.split(/(\bhttps?:\/\/\S+\b)/g); // Match http/https URLs
    return parts.map((part, index) => {
      if (part.match(/^https?:\/\/\S+$/)) {
        return (
          <Text
            key={index}
            style={{ color: '#0af' }}
            onPress={() => Linking.openURL(part)}
          >
            {part}
          </Text>
        );
      } else {
        return <Text key={index} style={styles.cardText}>{part}</Text>;
      }
    });
  };

    const scrollToGalleryEnd = () => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        galleryScrollRef.current?.scrollToEnd({ animated: true });
      }, 300);
    });
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let intervalId;
    if (isPastDue) {
      intervalId = setInterval(() =>
        setBgColor(prev => (prev === '#e4001e' ? '#ffff00' : '#e4001e')),
        500
      );
    } else {
      setBgColor('#003300'); // green for up to date
    }
    return () => clearInterval(intervalId);
  }, [isPastDue]);
      
  //section 2 Functions  
  
  const openModal = async () => {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${item.id}`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
  
      const data = await response.json();
      console.log('[MODAL] Fetching latest procedure:', item.id);
      console.log('[MODAL] Supabase GET response:', data[0]);
  
      if (data.length > 0) {
        const latest = data[0];
        setDescription(latest.description || '');
        setImageUrls(latest.image_urls || []);
        setFileUrls(latest.file_urls || []);
        setFileLabels(latest.file_labels || []);
      } else {
        console.error('Procedure not found.');
      }
  
      setEditMode(false);
      setImageEditMode(false);
      setModalVisible(true);
    } catch (error) {
      console.error('Error loading latest procedure:', error);
    }
  };
            
  
  const handleDeleteImage = (uri) => {
    deleteProcedureImage({
      uriToDelete: uri,
      imageUrls,
      procedureId: item.id,
      setImageUrls,
      refreshMachine: () => {
        if (typeof refreshMachine === 'function') refreshMachine();
      },
    });
  };
    
  const saveDescription = async () => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${item.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          description,
          image_urls: imageUrls,
          file_urls: fileUrls,
          file_labels: fileLabels,
        }),
      });
  
      setEditMode(false);       
      setImageEditMode(false);
    } catch (error) {
      console.error('Failed to save description:', error);
    }
  };
  
  const handleBack = () => {
    if (editMode) {
      setEditMode(false);
      setImageEditMode(false);
      setDescription(item.description || '');
      setImageUrls(item.imageUrls || []);
    } else {
      setModalVisible(false);
    }
  };

  const handleImagePick = async () => {
    await uploadProcedureImage({
      procedureId: item.id,
      imageUrls,
      setImageUrls,
      scrollToEnd: scrollToGalleryEnd,
    });
  };
    
  //main return

  return (
    <View style={[styles.procItem, { backgroundColor: bgColor }]}>
      <TouchableOpacity onPress={() => {
        Alert.alert("Confirm Deletion", "Are you sure you want to delete this procedure and all associated images?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete", style: "destructive", onPress: async () => {
              try {
                if (item.imageUrls) {
                  for (const url of item.imageUrls) {
                    const imageName = url.split('/').pop();
                    const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${imageName}`;
                    await fetch(deleteUrl, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` }
                    });
                  }
                }

                // Delete procedure record from Supabase
                await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${item.id}`, {
                  method: 'DELETE',
                  headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Prefer': 'return=minimal',
                  }
                });

                onDelete(item.id);  // Notify parent to refresh
                setModalVisible(false);
              } catch (error) {
                console.error('Failed to delete procedure:', error);
              }
            }
          }
        ]);
      }} style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
        <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 18 }}>X</Text>
      </TouchableOpacity>

      <Text style={[styles.procName, isPastDue && styles.pastDueText]}>
  {item.procedure_name || 'Unnamed Procedure'}
</Text>
      <Text style={[styles.procStatus, isPastDue && styles.pastDueText]}>
        {isPastDue ? 'Past Due' : 'Up to Date'}
      </Text>

      <View style={styles.buttonRow}>
  {typeof onComplete === 'function' && (
    <TouchableOpacity style={styles.halfBtn} onPress={onComplete}>
      <Text style={styles.completeText}>Mark Complete</Text>
    </TouchableOpacity>
  )}
  <TouchableOpacity style={styles.halfBtn} onPress={openModal}>
    <Text style={styles.completeText}>View Procedure</Text>
  </TouchableOpacity>
</View>

      {/* Section 3: Fullscreen Modal */}
      <Modal visible={modalVisible} transparent={false} animationType="fade">
      <View style={styles.modalOverlay}>
  <StatusBar backgroundColor="#000" barStyle="light-content" />

  {editMode && (
  <TouchableOpacity
    style={{
      position: 'absolute',
      top: 8,
      right: 13,
      zIndex: 10,
      backgroundColor: '#000', // solid black
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: '#0f0', // neon green border
    }}
    onPress={handleBack}
  >
    <Text style={{ color: '#0f0', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
  </TouchableOpacity>
)}

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={[
    styles.modalContainer,
    keyboardVisible && { paddingBottom: 80, paddingTop: 20 }, // ✅ Added safe top padding
  ]}
>
  <View style={{ flex: 1 }}>
    {/* Text Section */}
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        {!editMode ? (
          <Text style={styles.cardText}>
            {renderLinkedDescription(description || 'No description yet.')}
          </Text>
        ) : (
          <View style={{ flex: 1 }}>
            <TextInput
              style={[styles.input, { flex: 1, textAlignVertical: 'top' }]}
              placeholder="Enter description..."
              placeholderTextColor="#777"
              multiline
              value={description}
              onChangeText={setDescription}
            />
          </View>
        )}
      </ScrollView>
    </View>

{/* Image Gallery Section */}
{!keyboardVisible && (
  <View style={{ height: 200, marginTop: 10 }}>
<ScrollView
  ref={galleryScrollRef}
  contentContainerStyle={{ justifyContent: 'center', alignItems: 'center' }}
>
      {(imageUrls.length > 0 || fileUrls.length > 0) ? (
        <AttachmentGridViewer
          imageUrls={imageUrls}
          fileUrls={fileUrls}
          fileLabels={fileLabels} // ✅ Pass this in to display labels
          editMode={imageEditMode}
          onDeleteAttachment={(uri) => {
            if (uri.endsWith('.pdf')) {
              deleteProcedureFile({
                uriToDelete: uri,
                fileUrls,
                setFileUrls,
                fileLabels,
                setFileLabels,
                procedureId: item.id,
              });
            } else {
              handleDeleteImage(uri);
            }
          }}
          onSelectImage={(index) => {
            if (typeof window !== 'undefined') {
              window._setSelectedImageIndex(index);
            }
          }}
        />
      ) : (
        <Text style={{ color: '#888', textAlign: 'center' }}>No Attachments</Text>
      )}
    </ScrollView>
  </View>
)}

{/* Fixed Bottom Buttons */}
{!keyboardVisible && (
  <View style={styles.fixedButtonRow}>
    {!editMode ? (
      <>
        <TouchableOpacity style={styles.fixedButton} onPress={() => setEditMode(true)}>
          <Text style={styles.buttonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.fixedButton} onPress={handleBack}>
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </>
    ) : (
      <>
        <TouchableOpacity
          style={styles.fixedButton}
          onPress={async () => {
            await handleImagePick();
            scrollToGalleryEnd();
          }}
        >
          <Text style={styles.buttonText}>Image</Text>
        </TouchableOpacity>

        <TouchableOpacity
  style={styles.fixedButton}
  onPress={() => setLabelPromptVisible(true)}
>
  <Text style={styles.buttonText}>Files</Text>
</TouchableOpacity>

<TouchableOpacity
  style={[styles.fixedButton, styles.deleteButton]}
  onPress={() => {
    setImageEditMode(prev => {
      const newMode = !prev;
      if (newMode) scrollToGalleryEnd();
      return newMode;
    });
  }}
>
  <Text style={styles.buttonText}>Delete</Text>
</TouchableOpacity>

<TouchableOpacity style={styles.fixedButton} onPress={saveDescription}>
  <Text style={styles.buttonText}>Save</Text>
</TouchableOpacity>
</>
)}
</View>
)}

</View> 
</KeyboardAvoidingView>
</View>
</Modal>

<FullscreenImageViewerController imageUrls={imageUrls} />

<FileLabelPrompt
  visible={labelPromptVisible}
  onSubmit={async (label) => {
    setLabelPromptVisible(false);
    await uploadProcedureFile({
      procedureId: item.id,
      fileUrls,
      setFileUrls,
      fileLabels,
      setFileLabels,
      scrollToEnd: scrollToGalleryEnd,
      label,
    });
  }}
  onCancel={() => setLabelPromptVisible(false)}
/>
</View>
);
}
