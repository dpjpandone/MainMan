// components/ProcedureCard.js

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ScrollView, TextInput, StatusBar, Keyboard } from 'react-native';
import { styles } from '../styles/globalStyles';
import { FullscreenImageViewerController, deleteProcedureImage, uploadProcedureImage } from '../utils/imageUtils';
import { supabase, SUPABASE_BUCKET } from '../utils/supaBaseConfig';
import { wrapWithSync } from '../utils/SyncManager';
import { InteractionManager } from 'react-native';
import { uploadProcedureFile, deleteProcedureFile, AttachmentGridViewer, FileLabelPrompt } from '../utils/fileUtils';
import * as Linking from 'expo-linking';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ProcedureSettings from './ProcedureSettings';
import { handleImageSelection } from '../utils/imageUtils';
import { tryNowOrQueue, subscribeToJobComplete } from '../utils/SyncManager';
import { CaptionPrompt } from '../utils/captionUtils';
import { addInAppLog } from '../utils/InAppLogger';
import { StaleDataOverlay } from '../contexts/SyncContext';
import { subscribeToReconnect } from '../contexts/SyncContext';
import NetInfo from '@react-native-community/netinfo';

function isProcedurePastDue(item) {
  const lastCompleted = item?.last_completed ? new Date(item.last_completed) : null;
  const intervalDays = item?.interval_days || 0;
  return !lastCompleted || (Math.floor((Date.now() - lastCompleted) / 86400000) > intervalDays);
}

