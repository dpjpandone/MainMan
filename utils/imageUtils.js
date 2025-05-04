//imageUtils.js
import React, { useState } from 'react';
import { Modal, TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles/globalStyles';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase, SUPABASE_BUCKET } from './supaBaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';


export function FullscreenImageViewerController({ imageUrls }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const currentScale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = currentScale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.max(startScale.value * e.scale, 1);
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        scale.value = withTiming(1, { duration: 150 }, (finished) => {
          if (finished) {
            currentScale.value = 1;
            offsetX.value = 0;
            offsetY.value = 0;
          }
        });
        translateX.value = withTiming(0, { duration: 150 });
        translateY.value = withTiming(0, { duration: 150 });
      } else {
        currentScale.value = scale.value;
        offsetX.value = translateX.value;
        offsetY.value = translateY.value;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = offsetX.value + e.translationX;
      translateY.value = offsetY.value + e.translationY;
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        scale.value = withTiming(1, { duration: 150 });
        translateX.value = withTiming(0, { duration: 150 });
        translateY.value = withTiming(0, { duration: 150 });
        offsetX.value = 0;
        offsetY.value = 0;
      } else {
        offsetX.value = translateX.value;
        offsetY.value = translateY.value;
      }
    });

  const handleClose = () => {
    setSelectedImageIndex(null);
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    currentScale.value = 1;
    offsetX.value = 0;
    offsetY.value = 0;
  };

  if (typeof window !== 'undefined') {
    window._setSelectedImageIndex = setSelectedImageIndex;
  }

  return (
    <>
      {selectedImageIndex !== null && (
        <FullscreenImageViewer
          visible={true}
          uri={imageUrls[selectedImageIndex]}
          onClose={handleClose}
          scale={scale}
          translateX={translateX}
          translateY={translateY}
          pinchGesture={pinchGesture}
          panGesture={panGesture}
        />
      )}
    </>
  );
}

export function FullscreenImageViewer({
  visible,
  uri,
  onClose,
  scale,
  translateX,
  translateY,
  pinchGesture,
  panGesture,
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal visible={visible} transparent>
      <GestureHandlerRootView style={styles.fullscreenOverlay}>
        <GestureDetector gesture={Gesture.Simultaneous(panGesture, pinchGesture)}>
          <Animated.Image
            source={{ uri }}
            style={[styles.fullscreenImage, animatedStyle]}
            resizeMode="contain"
          />
        </GestureDetector>

        <TouchableOpacity
          style={[styles.fsButton, { position: 'absolute', top: 0, right: 0, marginTop: 10, marginRight: 10 }]}
          onPress={onClose}
        >
          <Text style={styles.fsButtonText}>ⓧ</Text>
        </TouchableOpacity>
      </GestureHandlerRootView>
    </Modal>
  );
}

// Delete Image Helper
export async function deleteProcedureImage({ uriToDelete, imageUrls, procedureId, setImageUrls, refreshMachine }) {
  try {
    const imageName = uriToDelete.split('/').pop();

    // Delete from Supabase Storage
    const { error: storageError } = await supabase
      .storage
      .from(SUPABASE_BUCKET)
      .remove([imageName]);

    if (storageError) {
      console.error('Error deleting image from storage:', storageError);
      return;
    }

    // Update image_urls in procedures table
    const updatedImages = imageUrls.filter(uri => uri !== uriToDelete);
    setImageUrls(updatedImages);

    const { error: updateError } = await supabase
      .from('procedures')
      .update({ image_urls: updatedImages })
      .eq('id', procedureId);

    if (updateError) {
      console.error('Error updating procedure image_urls:', updateError);
      return;
    }

    if (refreshMachine) refreshMachine();
  } catch (error) {
    console.error('Failed to delete image:', error);
  }
}

// Upload Image Helper
export async function uploadProcedureImage({ procedureId, imageUrls, setImageUrls, scrollToEnd }) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.7,
  });

  if (!result.canceled && result.assets?.length > 0) {
    const asset = result.assets[0];
    const fileName = `${procedureId}-${Date.now()}.jpg`;

    const response = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(fileName, {
        uri: asset.uri,
        type: 'image/jpeg',
        name: fileName,
      }, { upsert: true });

    if (response.error) {
      console.error('Image upload error:', response.error);
      alert(`Upload failed: ${response.error.message}`);
      return;
    }

    const { data } = supabase
      .storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    const publicUrl = data.publicUrl;
    const updated = [...imageUrls, publicUrl];
    setImageUrls(updated);

    const { error: updateError } = await supabase
      .from('procedures')
      .update({ image_urls: updated })
      .eq('id', procedureId);

    if (updateError) {
      console.error('Error updating procedure image_urls:', updateError);
      return;
    }

    setTimeout(() => {
      if (scrollToEnd) scrollToEnd();
    }, 300);
  }
}
