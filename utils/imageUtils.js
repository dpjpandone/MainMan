//imageUtils.js
import React from 'react';
import { View, Image, TouchableOpacity, Text } from 'react-native';
import { styles } from '../styles/globalStyles';
import { Modal } from 'react-native';

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