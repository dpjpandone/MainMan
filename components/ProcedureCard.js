// components/ProcedureCard.js

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ScrollView, TextInput, StatusBar, Keyboard } from 'react-native';
import { styles } from '../styles/globalStyles';
import { FullscreenImageViewerController, deleteProcedureImage, uploadProcedureImage } from '../utils/imageUtils';
import { supabase, SUPABASE_BUCKET } from '../utils/supaBaseConfig';
import { wrapWithSync } from '../utils/SyncManager';
import { SyncWarning } from '../contexts/SyncContext';
import { InteractionManager } from 'react-native';
import { uploadProcedureFile, deleteProcedureFile, AttachmentGridViewer, FileLabelPrompt } from '../utils/fileUtils';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProcedureSettings from './ProcedureSettings';
import { handleImageSelection } from '../utils/imageUtils';
import { tryNowOrQueue } from '../utils/SyncManager';

export default function ProcedureCard({ item, onComplete, onDelete, refreshMachine }) {

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
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [initials, setInitials] = useState('');

  const now = new Date();
  const dueDate = item.dueDate ? new Date(item.dueDate) : null;

  const lastCompleted = item.last_completed ? new Date(item.last_completed) : null;
  const intervalDays = item.interval_days || 0;
  const isPastDue = !lastCompleted || (Math.floor((Date.now() - lastCompleted) / 86400000) > intervalDays);
  const [galleryKey, setGalleryKey] = useState(0);

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
    const fetchFreshStatus = async () => {
      await wrapWithSync('fetchProcedureStatus', async () => {
        const { data, error } = await supabase
          .from('procedures')
          .select('last_completed, interval_days')
          .eq('id', item.id)
          .single();
  
        if (error) throw error;
  
        const newLastCompleted = data.last_completed ? new Date(data.last_completed) : null;
        const newInterval = data.interval_days || 0;
  
        const overdue =
          !newLastCompleted ||
          Math.floor((Date.now() - newLastCompleted) / 86400000) > newInterval;
  
        setBgColor(overdue ? '#e4001e' : '#003300');
      });
    };
  
    fetchFreshStatus();
  }, [item.id]);
    
  useEffect(() => {
    const fetchInitials = async () => {
      if (!item.completed_by) return;
  
      await wrapWithSync('fetchInitials', async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('initials')
          .eq('id', item.completed_by)
          .single();
  
        if (error) throw error;
        if (data?.initials) setInitials(data.initials);
      });
    };
  
    fetchInitials();
  }, [item.completed_by]);
      

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
    if (!item) return;
  
    const lastCompleted = item.last_completed ? new Date(item.last_completed) : null;
    const intervalDays = item.interval_days || 0;
    const overdue = !lastCompleted || (Math.floor((Date.now() - lastCompleted) / 86400000) > intervalDays);
  
    if (overdue) {
      intervalId = setInterval(() =>
        setBgColor(prev => (prev === '#e4001e' ? '#ffff00' : '#e4001e')),
        500
      );
    } else {
      setBgColor('#003300'); // green
    }
  
    return () => clearInterval(intervalId);
  }, [item]);
        
  //section 2 Functions  
  
  const openModal = async () => {
    setModalVisible(true); // Show modal immediately — allows warning display
  
    try {
      await wrapWithSync('loadProcedureDetails', async () => {
        const { data, error } = await supabase
          .from('procedures')
          .select('description, image_urls, file_urls, file_labels')
          .eq('id', item.id)
          .single();
  
        if (error || !data) {
          console.log('Procedure not found or error:', error); // 👈 log only
          return;
        }
  
        setDescription(data.description || '');
        setImageUrls(data.image_urls || []);
        setFileUrls(data.file_urls || []);
        setFileLabels(data.file_labels || []);
      });
  
      setEditMode(false);
      setImageEditMode(false);
    } catch (err) {
      console.log('[SAFE FAIL] openModal failed but UI continues');
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
      await tryNowOrQueue('saveProcedureDescription', {
        procedureId: item.id,
        description,
        imageUrls,
        fileUrls,
        fileLabels,
      });
  
      setEditMode(false);
      setImageEditMode(false);
    } catch (error) {
      console.error('Failed to queue description update:', error);
    }
  };
        
  const handleBack = async () => {
    if (editMode) {
      try {
        await wrapWithSync('restoreProcedureState', async () => {
          const { data, error } = await supabase
            .from('procedures')
            .select('description, image_urls, file_urls, file_labels')
            .eq('id', item.id)
            .single();
  
          if (error || !data) throw error;
  
          setDescription(data.description || '');
          setImageUrls(data.image_urls || []);
          setFileUrls(data.file_urls || []);
          setFileLabels(data.file_labels || []);
        });
      } catch (err) {
        console.log('[BACK FALLBACK] Failed to restore data, exiting anyway.');
      } finally {
        // ✅ Always exit edit mode
        setEditMode(false);
        setImageEditMode(false);
      }
    } else {
      // ✅ Always allow exit from modal
      setModalVisible(false);
      if (typeof refreshMachine === 'function') {
        refreshMachine();
      }
    }
  };
        
  const handleImagePick = async () => {
    await handleImageSelection({
      procedureId: item.id,
      imageUrls,
      setImageUrls,
      scrollToEnd: scrollToGalleryEnd,
    });
  
    setGalleryKey(prev => prev + 1);
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
                await wrapWithSync('deleteProcedure', async () => {
                  const { error } = await supabase
                    .from('procedures')
                    .delete()
                    .eq('id', item.id);
                
                  if (error) throw error;
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
  {isPastDue
    ? `${Math.floor((Date.now() - lastCompleted) / 86400000)} days past due`
    : lastCompleted
    ? `Completed: ${lastCompleted.toLocaleDateString(undefined, {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
      })}${initials ? ` (${initials})` : ''}`
    : 'Completed'}
</Text>

      <View style={styles.buttonRow}>
  {typeof onComplete === 'function' && (
    <TouchableOpacity
  style={styles.halfBtn}
  onPress={() => {
    Alert.alert(
      'Confirm Completion',
      'Are you sure you want to mark this procedure as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes', onPress: onComplete },
      ]
    );
  }}
>
      <Text style={styles.completeText}>Mark Complete</Text>
    </TouchableOpacity>
  )}
  <TouchableOpacity style={styles.halfBtn} onPress={openModal}>
    <Text style={styles.completeText}>View Procedure</Text>
  </TouchableOpacity>
</View>

    
<Modal visible={modalVisible} transparent={false} animationType="fade">
  <View style={styles.modalOverlay}>
    <StatusBar backgroundColor="#000" barStyle="light-content" />
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
  <SyncWarning />
</View>

  {editMode && !keyboardVisible && (
  <>
    <TouchableOpacity style={styles.modalCloseBtn} onPress={handleBack}>
      <Text style={styles.modalCloseBtnText}>✕</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.modalGearIcon} onPress={() => setSettingsModalVisible(true)}>
      <MaterialCommunityIcons name="cog-outline" size={30} color="#0f0" />
    </TouchableOpacity>
  </>
)}

