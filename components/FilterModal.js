import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { styles } from '../styles/globalStyles';
import { supabase } from '../utils/supaBaseConfig';
import { subscribeToReconnect, StaleDataOverlay } from '../contexts/SyncContext';

export default function FilterModal({
  visible,
  onClose,
  companyId,
  currentShop,
  onShopSelected,
  navigation // ✅ pass this in!
}) {
  const [shopList, setShopList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [mode, setMode] = useState('select');
  const [customShop, setCustomShop] = useState('');

  const fetchShopList = async (resolvedCompanyId) => {
    setLoading(true);
    setShopList([]);

    try {
      const { data, error } = await supabase
        .from('shops')
        .select('name')
        .eq('company_id', resolvedCompanyId)
        .order('name', { ascending: true });

      console.log('[FilterModal] Supabase data:', data);

      if (error) throw error;

      setShopList(data.map((s) => s.name));
    } catch (err) {
      console.warn('❌ Failed to fetch shops:', err.message);
      setShopList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && companyId) {
      fetchShopList(companyId);
      setEditMode(false);
    }
  }, [visible, companyId]);

  useEffect(() => {
    if (!visible || !companyId) return;

    const unsubscribe = subscribeToReconnect(() => fetchShopList(companyId));
    return unsubscribe;
  }, [visible, companyId]);

  const handleSelect = (shop) => {
    onShopSelected(shop);
    onClose();
  };

  const confirmDelete = (shop) => {
    Alert.alert(
      'Delete Shop',
      `Delete "${shop}"?\n\nMachines will remain accessible under the "All" filter.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteShop(shop),
        },
      ]
    );
  };

  const deleteShop = async (shop) => {
    const { error } = await supabase
      .from('shops')
      .delete()
      .eq('company_id', companyId)
      .eq('name', shop);

    if (error) {
      console.warn('❌ Failed to delete shop:', error);
    } else {
      await fetchShopList(); // ✅ refresh local modal list
      if (navigation) {
        console.log('[FilterModal] Forcing parent screen to refocus after shop delete...');
        navigation.navigate('Home'); // ✅ force HomeScreen to run its focus hook
      }
      // If the deleted shop was current, reset filter
      if (shop === currentShop) {
        onShopSelected('All');
      }
    }
  };

  const handleSubmitNew = async () => {
    const trimmed = customShop.trim();
    if (!trimmed) return;

    const { error } = await supabase.from('shops').insert([
      { name: trimmed, company_id: companyId },
    ]);

    if (error) {
      console.warn('❌ Failed to insert shop:', error);
      return;
    }

    await fetchShopList();
    onShopSelected(trimmed);
    setMode('select');
    setCustomShop('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>

        {/* Close Button */}
        <TouchableOpacity
          style={styles.modalCloseBtn}
          onPress={() => onClose()}
        >
          <Text style={styles.modalCloseBtnText}>✕</Text>
        </TouchableOpacity>

        {/* Main Modal Content */}
        <View style={styles.modalContainer}>
          <View style={{ width: '100%', alignItems: 'center', marginBottom: 8 }}>
            <StaleDataOverlay centered style={{ marginBottom: 8 }} />
            <Text style={[styles.modalTitleOutside, { marginTop: 0 }]}>Filter by Shop</Text>
          </View>

          {loading ? (
            <ActivityIndicator color="#0f0" />
          ) : (
            <ScrollView style={{ flexGrow: 1, marginBottom: 10 }}>
              {['All', ...shopList].map((shop, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor:
                      shop === currentShop || (shop === 'All' && currentShop == null) ? '#0f0' : '#222',
                    borderRadius: 6,
                    padding: 10,
                    marginBottom: 6,
                    flex: 0,
                    alignSelf: 'stretch',
                  }}
                >
                  <TouchableOpacity style={{ flex: 1 }} onPress={() => handleSelect(shop)}>
                    <Text
                      style={{
                        color:
                          shop === currentShop || (shop === 'All' && currentShop == null)
                            ? '#000'
                            : '#0f0',
                        textAlign: 'center',
                      }}
                    >
                      {shop}
                    </Text>
                  </TouchableOpacity>

                  {editMode && shop !== 'All' && (
                    <TouchableOpacity
                      onPress={() => confirmDelete(shop)}
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: '50%',
                        transform: [{ translateY: -10 }],
                      }}
                    >
                      <Text style={{ color: '#f00', fontSize: 20 }}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {mode === 'custom' ? (
            <>
              <TextInput
                placeholder="New shop name"
                placeholderTextColor="#777"
                style={[styles.input, { marginTop: 10 }]}
                value={customShop}
                onChangeText={setCustomShop}
              />
              <TouchableOpacity
                style={[styles.fixedButton, { marginTop: 10, flex: 0, alignSelf: 'stretch' }]}
                onPress={handleSubmitNew}
              >
                <Text className={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.fixedButton, { marginTop: 12, flex: 0, alignSelf: 'stretch' }]}
              onPress={() => {
                setMode('custom');
                setCustomShop('');
              }}
            >
              <Text style={styles.buttonText}>+ New Shop</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.fixedButton,
              {
                marginTop: 12,
                backgroundColor: editMode ? '#FF0000' : 'transparent',
                borderWidth: editMode ? 0 : 2,
                borderColor: '#FF0000',
                flex: 0,
                alignSelf: 'stretch',
              },
            ]}
            onPress={() => setEditMode((prev) => !prev)}
          >
            <Text style={[styles.buttonText, { color: editMode ? '#000' : '#FF0000' }]}>
              {editMode ? 'Done' : 'Delete Shops'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
