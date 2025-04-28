// components/ProcedureCard.js stable 10.0

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, Image, ScrollView, TextInput, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/globalStyles';
import { FullscreenImageViewer, ImageGridViewer } from '../utils/imageUtils';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY } from '../utils/supaBaseConfig';
import { InteractionManager } from 'react-native';

export default function ProcedureCard({ item, onComplete, onDelete, refreshMachine }) {
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
        const galleryScrollRef = useRef(null);
        const [originalDescription, setOriginalDescription] = useState(description);
        const [originalImageUrls, setOriginalImageUrls] = useState([...imageUrls]);
      
        const now = new Date();
        const lastCompleted = item.lastCompleted ? new Date(item.lastCompleted) : null;
        const isPastDue = !lastCompleted || (Math.floor((now - lastCompleted) / (1000 * 60 * 60 * 24)) > item.intervalDays);
      
        const dueDate = new Date(item.dueDate);
        const daysRemaining = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
        
        const scrollToGalleryEnd = () => {
          InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
              galleryScrollRef.current?.scrollToEnd({ animated: true });
            }, 300);
          });
        };
                
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
        
        const openModal = () => {
          setDescription(item.description || '');
          setImageUrls(item.imageUrls || []);
          setOriginalDescription(item.description || '');
          setOriginalImageUrls(item.imageUrls || []);
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
      
                  const data = await AsyncStorage.getItem('machines');
                  const machines = JSON.parse(data);
                  const updated = machines.map((m) => {
                    if (m.id !== item.machineId) return m;
                    return {
                      ...m,
                      procedures: m.procedures.map((p) => p.id === item.id ? { ...p, imageUrls: updatedImages } : p)
                    };
                  });
                  await AsyncStorage.setItem('machines', JSON.stringify(updated));
                  refreshMachine();
                } catch (error) {
                  console.error('Failed to delete image:', error);
                }
              }
            }
          ]);
        };
      
        const saveDescription = async () => {
          const data = await AsyncStorage.getItem('machines');
          const machines = JSON.parse(data);
          const updated = machines.map((m) => {
            if (m.id !== item.machineId) return m;
            return {
              ...m,
              procedures: m.procedures.map((p) => p.id === item.id ? { ...p, description, imageUrls } : p)
            };
          });
          await AsyncStorage.setItem('machines', JSON.stringify(updated));
          refreshMachine();
          setOriginalDescription(description);
          setOriginalImageUrls(imageUrls);
          setEditMode(false);
          setImageEditMode(false);
          setModalVisible(false);
        };
      
        const handleBack = () => {
        
          if (editMode) {
            setEditMode(false);
            setImageEditMode(false);
            setDescription(originalDescription);
            setImageUrls(originalImageUrls);
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
                setImageUrls((prev) => [...prev, publicUrl]);
                
                // 🔥 NEW: Scroll to end after adding image
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
                
      
        return (
          <View style={[styles.procItem, { backgroundColor: bgColor }]}>
      <TouchableOpacity onPress={() => {
        Alert.alert("Confirm Deletion", "Are you sure you want to delete this procedure and all associated images?", [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete", style: "destructive", onPress: async () => {
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
              onDelete(item.id);
              setModalVisible(false);
            }
          }
        ]);
      }} style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
        <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 18 }}>X</Text>
      </TouchableOpacity>
      
      <Text style={[styles.procName, isPastDue && styles.pastDueText]}>{item.name}</Text>
      <Text style={[styles.procStatus, isPastDue && styles.pastDueText]}>
        {isPastDue ? 'Past Due' : 'Up to Date'}
      </Text>
      
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.halfBtn} onPress={() => onComplete(item.id)}>
          <Text style={styles.completeText}>Mark Complete</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.halfBtn} onPress={openModal}>
          <Text style={styles.completeText}>View Procedure</Text>
        </TouchableOpacity>
      </View>
      
      
      
{/* Section 3: Fullscreen */}

<Modal visible={modalVisible} transparent={false} animationType="fade">
  <View style={styles.modalOverlay}>
    <StatusBar backgroundColor="#000" barStyle="light-content" />



    <KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={styles.modalContainer}
>
      <View style={{ flex: 1 }}>

        {/* Text Details at Top */}
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

        {/* Image Gallery Underneath (fixed at 80px) */}
        <View style={{ height: imageEditMode ? 200 : editMode ? 80 : 200, marginTop: 10 }}>

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

      </View>

{/* Fixed Buttons at Bottom */}
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

      {/* ✅ DELETE Button with Scroll Fix */}
      <TouchableOpacity
        style={styles.fixedButton}
        onPress={() => {
          setImageEditMode(prev => {
            const newMode = !prev;
            if (newMode) {
              scrollToGalleryEnd();
            }
            return newMode;
          });
        }}
      >
        <Text style={styles.buttonText}>Delete</Text>
      </TouchableOpacity>

      {/* SAVE and BACK remain simple */}
      <TouchableOpacity style={styles.fixedButton} onPress={saveDescription}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.fixedButton} onPress={handleBack}>
        <Text style={styles.buttonText}>Back</Text>
      </TouchableOpacity>
    </>
  )}
</View>

    </KeyboardAvoidingView>
  </View>
</Modal>

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
      