import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { styles } from '../styles/globalStyles';
import { supabase } from '../utils/supaBaseConfig';
import { subscribeToReconnect, StaleDataOverlay } from '../contexts/SyncContext';
import { wrapWithSync } from '../utils/SyncManager';
import { Alert } from 'react-native';

export default function ShopModal({ visible, onClose, onShopSelected, companyId, currentShop }) {
  const [shopList, setShopList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('select'); // 'select' or 'custom'
  const [customShop, setCustomShop] = useState('');

const fetchShopList = async () => {
  setLoading(true);
  try {
    await wrapWithSync('fetchShops', async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('name')
        .eq('company_id', companyId)
        .order('name', { ascending: true });

      if (error) throw error;

      setShopList(data.map((s) => s.name));
    });
  } catch (err) {
    console.warn('❌ Failed to fetch shops:', err.message);
    setShopList([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (visible && companyId) {
      fetchShopList();
    }
  }, [visible, companyId]);

  useEffect(() => {
  if (!visible || !companyId) return;

  const unsubscribe = subscribeToReconnect(() => fetchShopList());
  return unsubscribe;
}, [visible, companyId]);


  const handleSelect = (shop) => {
    onShopSelected(shop);
    onClose();
  };

  const handleSubmitNew = async () => {
    const trimmed = customShop.trim();
    if (!trimmed) return;

    const { error } = await supabase.from('shops').insert([
      {
        name: trimmed,
        company_id: companyId,
      },
    ]);

    if (error) {
      console.warn('❌ Failed to insert new shop:', error);
      return;
    }

    await fetchShopList();
    await onShopSelected(trimmed);
    setMode(null);
    setCustomShop('');
  };

return (
  <Modal visible={visible} transparent animationType="slide">
    <View style={styles.modalOverlay}>

      {/* Hourglass top-right */}
      <View style={{ position: 'absolute', top: 8, right: 10, zIndex: 20 }}>
        <StaleDataOverlay />
      </View>

      <View style={[styles.modalContainer, { flexDirection: 'column', height: '88%' }]}>

        <Text style={[styles.modalTitleOutside, { marginBottom: 10 }]}>Assign Shop</Text>

        {loading ? (
          <ActivityIndicator color="#0f0" />
        ) : (
          <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
              {shopList.map((shop, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelect(shop)}
                  style={[
                    styles.fixedButton,
                    {
                      marginBottom: 6,
                      backgroundColor: '#222',
                      borderWidth: shop === currentShop ? 2 : 0,
                      borderColor: shop === currentShop ? '#0f0' : 'transparent',
                      flex: 0,
                      alignSelf: 'stretch',
                    },
                  ]}
                >
                  <Text style={{ color: '#0f0' }}>{shop}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bottom buttons pinned at the bottom */}
        <View style={{ paddingTop: 10 }}>
          {mode === 'custom' ? (
            <>
              <TextInput
                placeholder="New shop name"
                placeholderTextColor="#777"
                style={[styles.input, { marginBottom: 10 }]}
                value={customShop}
                onChangeText={setCustomShop}
              />
              <TouchableOpacity
                style={[styles.fixedButton, { marginBottom: 10, flex: 0, alignSelf: 'stretch' }]}
                onPress={handleSubmitNew}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.fixedButton, { marginBottom: 10, flex: 0, alignSelf: 'stretch' }]}
              onPress={() => {
                setMode('custom');
                setCustomShop('');
              }}
            >
              <Text style={styles.buttonText}>+ Add New Shop</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.fixedButton,
              {
                backgroundColor: '#000',
                borderWidth: 2,
                borderColor: '#0f0',
                flex: 0,
                alignSelf: 'stretch',
              },
            ]}
            onPress={onClose}
          >
            <Text style={{ color: '#0f0', textAlign: 'center' }}>Cancel</Text>
          </TouchableOpacity>
        </View>

      </View>
    </View>
  </Modal>
);
}
