import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  buildPickupClaimPayload,
  claimPickupOrder,
  fetchOrdersByStatus,
} from '../../api/orderService';
import apiClient from '../../api/client';
import {
  fetchPickupPersonDetails,
  getStoredPickupPersonId,
} from '../../api/pickupPersonService';
import DashboardMap from '../../components/DashboardMap.native';
import OrderModal from '../../components/OrderModal';
import { ENDPOINTS } from '../../constants/Config';
import { Colors } from '../../constants/theme';

const POLL_INTERVAL_MS = 4000;

export default function RiderDashboard() {
  const router = useRouter();
  const { id: userId, token } = useSelector((state: any) => state.auth);
  const [isOnline, setIsOnline] = useState(false);
  const [pickupPerson, setPickupPerson] = useState<any>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<number | null>(null);
  const [todayEarnings] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inFlightRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const hiddenRequestIdsRef = useRef<Set<number>>(new Set());

  const currentRequest = requests[0] ?? null;
  const modalVisible = isOnline && Boolean(currentRequest);

  useEffect(() => {
    const loadPickupPerson = async () => {
      try {
        setIsProfileLoading(true);
        const resolvedId = await getStoredPickupPersonId(userId, token);

        if (!resolvedId) {
          return;
        }

        const details = await fetchPickupPersonDetails(resolvedId);

        if (details) {
          setPickupPerson(details);
          setIsOnline(Boolean(details.availability));
        }
      } catch (error) {
        console.error('Failed to load pickup person details:', error);
      } finally {
        setIsProfileLoading(false);
      }
    };

    loadPickupPerson();
  }, [token, userId]);

  const mergeRequests = useCallback((incomingRequests: any[]) => {
    const visibleIncoming = incomingRequests.filter(
      (request) =>
        request?.status === 'ACCEPTED' &&
        !hiddenRequestIdsRef.current.has(request.id)
    );

    setRequests((current) => {
      const incomingMap = new Map(
        visibleIncoming.map((request) => [request.id, request])
      );
      const currentMap = new Map(current.map((request) => [request.id, request]));
      const nextExisting = current.filter((request) => incomingMap.has(request.id));
      const freshRequests = visibleIncoming.filter(
        (request) => !currentMap.has(request.id)
      );

      if (freshRequests.length === 0 && nextExisting.length === current.length) {
        return current;
      }

      return [...freshRequests, ...nextExisting];
    });
  }, []);

  const runPollingCycle = useCallback(async () => {
    if (!isOnline || inFlightRef.current) {
      return;
    }

    inFlightRef.current = true;
    setIsPolling(true);

    try {
      const acceptedOrders = await fetchOrdersByStatus('ACCEPTED');
      mergeRequests(acceptedOrders);
    } catch (error) {
      console.error('Failed to fetch accepted orders:', error);
    } finally {
      inFlightRef.current = false;
      setIsPolling(false);
    }
  }, [isOnline, mergeRequests]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    inFlightRef.current = false;
    setIsPolling(false);
  }, []);

  const startPolling = useCallback(() => {
    if (!isOnline || intervalRef.current) {
      return;
    }

    runPollingCycle();
    intervalRef.current = setInterval(() => {
      runPollingCycle();
    }, POLL_INTERVAL_MS);
  }, [isOnline, runPollingCycle]);

  useFocusEffect(
    useCallback(() => {
      if (AppState.currentState === 'active') {
        startPolling();
      }

      return () => {
        stopPolling();
      };
    }, [startPolling, stopPolling])
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      appStateRef.current = nextState;

      if (nextState === 'active') {
        startPolling();
      } else if (wasActive) {
        stopPolling();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (!isOnline) {
      stopPolling();
      setRequests([]);
    }
  }, [isOnline, stopPolling]);

  const toggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    try {
      const resolvedId = await getStoredPickupPersonId(
        pickupPerson?.id ?? userId,
        token
      );

      if (!resolvedId) {
        throw new Error('Pickup person id is not available.');
      }

      await apiClient.put(ENDPOINTS.UPDATE_AVAILABILITY, {
        availability: newStatus,
        id: resolvedId,
      });

      setPickupPerson((current: any) =>
        current ? { ...current, availability: newStatus } : current
      );

      if (newStatus) {
        startPolling();
      } else {
        stopPolling();
      }
    } catch (error) {
      console.error('Failed to update availability:', error);
      Alert.alert('Error', 'Could not update your availability. Please try again.');
      setIsOnline(!newStatus);
    }
  };

  const removeRequestFromState = useCallback((requestId: number) => {
    setRequests((current) => current.filter((request) => request.id !== requestId));
  }, []);

  const handleAcceptOrder = useCallback(async () => {
    if (!currentRequest) {
      return;
    }

    try {
      setActiveRequestId(currentRequest.id);
      hiddenRequestIdsRef.current.add(currentRequest.id);

      await claimPickupOrder(
        buildPickupClaimPayload(currentRequest, pickupPerson?.id )
      );

      removeRequestFromState(currentRequest.id);
      await AsyncStorage.setItem('currentOrder', JSON.stringify(currentRequest));
      router.navigate('/(rider)/map' as any);
    } catch (error: any) {
      hiddenRequestIdsRef.current.delete(currentRequest.id);
      console.error('Failed to accept pickup request:', error);
      Alert.alert(
        'Accept Failed',
        error?.response?.data?.message ||
          'Could not accept this request. It may already be taken.'
      );
      await runPollingCycle();
    } finally {
      setActiveRequestId(null);
    }
  }, [currentRequest, pickupPerson?.id, removeRequestFromState, router, runPollingCycle, userId]);

  const handleRejectOrder = useCallback(async () => {
    if (!currentRequest) {
      return;
    }

    try {
      setActiveRequestId(currentRequest.id);
      hiddenRequestIdsRef.current.add(currentRequest.id);
      removeRequestFromState(currentRequest.id);
    } catch (error: any) {
      hiddenRequestIdsRef.current.delete(currentRequest.id);
      console.error('Failed to dismiss pickup request:', error);
      Alert.alert(
        'Dismiss Failed',
        'Could not dismiss this request. Please try again.'
      );
    } finally {
      setActiveRequestId(null);
    }
  }, [currentRequest, removeRequestFromState]);

  const pendingCount = requests.length;
  const requestCountLabel = pendingCount < 10 ? `0${pendingCount}` : `${pendingCount}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Hello, {pickupPerson?.firstname || 'Rider'}!
          </Text>

          <Text
            style={[
              styles.statusText,
              { color: isOnline ? '#4CAF50' : '#757575' },
            ]}
          >
            {isOnline ? 'You are Online' : 'You are Offline'}
          </Text>
          {isProfileLoading ? (
            <ActivityIndicator
              size="small"
              color={Colors.default.primary}
              style={styles.headerLoader}
            />
          ) : null}
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

      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="notifications" size={32} color={Colors.default.primary} />
          <Text style={styles.statValue}>{requestCountLabel}</Text>
          <Text style={styles.statLabel}>Open Requests</Text>
        </View>

        <View style={styles.earningsBubble}>
          <Ionicons name="wallet-outline" size={26} color={Colors.default.primary} />
          <Text style={styles.earningsValue}>Rs. {todayEarnings.toFixed(0)}</Text>
          <Text style={styles.earningsLabel}>Today</Text>
        </View>
      </View>

      <DashboardMap isOnline={isOnline} />

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

      <OrderModal
        visible={modalVisible && activeRequestId === null}
        order={currentRequest}
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
  headerLoader: {
    marginTop: 8,
    alignSelf: 'flex-start',
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
    alignItems: 'center',
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
  earningsBubble: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F4E6E0',
  },
  earningsValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  earningsLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
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
