//imageUtils.js
import React, { useState } from 'react';
import { Modal, TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles/globalStyles';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY, supabase } from './supaBaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { wrapWithSync, tryNowOrQueue } from './SyncManager';
import { addJob } from './JobQueue';

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
    await wrapWithSync('deleteProcedureImage', async () => {
      const imageName = uriToDelete.split('/').pop();

      const { error: storageError } = await supabase
        .storage
        .from(SUPABASE_BUCKET)
        .remove([imageName]);
      if (storageError) throw storageError;

      const updatedImages = imageUrls.filter(uri => uri !== uriToDelete);
      setImageUrls(updatedImages);

      const { error: updateError } = await supabase
        .from('procedures')
        .update({ image_urls: updatedImages })
        .eq('id', procedureId);
      if (updateError) throw updateError;

      if (refreshMachine) refreshMachine();
    });
  } catch (error) {
    console.error('Failed to delete image:', error);
  }
}

export async function handleImageSelection({ procedureId, imageUrls, setImageUrls, scrollToEnd }) {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7, // built-in compression
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const localUri = asset.uri;

    // 1. Optimistically add local image to gallery
    const updated = [...imageUrls, localUri];
    setImageUrls(updated);

    await tryNowOrQueue('uploadProcedureImage', {
      uri: localUri,
      procedureId,
    }, {
      attempts: 3,
      delayMs: 1000,
    });


    if (scrollToEnd) {
      setTimeout(scrollToEnd, 300);
    }
  } catch (error) {
    console.error('Image selection or queuing failed:', error);
  }
}

export async function uploadImageToSupabase({ uri, procedureId }) {
  try {
    const fileName = `${procedureId}-${Date.now()}.jpg`;

    // Step 1: Define Supabase upload target URL
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;

    // Step 2: Use FileSystem.uploadAsync() with Supabase headers
    const result = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'image/jpeg',
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (result.status !== 200) {
      console.error('Upload failed with status:', result.status);
      throw new Error('Supabase upload failed');
    }

    // Step 3: Construct public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;

    // Step 4: Get current image list from Supabase
    const { data: procData, error: fetchError } = await supabase
      .from('procedures')
      .select('image_urls')
      .eq('id', procedureId)
      .single();

    if (fetchError) throw fetchError;

    const current = procData?.image_urls || [];
    const updated = [...current, publicUrl];

    // Step 5: Update Supabase procedure record
    const { error: updateError } = await supabase
      .from('procedures')
      .update({ image_urls: updated })
      .eq('id', procedureId);

    if (updateError) throw updateError;

    console.log('[UPLOAD] Image uploaded and database updated:', publicUrl);
  } catch (error) {
    console.error('Failed to upload image from queue:', error);
    throw error;
  }
}