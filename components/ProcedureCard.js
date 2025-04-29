// components/ProcedureCard.js

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform, StatusBar, Keyboard } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { styles } from '../styles/globalStyles';
import { FullscreenImageViewer, ImageGridViewer } from '../utils/imageUtils';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY } from '../utils/supaBaseConfig';
import { InteractionManager } from 'react-native';

export default function ProcedureCard({ item, navigation, isPastDue: initialPastDue, onComplete, onDelete }){

  const [bgColor, setBgColor] = useState('#e4001e');
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [imageEditMode, setImageEditMode] = useState(false);
  const [description, setDescription] = useState(item.description || '');
  const [imageUrls, setImageUrls] = useState(item.imageUrls || []);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [fullscreenScale, setFullscreenScale] = useState(1);
  const [fullscreenRotation, setFullscreenRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const galleryScrollRef = useRef(null);

  const now = new Date();
  const lastCompleted = item.last_completed ? new Date(item.last_completed) : null;
  const isPastDue = !lastCompleted || (Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24)) > item.intervalDays);
  
  const dueDate = item.dueDate ? new Date(item.dueDate) : null;
  const daysRemaining = dueDate ? Math.floor((dueDate - now) / (1000 * 60 * 60 * 24)) : null;

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
      if (data.length > 0) {
        const latest = data[0];
        setDescription(latest.description || '');
        setImageUrls(latest.image_urls || []);
      } else {
        console.error('Procedure not found.');
      }
    } catch (error) {
      console.error('Error loading latest procedure:', error);
    }
  
    setEditMode(false);
    setImageEditMode(false);
    setModalVisible(true);
  };
  
  const handleDeleteImage = (uriToDelete) => {
    Alert.alert("Delete Image", "Are you sure you want to delete this image?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const imageName = uriToDelete.split('/').pop();
            const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${imageName}`;
            await fetch(deleteUrl, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
  
            const updatedImages = imageUrls.filter(uri => uri !== uriToDelete);
            setImageUrls(updatedImages);
  
            // 🌐 New: Update procedure's image_urls field in Supabase
            await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${item.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal',
              },
              body: JSON.stringify({ image_urls: updatedImages }),
            });
  
            refreshMachine();
          } catch (error) {
            console.error('Failed to delete image:', error);
          }
        }
      }
    ]);
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
        }),
      });

      setModalVisible(false);
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
    setImageEditMode(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const fileName = `${item.id}-${Date.now()}.jpg`;
        const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;

        const response = await FileSystem.uploadAsync(uploadUrl, uri, {
          httpMethod: 'PUT',
          headers: {
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
          },
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        });

        if (response.status === 200) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;
          const updatedImages = [...imageUrls, publicUrl];
          setImageUrls(updatedImages);

          // 🌐 Update Supabase procedure record with new images
          await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${item.id}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ image_urls: updatedImages }),
          });

          setTimeout(() => {
            galleryScrollRef.current?.scrollToEnd({ animated: true });
          }, 300);
        } else {
          alert(`Upload failed: ${response.status}`);
        }
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
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
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={[styles.modalContainer, keyboardVisible ? { paddingBottom: 80 } : null]}
          >
            <View style={{ flex: 1 }}>

              {/* Text Section */}
              <View style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                  {!editMode ? (
                    <Text style={styles.cardText}>
                      {description || 'No description yet.'}
                    </Text>
                  ) : (
                    <TextInput
                      style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
                      placeholder="Enter description..."
                      placeholderTextColor="#777"
                      multiline
                      value={description}
                      onChangeText={setDescription}
                    />
                  )}
                </ScrollView>
              </View>

              {/* Image Gallery Section */}
              {!keyboardVisible && (
                <View style={{ height: 200, marginTop: 10 }}>
                  <ScrollView ref={galleryScrollRef}>
                    {imageUrls.length > 0 ? (
                      <ImageGridViewer
                        imageUrls={imageUrls}
                        imageEditMode={imageEditMode}
                        onDeleteImage={handleDeleteImage}
                        onSelectImage={(index) => {
                          setSelectedImageIndex(index);
                          setFullscreenScale(1);
                          setFullscreenRotation(0);
                          setPanX(0);
                          setPanY(0);
                        }}
                      />
                    ) : (
                      <Text style={{ color: '#888', textAlign: 'center' }}>No Images</Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

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
                      <Text style={styles.buttonText}>Add</Text>
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
                    <TouchableOpacity style={styles.fixedButton} onPress={handleBack}>
                      <Text style={styles.buttonText}>Back</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Fullscreen Viewer */}
      <FullscreenImageViewer
        visible={selectedImageIndex !== null}
        uri={imageUrls[selectedImageIndex]}
        onClose={() => setSelectedImageIndex(null)}
        panX={panX}
        panY={panY}
        scale={fullscreenScale}
        rotation={fullscreenRotation}
        setPanX={setPanX}
        setPanY={setPanY}
        setScale={setFullscreenScale}
        setRotation={setFullscreenRotation}
      />
    </View>
  );
}
