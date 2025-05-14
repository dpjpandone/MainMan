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
import { addJob, loadJobs, removeJob } from './JobQueue';
import { addInAppLog } from '../utils/InAppLogger';

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
export async function deleteProcedureImage({
  uriToDelete,
  imageUrls,
  setImageUrls,
  procedureId,
  refreshMachine,
}) {
  try {
    await wrapWithSync('deleteProcedureImage', async () => {
      const fileName = uriToDelete.split('/').pop();

      const { error: storageError } = await supabase
        .storage
        .from(SUPABASE_BUCKET)
        .remove([fileName]);

      if (storageError) throw storageError;

      const updatedUrls = imageUrls.filter((uri) => uri !== uriToDelete);
      setImageUrls(updatedUrls);

      const { error: dbError } = await supabase
        .from('procedures')
        .update({
          image_urls: updatedUrls,
        })
        .eq('id', procedureId);

      if (dbError) throw dbError;

      if (refreshMachine) refreshMachine();
    });
  } catch (error) {
    addInAppLog(`[DELETE FAIL] Could not delete image: ${error.message}`);
    throw error;
  }
}

export async function handleImageSelection({
  procedureId,
  imageUrls,
  setImageUrls,
  scrollToEnd,
  onImagePicked, // ✅ new
}) {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7, // built-in compression
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const localUri = asset.uri;
    addInAppLog(`[SELECTED] New image picked: ${localUri}`);

    const fileName = `${procedureId}-${Date.now()}.jpg`;

    // 1. Optimistically display
    const updated = [...imageUrls, localUri];
    setImageUrls(updated);

    // 2. Provide fileName back to caller (for caption sync)
    if (typeof onImagePicked === 'function') {
      onImagePicked({ localUri, fileName });
    }

    // 3. Queue image upload
    await tryNowOrQueue('uploadProcedureImage', {
      localUri,
      procedureId,
      fileName,
    });

    addInAppLog(`[QUEUE ATTEMPT] Image queued or executed: ${fileName}`);

    loadJobs().then(jobs => {
      const count = jobs.filter(j => j.label === 'uploadProcedureImage').length;
      addInAppLog(`[DEBUG] Total queued image uploads: ${count}`);
    });

    if (scrollToEnd) {
      setTimeout(scrollToEnd, 300);
    }
  } catch (error) {
    addInAppLog(`[ERROR] Image selection or queuing failed: ${error.message}`);
  }
}

export async function uploadImageToSupabase({
  localUri,
  procedureId,
  fileName,
  imageUrls,
  setImageUrls,
  setCaptions = undefined, // ✅ default safe
}) {
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${fileName}`;
  addInAppLog(`[START] Uploading image for procedure: ${procedureId}`);
  addInAppLog(`[DEBUG] Local URI: ${localUri}`);
  addInAppLog(`[DEBUG] Target fileName: ${fileName}`);
  addInAppLog(`[DEBUG] Expected public URL: ${publicUrl}`);

  const { data: procDataCheck, error: checkError } = await supabase
    .from('procedures')
    .select('image_urls')
    .eq('id', procedureId)
    .single();

  if (checkError) throw checkError;

  if (procDataCheck?.image_urls?.includes(publicUrl)) {
    addInAppLog(`[UPLOAD] Image already exists in DB, skipping duplicate.`);
    return;
  }

  try {
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${fileName}`;
    addInAppLog(`[UPLOAD] Uploading to: ${uploadUrl}`);

    const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
      httpMethod: 'PUT',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'image/jpeg',
      },
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    });

    if (result.status !== 200) {
      addInAppLog(`[UPLOAD RETRY] HTTP ${result.status} for ${fileName}`);
      throw new Error('Supabase upload failed');
    }

    const { data: procData, error: fetchError } = await supabase
      .from('procedures')
      .select('image_urls')
      .eq('id', procedureId)
      .single();

    if (fetchError) throw fetchError;

    const current = procData?.image_urls || [];
    const updated = current.includes(publicUrl) ? current : [...current, publicUrl];

const { error: updateError } = await supabase
  .from('procedures')
  .update({ image_urls: updated })
  .eq('id', procedureId);

if (updateError) throw updateError;

addInAppLog(`[UPLOAD] Image uploaded and database updated: ${publicUrl}`);

// 🧠 Patch captions in memory if available
if (typeof setCaptions === 'function') {
  setCaptions(prev => {
    const oldCaption = prev?.image?.[localUri];
    if (!oldCaption) return prev;

    const updatedImage = { ...prev.image };
    delete updatedImage[localUri];
    updatedImage[publicUrl] = oldCaption;

    return {
      ...prev,
      image: updatedImage,
    };
  });
}

if (localUri.startsWith('file://')) {
  try {
    await FileSystem.deleteAsync(localUri, { idempotent: true });
    addInAppLog(`[CLEANUP] Deleted local image after upload: ${localUri}`);
  } catch (cleanupError) {
    addInAppLog(`[CLEANUP FAIL] Could not delete local image: ${cleanupError.message}`);
  }
}
} catch (error) {
  addInAppLog(`[QUEUE RETRY] Image upload will retry later: ${error.message}`);
  throw error;
}
}
