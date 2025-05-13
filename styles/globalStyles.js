// styles/globalStyles.js

import { StyleSheet } from 'react-native';
import { StatusBar } from 'react-native';
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const styles = StyleSheet.create({
  addBtn: {
    marginTop: 20,
    backgroundColor: '#0f0',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  header: {
    fontSize: 24,
    color: '#0f0',
    marginBottom: 20,
    textAlign: 'center',
  },
  procItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  procName: {
    fontSize: 18,
    textAlign: 'center',
    color: '#fff',
  },
  procStatus: {
    fontSize: 14,
    marginVertical: 5,
    textAlign: 'center',
    color: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  halfBtn: {
    backgroundColor: '#fff',
    flex: 1,
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  completeText: {
    color: '#000',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    width: '100%',         // 🔥 Full width
    height: '100%',        // 🔥 Full height
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
    modalTitle: {
    color: '#0f0',
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#222',
    color: '#fff',
    padding: 10,
    borderRadius: 4,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#0f0',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteBtn: {
    backgroundColor: '#f00',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',          // ✅ horizontal center inside text box
    textAlignVertical: 'center',  // ✅ vertical center inside text box (important for Android)
  },
    cancelText: {
    color: '#f00',
    textAlign: 'center',
    marginTop: 10,
  },
  editBtn: {
    backgroundColor: 'transparent',
    padding: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  editText: {
    color: '#f00',
    fontWeight: 'bold',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fsButton: {
    padding: 4,
  },
  fsButtonText: {
    color: '#0f0',
    fontSize: 24,
    fontWeight: 'bold',
  },
  pastDueText: {
    color: '#000',
    fontWeight: 'bold',
  },
  calendarContainer: {
    marginBottom: 10,
  },
  procedureListContainer: {
    paddingHorizontal: 10,
    flex: 1,
  },
  procedureCard: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    width: '100%',
    alignSelf: 'center',
  },
  cardText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 5,
  },
  label: {
    color: '#fff',
    marginTop: 10,
  },
  picker: {
    color: '#fff',
    backgroundColor: '#222',
    marginBottom: 10,
  },
  checklistContainer: {
    flex: 1,
    backgroundColor: '#000',
    padding: 20,
  },
  checklistScroll: {
    flex: 1,
    marginTop: 20,
  },
  checklistHeader: {
    color: '#ff0000',
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  dueSoonHeader: {
    color: '#fff',
    fontSize: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  procCard: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  procText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 5,
  },
  machineText: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
  },
  labelRow: {
    backgroundColor: '#222',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  labelText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  buttonWhite: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonRed: {
    backgroundColor: '#f00',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#000',
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 0,
    borderRadius: 10,
    width: '92%',
    height: '88%',
    flexDirection: 'column',
  },
    galleryScroll: {
    maxHeight: 200,
    marginBottom: 10,
  },
  detailsScroll: {
    flex: 1,
    marginBottom: 10,
  },
  fixedButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#111',
  },
  fixedButton: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: '#0f0',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',       // ✅ horizontal center
    justifyContent: 'center',   // ✅ vertical center
  },
  deleteButton: {
    backgroundColor: '#cc0000',  // 🔥 slightly deeper red than pure #f00
  },
  
  modalTitleOutside: {
    color: '#0f0',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyListText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
  },
  machineItem: {
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 6,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  homeModalButton: {
    backgroundColor: '#0f0',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  homeModalCancelButton: {
    backgroundColor: '#333',
    padding: 14,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  homeModalButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  homeModalCancelText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  rememberMeToggle: {
    color: '#0f0',
    fontFamily: 'Courier',
    fontSize: 16,
  },
  rememberMeWrapper: {
    marginTop: 10,
    marginBottom: 20,
    paddingRight: 4,
  },
  settingsIcon: {
    position: 'absolute',
    top: 15,
    left: 10,
    padding: 8,
    zIndex: 10,
  },
  pdfTouchable: {
    width: 80,
    height: 80,
    borderRadius: 4,
    backgroundColor: '#222',
    marginRight: 8,
    marginBottom: 8,
    justifyContent: 'flex-start',   // Icon on top
    alignItems: 'center',
    paddingTop: 6,
    paddingHorizontal: 2,
  },
  pdfLabelText: {
    color: '#0f0',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  pdfStrikeWrapper: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    pointerEvents: 'none',
  },
    pdfStrikeLine: {
    position: 'absolute',
    width: '140%',
    height: 4,
    backgroundColor: '#ff0000',
    transform: [{ rotate: '-45deg' }],
  },
  deleteButtonCompact: {
    backgroundColor: '#000',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  deleteButtonText: {
    color: '#f00',
    fontWeight: 'bold',
    fontSize: 22,
  },
  modalCloseBtn: {
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
  },
  
  modalCloseBtnText: {
    color: '#0f0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollBox: {
    flex: 1,
    backgroundColor: '#111',
    padding: 10,
    borderRadius: 8,
    borderColor: '#333',
    borderWidth: 1,
  },
  warningBox: {
    backgroundColor: '#000',       // solid black background
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#0f0',           // neon green border
    alignItems: 'center',
    justifyContent: 'center',
  },
    modalGearIcon: {
    position: 'absolute',
    top: 8,           
    left: 13,         
    zIndex: 10,
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 3,

  },
pendingBadge: {
  position: 'absolute',
  top: 1,
  right: 4,
  borderRadius: 12,
  padding: 2,
  zIndex: 3,
},
captionText: {
  color: '#00ff00',
  fontSize: 12,
  marginTop: 2,
  textAlign: 'center',
  maxWidth: 100,
}

});

export const PendingHourglass = () => {
  const [sandFrame, setSandFrame] = useState(0);

  const sandIcons = ['timer-sand', 'timer-sand', 'timer-sand'];

  const getTransform = () => {
    if (sandFrame === 1) return [{ scaleY: -1 }];      // Flip vertically
    if (sandFrame === 2) return [{ rotate: '90deg' }]; // Rotate horizontally
    return [];
  };

  useEffect(() => {
    const delays = [250, 750, 1250];
    let currentFrame = 0;

    const advanceFrame = () => {
      setSandFrame(currentFrame);
      currentFrame = (currentFrame + 1) % 3;
      setTimeout(advanceFrame, delays[currentFrame]);
    };

    const timeoutId = setTimeout(advanceFrame, delays[0]);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <View style={{
      position: 'absolute',
      top: 1,
      right: 4,
      zIndex: 3,
    }}>
      <MaterialCommunityIcons
        name={sandIcons[sandFrame]}
        size={20}
        color="#0f0"
        style={{ transform: getTransform() }}
      />
    </View>
  );
};


