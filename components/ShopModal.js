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

export default function ShopModal({ visible, onClose, onShopSelected, companyId, currentShop }) {
  const [shopList, setShopList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('select'); // 'select' or 'custom'
  const [customShop, setCustomShop] = useState('');

  const fetchShopList = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('shops')
      .select('name')
      .eq('company_id', companyId)
      .order('name', { ascending: true });

    if (error) {
      console.warn('❌ Failed to fetch shops:', error);
      setLoading(false);
      return;
    }

    const names = data.map((s) => s.name);
    setShopList(names);
    setLoading(false);
  };

  useEffect(() => {
    if (visible && companyId) {
      fetchShopList();
    }
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
        <View style={styles.modalContainer}>
          <Text style={[styles.modalTitleOutside, { marginBottom: 10 }]}>Assign Shop</Text>

          {loading ? (
            <ActivityIndicator color="#0f0" />
          ) : (
            <ScrollView style={{ maxHeight: 240 }}>
              {shopList.map((shop, idx) => (
                <TouchableOpacity
                  key={idx}
                  onPress={() => handleSelect(shop)}
                  style={[
                    styles.fixedButton,
                    {
                      marginBottom: 6,
                      backgroundColor: shop === currentShop ? '#0f0' : '#222',
                      flex: 0,
                      alignSelf: 'stretch',
                    },
                  ]}
                >
                  <Text style={{ color: shop === currentShop ? '#000' : '#0f0' }}>
                    {shop}
                  </Text>
                </TouchableOpacity>
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
                style={[
                  styles.fixedButton,
                  {
                    marginTop: 10,
                    flex: 0,
                    alignSelf: 'stretch',
                  },
                ]}
                onPress={handleSubmitNew}
              >
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[
                styles.fixedButton,
                {
                  marginTop: 12,
                  flex: 0,
                  alignSelf: 'stretch',
                },
              ]}
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
                marginTop: 12,
                backgroundColor: '#333',
                flex: 0,
                alignSelf: 'stretch',
              },
            ]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
