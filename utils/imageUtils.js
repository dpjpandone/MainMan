//imageUtils.js
import { View, Image, TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles/globalStyles';
import { Modal } from 'react-native';
import React, { useState } from 'react';
import { SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_KEY } from './supaBaseConfig';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
export function FullscreenImageViewerController({ imageUrls }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const handleClose = () => {
    setSelectedImageIndex(null);
    setScale(1);
    setRotation(0);
    setPanX(0);
    setPanY(0);
  };

  return (
    <>
      {selectedImageIndex !== null && (
        <FullscreenImageViewer
          visible={true}
          uri={imageUrls[selectedImageIndex]}
          onClose={handleClose}
          panX={panX}
          panY={panY}
          scale={scale}
          rotation={rotation}
          setPanX={setPanX}
          setPanY={setPanY}
          setScale={setScale}
          setRotation={setRotation}
        />
      )}

      {/* exposes the setSelectedImageIndex globally so components can open the fullscreen viewer  */}
      
      {typeof window !== 'undefined' && (
        (window._setSelectedImageIndex = setSelectedImageIndex)
      )}
    </>
  );
}
export function FullscreenImageViewer({
  visible,
  uri,
  onClose,
  panX,
  panY,
  scale,
  rotation,
  setPanX,
  setPanY,
  setScale,
  setRotation,
}) {
  return (
    <Modal visible={visible} transparent>
      <View style={styles.fullscreenOverlay}>
        <Image
          source={{ uri }}
          style={[
            styles.fullscreenImage,
            {
              transform: [
                { translateX: panX },
                { translateY: panY },
                { scale },
                { rotate: `${rotation}deg` },
              ],
            },
          ]}
          resizeMode="contain"
        />

        <TouchableOpacity
          style={[styles.fsButton, { position: 'absolute', top: 0, right: 0, marginTop: 10, marginRight: 10 }]}
          onPress={onClose}
        >
          <Text style={styles.fsButtonText}>ⓧ</Text>
        </TouchableOpacity>

        <View style={{ position: 'absolute', bottom: 100, right: 10 }}>
          <TouchableOpacity style={styles.fsButton} onPress={() => setScale(s => Math.min(s + 0.25, 5))}>
            <Text style={styles.fsButtonText}>⊕</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fsButton, { marginTop: 8 }]} onPress={() => setScale(s => Math.max(s - 0.25, 0.5))}>
            <Text style={styles.fsButtonText}>⊖</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fsButton, { marginTop: 8 }]} onPress={() => setPanY(p => p - 50)}>
            <Text style={styles.fsButtonText}>↑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fsButton, { marginTop: 8 }]} onPress={() => setPanY(p => p + 50)}>
            <Text style={styles.fsButtonText}>↓</Text>
          </TouchableOpacity>
        </View>

        <View style={{ position: 'absolute', bottom: 20, right: 10, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity style={styles.fsButton} onPress={() => setPanX(p => p - 50)}>
            <Text style={styles.fsButtonText}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fsButton, { marginLeft: 8 }]} onPress={() => setPanX(p => p + 50)}>
            <Text style={styles.fsButtonText}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.fsButton, { marginLeft: 8 }]} onPress={() => setRotation(r => r + 90)}>
            <Text style={styles.fsButtonText}>↻</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export function ImageGridViewer({ imageUrls, imageEditMode, onDeleteImage, onSelectImage }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
      {imageUrls.map((uri, index) => (
        <View key={index} style={{ position: 'relative' }}>
          {imageEditMode ? (
            <TouchableOpacity onPress={() => onDeleteImage(uri)}>
              <Image source={{ uri }} style={styles.thumbnail} />
              <View style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
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
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => onSelectImage(index)}>
              <Image source={{ uri }} style={styles.thumbnail} />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}
// Delete Image Helper
export async function deleteProcedureImage({ uriToDelete, imageUrls, procedureId, setImageUrls, refreshMachine }) {
  try {
    const imageName = uriToDelete.split('/').pop();
    const deleteUrl = `${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${imageName}`;
    await fetch(deleteUrl, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });

    const updatedImages = imageUrls.filter(uri => uri !== uriToDelete);
    setImageUrls(updatedImages);

    await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${procedureId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ image_urls: updatedImages }),
    });

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
    const uri = result.assets[0].uri;
    const fileName = `${procedureId}-${Date.now()}.jpg`;
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
      const updated = [...imageUrls, publicUrl];
      setImageUrls(updated);

      await fetch(`${SUPABASE_URL}/rest/v1/procedures?id=eq.${procedureId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ image_urls: updated }),
      });

      setTimeout(() => {
        if (scrollToEnd) scrollToEnd();
      }, 300);
    } else {
      alert(`Upload failed: ${response.status}`);
    }
  }
}