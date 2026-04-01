import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DashboardMap from '../../components/DashboardMap.native';
import OrderModal from '../../components/OrderModal';
import { Colors } from '../../constants/theme';

const mockOrder = {
  id: 'order_1',
  amount: 15.5,
  pickupLocation: '123 Main St, New York',
  dropoffLocation: '456 Market St, New York',
  distance: 3.2,
};

export default function RiderDashboard() {
  const router = useRouter();
  const [isOnline, setIsOnline] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // ✅ better timer handling
  const orderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOnline) {
      orderTimer.current = setTimeout(() => {
        setModalVisible(true);
      }, 5000);
    } else {
      setModalVisible(false);
    }

    return () => {
      if (orderTimer.current) {
        clearTimeout(orderTimer.current);
        orderTimer.current = null;
      }
    };
  }, [isOnline]);

  const toggleOnline = () => {
    setIsOnline((prev) => !prev);
  };

  const handleAcceptOrder = async () => {
    try {
      setModalVisible(false);
      await AsyncStorage.setItem('currentOrder', JSON.stringify(mockOrder));
      router.navigate('/(rider)/map' as any);
      console.log('Order accepted');
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const handleRejectOrder = () => {
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello, Rider!</Text>

          <Text
            style={[
              styles.statusText,
              { color: isOnline ? '#4CAF50' : '#757575' },
            ]}
          >
            {isOnline ? 'You are Online' : 'You are Offline'}
          </Text>
        </View>

        <View style={styles.toggleContainer}>
          <Text style={styles.toggleLabel}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>

          <Switch
            trackColor={{ false: '#767577', true: '#FFB2A5' }}
            thumbColor={isOnline ? Colors.default.primary : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={toggleOnline}
            value={isOnline}
          />
        </View>
      </View>

      {/* STATS */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="card" size={32} color={Colors.default.primary} />
          <Text style={styles.statValue}>$124.50</Text>
          <Text style={styles.statLabel}>Today's Earnings</Text>
        </View>

        <View style={styles.statBox}>
          {/* <AntDesign
            name="checkcircleo"
            size={32}
            color={Colors.default.primary}
          /> */}
          <Text style={styles.statValue}>8</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
      </View>

      {/* MAP PLACEHOLDER */}
      <DashboardMap />

      {/* OFFLINE BOX */}
      {!isOnline && (
        <View style={styles.offlineBox}>
          <Ionicons name="moon-outline" size={48} color="#757575" />
          <Text style={styles.offlineTitle}>
            You are currently offline
          </Text>
          <Text style={styles.offlineDesc}>
            Toggle status to start receiving orders!
          </Text>
        </View>
      )}

      {/* TEST BUTTON */}
      <TouchableOpacity
        style={styles.testBtn}
        onPress={() => setModalVisible(true)}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          Test Receive Order
        </Text>
      </TouchableOpacity>

      {/* ORDER MODAL */}
      <OrderModal
        visible={modalVisible}
        order={mockOrder}
        onAccept={handleAcceptOrder}
        onReject={handleRejectOrder}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.default.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.default.primary,
  },
  statusText: {
    fontSize: 14,
    marginTop: 5,
  },
  toggleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 10,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
  },
  mapPlaceholder: {
    flex: 1,
    margin: 20,
    backgroundColor: '#E0F7FA',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#B2EBF2',
    borderStyle: 'dashed',
  },
  mapText: {
    fontSize: 18,
    color: '#006064',
    marginTop: 10,
    fontWeight: '600',
  },
  mapSubText: {
    fontSize: 14,
    color: '#00838F',
    marginTop: 5,
  },
  testBtn: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  offlineBox: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 5,
  },
  offlineTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
  },
  offlineDesc: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 10,
  },
});