<View style={styles.modalContainer}>
  <View style={{ flex: 1 }}>
    {/* Text Section */}
    <View style={{ flex: 1 }}>
    {!editMode ? (
      <ScrollView style={styles.scrollBox}>
  <Text style={styles.cardText}>
    {renderLinkedDescription(description || 'No description yet.')}
  </Text>
</ScrollView>
) : (
    <TextInput
      style={[
        styles.input,
        {
          textAlignVertical: 'top',
          padding: 10,
          height: 220, // fixed height for predictability
        }
      ]}
      placeholder="Enter description..."
      placeholderTextColor="#777"
      multiline
      scrollEnabled
      value={description}
      onChangeText={setDescription}
    />
  )}
</View>
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
          key={galleryKey}
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
</View>
</Modal>
<FileLabelPrompt
  visible={labelPromptVisible}
  onSubmit={(label) => {
    setLabelPromptVisible(false);
    wrapWithSync('uploadProcedureFile', async () => {
      await uploadProcedureFile({
        procedureId: item.id,
        fileUrls,
        setFileUrls,
        scrollToEnd: scrollToGalleryEnd,
        fileLabels,
        setFileLabels,
        label,
      });
    });
  }}
  onCancel={() => setLabelPromptVisible(false)}
/>
<FullscreenImageViewerController imageUrls={imageUrls} />
<ProcedureSettings
  visible={settingsModalVisible}
  onClose={() => setSettingsModalVisible(false)}
  procedureId={item.id}
/>
</View>
);
}