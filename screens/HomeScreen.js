// screens/HomeScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/globalStyles';
import { supabase } from '../utils/supaBaseConfig';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSync } from '../contexts/SyncContext';
import { AppContext } from '../contexts/AppContext';
import { useContext } from 'react';
import { wrapWithSync } from '../utils/SyncManager';
import FilterModal from '../components/FilterModal';
import { CombinedSyncBanner } from '../contexts/SyncContext';

export default function HomeScreen({ navigation }) {
const iconOffsetTop = 40; 
const [refreshKey, setRefreshKey] = useState(0);
  const { setIsSyncing } = useSync();
  const { setLoginData } = useContext(AppContext);
  const [machines, setMachines] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newMachineName, setNewMachineName] = useState('');
  const [companyId, setCompanyId] = useState(null);
const [showScrollHint, setShowScrollHint] = useState(false);
  const [listHeight, setListHeight] = useState(0);
const ITEM_HEIGHT = 75; 
const [scrollOffset, setScrollOffset] = useState(0);
const [filterModalVisible, setFilterModalVisible] = useState(false);
const [selectedFilterShop, setSelectedFilterShop] = useState('All');
const safeFilterShop = typeof selectedFilterShop === 'string' && selectedFilterShop !== '' ? selectedFilterShop : 'All';

const handleContentSizeChange = (contentWidth, contentHeight) => {
    setShowScrollHint(contentHeight > listHeight);
  };
const getRemainingCount = () => {
  const total = machines.length;
  const visibleCount = Math.ceil(listHeight / ITEM_HEIGHT);
const scrolledPast = Math.round(scrollOffset / ITEM_HEIGHT);
  const remaining = total - (scrolledPast + visibleCount);
  return remaining > 0 ? remaining : 0;
};


  useEffect(() => {
    const fetchCompanyAndMachines = async () => {
      await wrapWithSync('fetchMachines', async () => {
        const session = await AsyncStorage.getItem('loginData');
        const parsedSession = JSON.parse(session);
        const company_id = parsedSession?.companyId;
  
        if (!company_id) throw new Error('Missing companyId');
  
        setCompanyId(company_id);
  
        const { data, error } = await supabase
          .from('machines')
          .select('*')
          .eq('company_id', company_id);
  
        if (error) throw error;
  
        setMachines(data);
      });
    };
  
    const unsubscribe = navigation.addListener('focus', fetchCompanyAndMachines);
    return unsubscribe;
  }, [navigation]);
              

  const goToMachine = (machineId) => {
    navigation.navigate('MachineScreen', { machineId });
  };

  const addMachine = async () => {
    if (!newMachineName.trim()) return;
  

    setModalVisible(false);
  
    await wrapWithSync('addMachine', async () => {
      const { data, error } = await supabase
        .from('machines')
        .insert([{ name: newMachineName.trim(), company_id: companyId }])
        .select();
  
        if (error) throw error;
  
      console.log('Inserted machine:', data);
      setMachines((prevMachines) => [...prevMachines, ...data]);
      setNewMachineName('');
    });
  };
    
  const deleteMachine = async (id) => {
    Alert.alert(
      'Delete Machine',
      'Are you sure you want to delete this machine?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await wrapWithSync('deleteMachine', async () => {
              const { error } = await supabase
              .from('machines')
              .delete()
              .eq('id', id)
              .eq('company_id', companyId);
            
            if (error) throw error;
            
            setMachines((prevMachines) =>
              prevMachines.filter((m) => m.id !== id)
            );
                        });
          },
        },
      ]
    );
  };
  

return (
  
<View style={styles.container}>
  <CombinedSyncBanner />

  <View
    style={{
      position: 'relative',
      alignItems: 'center',
      paddingTop: 40,
      marginBottom: 10,
    }}
  >
    <Text
      style={[
        styles.header,
        {
          textAlign: 'center',
          paddingHorizontal: 60,
          flexWrap: 'wrap',
        },
      ]}
      numberOfLines={2}
    >
{safeFilterShop !== 'All' ? `(${safeFilterShop})` : 'Machines'}
    </Text>

<TouchableOpacity
  onPress={() => navigation.navigate('Login')}
  style={{
    position: 'absolute',
    left: 10,
    top: iconOffsetTop,
    padding: 6,
  }}
>
  <MaterialCommunityIcons name="cog-outline" size={26} color="#0f0" />
</TouchableOpacity>

<TouchableOpacity
  onPress={() => setFilterModalVisible(true)}
  style={{
    position: 'absolute',
    right: 10,
    top: iconOffsetTop,
    padding: 6,
  }}
>
  <MaterialCommunityIcons name="domain" size={26} color="#0f0" />
</TouchableOpacity>  </View>


    
    <View style={{ flex: 1 }}>
      <FlatList
data={
  safeFilterShop === 'All'
    ? machines
    : machines.filter((m) => m.shop === safeFilterShop)
}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 100 }}
        style={{ flex: 1 }}
        renderItem={({ item }) => (
          <View style={styles.machineItem}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => goToMachine(item.id)}
            >
              <Text style={styles.procName}>{item.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteMachine(item.id)}>
              <Text style={[styles.buttonText, { color: '#f00', fontSize: 20 }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyListText}>No machines added</Text>
        }
        onContentSizeChange={handleContentSizeChange}
        onLayout={(e) => setListHeight(e.nativeEvent.layout.height)}
         onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.y)}
  scrollEventThrottle={16}
      />
    </View>

{getRemainingCount() > 0 && (
<Text
  style={{
    color: '#0f0',
    textAlign: 'center',
    paddingRight: 4,
    fontSize: 12,
    lineHeight: 14,   
    marginTop: 2,     
    marginBottom: -7, 
  }}
>     Scroll {getRemainingCount()} More ...
  </Text>
)}

    <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
      <Text style={styles.addBtnText}>+ Add Machine</Text>
    </TouchableOpacity>

    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitleOutside}>Enter Machine Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Machine name"
            placeholderTextColor="#888"
            value={newMachineName}
            onChangeText={setNewMachineName}
          />
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.homeModalButton} onPress={addMachine}>
              <Text style={styles.homeModalButtonText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.homeModalCancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.homeModalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
<FilterModal
  visible={filterModalVisible}
  onClose={() => setFilterModalVisible(false)}
  companyId={companyId}
  currentShop={selectedFilterShop}
  onShopSelected={(shopName) => {
    setSelectedFilterShop(shopName);
    setFilterModalVisible(false);
  }}
/>

  </View>
);
  }