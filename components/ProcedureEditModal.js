// components/ProcedureEditModal.js

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { styles } from '../styles/globalStyles';
import { uploadProcedureImage, deleteProcedureImage, FullscreenImageViewerController } from '../utils/imageUtils';
import { uploadProcedureFile, deleteProcedureFile, FileLabelPrompt, AttachmentGridViewer } from '../utils/fileUtils';
import * as Linking from 'expo-linking';
import { InteractionManager } from 'react-native';

export default function ProcedureEditModal({
    visible,
    onClose,
    item,
    imageUrls,
    setImageUrls,
    fileUrls,
    setFileUrls,
    fileLabels,
    setFileLabels,
    refreshMachine,
  }) {
    const [description, setDescription] = useState(item.description || '');
    const [editMode, setEditMode] = useState(false);
    const [imageEditMode, setImageEditMode] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const [labelPromptVisible, setLabelPromptVisible] = useState(false);
    const galleryScrollRef = useRef(null);
  
    const scrollToGalleryEnd = () => {
      InteractionManager.runAfterInteractions(() => {
        setTimeout(() => {
          galleryScrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      });
    };
  
  
    useEffect(() => {
      const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
      const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
      return () => {
        showSub.remove();
        hideSub.remove();
      };
    }, []);
    const handleBack = () => {
    if (editMode) {
      setEditMode(false);
      setImageEditMode(false);
      setDescription(item.description || '');
      setImageUrls(item.imageUrls || []);
    } else {
      onClose();
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

  const renderLinkedDescription = (text) => {
    const parts = text.split(/(\bhttps?:\/\/\S+\b)/g);
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

  return (
    <Modal visible={visible} transparent={false} animationType="fade">
      <View style={styles.modalOverlay}>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
  
        {editMode && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 8,
              right: 13,
              zIndex: 10,
              backgroundColor: '#000',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 6,
              borderWidth: 1,
              borderColor: '#0f0',
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
            keyboardVisible && { paddingBottom: 80, paddingTop: 20 },
          ]}
        >
          <View style={{ flex: 1 }}>
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
  
            {!keyboardVisible && (
              <View style={{ height: 200, marginTop: 10 }}>
                <ScrollView
                  ref={galleryScrollRef}
                  contentContainerStyle={{ justifyContent: 'center', alignItems: 'center' }}
                >
                  {console.log('[AttachmentGridViewer]', { imageUrls, fileUrls, fileLabels })}
  
                  {(imageUrls.length > 0 || fileUrls.length > 0) ? (
                    <AttachmentGridViewer
                      imageUrls={imageUrls}
                      fileUrls={fileUrls}
                      fileLabels={fileLabels}
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
                          deleteProcedureImage({
                            uriToDelete: uri,
                            imageUrls,
                            procedureId: item.id,
                            setImageUrls,
                            refreshMachine,
                          });
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
    </Modal>
  );
}