export default function ProcedureCard({ item, onComplete, onDelete, refreshMachine }) {

  const [bgColor, setBgColor] = useState('#e4001e');
  const [modalVisible, setModalVisible] = useState(false);
const [detailsEditMode, setDetailsEditMode] = useState(false);
const [attachmentDeleteMode, setAttachmentDeleteMode] = useState(false);
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
const isPastDue = isProcedurePastDue(item);
  const [galleryKey, setGalleryKey] = useState(0);
const [captions, setCaptions] = useState({});
const [captionModalVisible, setCaptionModalVisible] = useState(false);
const [captionTargetUri, setCaptionTargetUri] = useState(null);

const loadProcedureDetails = async () => {
  await wrapWithSync('loadProcedureDetails', async () => {
    const { data, error } = await supabase
      .from('procedures')
      .select('description, image_urls, file_urls, file_labels, captions')
      .eq('id', item.id)
      .single();

    if (error || !data) {
      const msg = '[MODAL ERROR] Procedure not found or error: ' + (error?.message || 'unknown error');
      addInAppLog(msg);
      throw new Error(msg); // 🔥 required for hourglass to stay visible
    }

    setDescription(data.description || '');
    const cleanedUrls = (data.image_urls || []).filter(uri => uri.startsWith('http'));
    setImageUrls(cleanedUrls);
    setGalleryKey(prev => prev + 1);
const { data: captionRows, error: captionError } = await supabase
  .from('attachment_captions')
  .select('file_url, caption')
  .in('file_url', cleanedUrls);

if (captionError) {
  addInAppLog('[CAPTIONS] Failed to load captions: ' + captionError.message);
} else {
  const captionMap = {};
  captionRows?.forEach(row => {
    captionMap[row.file_url] = row.caption;
  });
  setCaptions(captionMap);
}
    setFileUrls(data.file_urls || []);
    setFileLabels(data.file_labels || []);
addInAppLog('[CAPTIONS] Captions loaded from attachment_captions table.');
  });
};


const renderLinkedDescription = (text) => {
    const parts = text.split(/(\bhttps?:\/\/\S+\b)/g); // Match http/https URLs
    return parts.map((part, index) => {
      if (part.match(/^https?:\/\/\S+$/)) {
        return (
          <Text
            key={index}
            style={styles.linkText}
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
  if (!modalVisible) return;

  const unsubscribe = subscribeToReconnect(loadProcedureDetails);
  return unsubscribe;
}, [modalVisible, item.id]);

  
  useEffect(() => {
    const fetchFreshStatus = async () => {
      await wrapWithSync('fetchProcedureStatus', async () => {
        const { data, error } = await supabase
          .from('procedures')
          .select('last_completed, interval_days')
          .eq('id', item.id)
          .single();
  
        if (error) throw error;
  
const overdue = isProcedurePastDue(data);
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
  
const overdue = isProcedurePastDue(item);

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

useEffect(() => {
  const unsubscribe = subscribeToJobComplete((label, payload) => {
addInAppLog('[DEBUG] ProcedureCard callback fired: label=' + label + ', payload=' + JSON.stringify(payload));
    addInAppLog(`[CALLBACK] Job complete received in ProcedureCard: ${label}`);

    try {
if (
  label === 'uploadProcedureImage' &&
  payload.procedureId === item.id &&
  typeof refreshMachine === 'function'
) {
  addInAppLog(`[UI PATCH] Job complete for ${label} — refreshing machine`);
  refreshMachine();
} else {
  addInAppLog(`[SKIP] Unmatched or invalid callback context in ProcedureCard`);
}
    } catch (err) {
      addInAppLog(`[ERROR] ProcedureCard callback crash: ${err.message}`);
    }
  });

  return () => unsubscribe();
}, [item.id]);

        
  //section 2 Functions  
  
  const openModal = async () => {
    setModalVisible(true); // Show modal immediately — allows warning display
  
    try {
await loadProcedureDetails();
  
setDetailsEditMode(false);
setAttachmentDeleteMode(false);
    } catch (err) {
      addInAppLog('[SAFE FAIL] openModal failed but UI continues');
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
  imageUrls: imageUrls.filter(uri => uri.startsWith('http')), // ✅ Clean here
  fileUrls,
  fileLabels,
});
  
setDetailsEditMode(false);
setAttachmentDeleteMode(false);
    } catch (error) {
      console.error('Failed to queue description update:', error);
    }
  };
        
  const handleBack = async () => {
    if (detailsEditMode) {
      try {
        await wrapWithSync('restoreProcedureState', async () => {
          const { data, error } = await supabase
            .from('procedures')
            .select('description, image_urls, file_urls, file_labels, captions')
            .eq('id', item.id)
            .single();
  
          if (error || !data) throw error;
  
          setDescription(data.description || '');
const cleanedUrls = (data.image_urls || []).filter(uri => uri.startsWith('http'));
setImageUrls(cleanedUrls);
setGalleryKey(prev => prev + 1);

const { data: captionRows, error: captionError } = await supabase
  .from('attachment_captions')
  .select('file_url, caption')
  .in('file_url', cleanedUrls);

if (captionError) {
  addInAppLog('[CAPTIONS] Failed to reload captions: ' + captionError.message);
} else {
  const captionMap = {};
  captionRows?.forEach(row => {
    captionMap[row.file_url] = row.caption;
  });
  setCaptions(captionMap);
}
          setFileUrls(data.file_urls || []);
          setFileLabels(data.file_labels || []);
        });
      } catch (err) {
        addInAppLog('[BACK FALLBACK] Failed to restore data, exiting anyway.');
      } finally {
        // ✅ Always exit edit mode
setDetailsEditMode(false);
setAttachmentDeleteMode(false);
      }
    } else {
      // ✅ Always allow exit from modal
      setModalVisible(false);
      if (typeof refreshMachine === 'function') {
        refreshMachine();
      }
    }
  };
        
const lastPickedFileNameRef = useRef(null); // ✅ Add this near your top-level hooks

const handleImagePick = async () => {
  await handleImageSelection({
    procedureId: item.id,
    imageUrls,
    setImageUrls,
    captions,
    setCaptions,
    onImagePicked: ({ localUri, fileName }) => {
      lastPickedFileNameRef.current = fileName;

      if (captions?.image?.[localUri]) {
        tryNowOrQueue('setImageCaptionDeferred', {
          procedureId: item.id,
          localUri,
          fileName,
        });
      }
    },
  });

  // 💡 Delay scroll until image is rendered (allow layout pass)
  setTimeout(() => {
    scrollToGalleryEnd();
  }, 750); // 200ms is usually safe, but feel free to tune
  setGalleryKey(prev => prev + 1);
};


const handleSaveCaption = async (captionText) => {
  // ✅ Optimistic update (flat format)
  setCaptions(prev => ({
    ...prev,
    [captionTargetUri]: captionText,
  }));

  // ✅ Close modal
  setCaptionModalVisible(false);

  // ✅ Determine if local file
  const isLocal = captionTargetUri?.startsWith('file://');

  // ✅ Get filename — priority order:
  let fileName = lastPickedFileNameRef?.current;

  if (
    (!fileName || fileName === lastPickedFileNameRef.current) &&
    typeof globalThis.fileUriToNameRef === 'object'
  ) {
    const fallback = globalThis.fileUriToNameRef[captionTargetUri];
    if (fallback) {
      fileName = fallback;
      addInAppLog(`[DEBUG] fileName fallback from global map: ${captionTargetUri} → ${fileName}`);
    }
  }

  if (!fileName) {
    const extracted = captionTargetUri?.split('/').pop();
    if (extracted) {
      fileName = extracted;
      addInAppLog(`[DEBUG] fileName fallback from URI: ${captionTargetUri} → ${fileName}`);
    }
  }

  const { isConnected } = await NetInfo.fetch();

  // ✅ Always queue if local file or no network
  if (isLocal || !isConnected) {
    if (!fileName) {
      addInAppLog('[CAPTION SYNC] Skipped caption queue — no fileName available.');
      return;
    }

    tryNowOrQueue('setImageCaptionDeferred', {
      procedureId: item.id,
      localUri: captionTargetUri,
      caption: captionText,
      fileName,
    });

    addInAppLog(`[CAPTION SYNC] 🌀 Queued offline caption for: ${fileName}`);
    return;
  }

  // 🌐 Direct write if online and hosted
  try {
    const { error } = await supabase
      .from('attachment_captions')
      .upsert({ file_url: captionTargetUri, caption: captionText }, { onConflict: 'file_url' });

    if (error) throw error;

    addInAppLog('[CAPTION SYNC] ✅ Direct caption saved for: ' + captionTargetUri);
  } catch (err) {
    addInAppLog('[CAPTION SYNC] ❌ Direct save failed, queuing fallback: ' + err.message);

    if (!fileName) {
      addInAppLog('[CAPTION SYNC] ⚠️ Cannot fallback — no fileName available.');
      return;
    }

    tryNowOrQueue('setImageCaptionDeferred', {
      procedureId: item.id,
      localUri: captionTargetUri,
      caption: captionText,
      fileName,
    });

    addInAppLog('[CAPTION SYNC] 🌀 Fallback caption job queued for: ' + fileName);
  }
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
      }} style={styles.closeButton}>
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
 
 {!detailsEditMode && <StaleDataOverlay/>} 

{detailsEditMode && !keyboardVisible && (
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
{!detailsEditMode ? (
<ScrollView style={styles.scrollBox}>
  <Text style={styles.cardText} selectable>
    {renderLinkedDescription(description || 'No description yet.')}
  </Text>
</ScrollView>
) : (
    <TextInput
      style={[styles.input, styles.textInputLarge]}
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
          fileLabels={fileLabels}
          captions={captions}
          detailsEditMode={detailsEditMode}
          attachmentDeleteMode={attachmentDeleteMode}
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
onEditCaption={(uri) => {
  // Only update the ref if it's not a local URI (hosted image)
  if (!uri.startsWith('file://')) {
    const extractedName = uri.split('/').pop();
    lastPickedFileNameRef.current = extractedName;
    addInAppLog(`[DEBUG] onEditCaption: extracted fileName = ${extractedName}`);
  } else {
    addInAppLog(`[DEBUG] onEditCaption skipped fileName ref — local URI: ${uri}`);
  }

  setCaptionTargetUri(uri);
  setCaptionModalVisible(true);
}}
        />
      ) : (
      <Text style={styles.galleryEmptyText}>No Attachments</Text>
      )}
    </ScrollView>
  </View>
)}

{/* Fixed Bottom Buttons */}
{!keyboardVisible && (
  <View style={styles.fixedButtonRow}>
{!detailsEditMode ? (
      <>
        <TouchableOpacity style={styles.fixedButton} onPress={() => setDetailsEditMode(true)
}>
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
setAttachmentDeleteMode(prev => {
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

<CaptionPrompt
  visible={captionModalVisible}
  uri={captionTargetUri}
  captions={captions}
  setCaptions={setCaptions}
initialCaption={captions?.[captionTargetUri] || ''}
  onSubmit={handleSaveCaption}
  onCancel={() => setCaptionModalVisible(false)}
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