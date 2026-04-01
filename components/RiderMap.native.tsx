import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { Colors } from '../constants/theme';

// IMPORTANT: Replace this with your actual Google Maps API Key
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

const { width, height } = Dimensions.get('window');

// Helper to calculate slightly offset coordinates for demo route
const getDemoCoords = () => {
  return [
    { latitude: 40.7128, longitude: -74.0060 }, // Rider initial
    { latitude: 40.7142, longitude: -74.0064 },
    { latitude: 40.7155, longitude: -74.0048 }, // Pickup
    { latitude: 40.7180, longitude: -74.0010 },
    { latitude: 40.7220, longitude: -73.9980 }, // Dropoff
  ];
};

export default function RiderMapScreen() {
  const router = useRouter();
  const [orderState, setOrderState] = useState<'heading_to_pickup' | 'arrived' | 'delivering' | 'delivered'>('heading_to_pickup');
  const [order, setOrder] = useState<any>(null);

  // Real-world location tracking
  const [riderLocation, setRiderLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const mapRef = React.useRef<MapView>(null);

  // Mock locations for the order (These would come from the API)
  const pickupCoords = { latitude: 40.7155, longitude: -74.0048 };
  const dropoffCoords = { latitude: 40.7220, longitude: -73.9980 };

  useEffect(() => {
    loadOrder();
    startLocationTracking();
  }, []);

  const startLocationTracking = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Permission to access location was denied');
      Alert.alert('Permission Denied', 'Please enable location services to use rider tracking.');
      return;
    }

    // Get initial location
    let initialLocation = await Location.getCurrentPositionAsync({});
    setRiderLocation({
      latitude: initialLocation.coords.latitude,
      longitude: initialLocation.coords.longitude
    });

    // Start watching position
    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 5,
      },
      (location) => {
        const newCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setRiderLocation(newCoords);

        // Auto-center map on rider location during navigation
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            ...newCoords,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        }
      }
    );
  };

  const loadOrder = async () => {
    try {
      const orderStr = await AsyncStorage.getItem('currentOrder');
      if (orderStr) {
        setOrder(JSON.parse(orderStr));
      }
    } catch (e) {
      console.log(e);
    }
  };

  const currentStepLabel = () => {
    switch (orderState) {
      case 'heading_to_pickup': return 'Heading to Pickup';
      case 'arrived': return 'Ready to start Delivery';
      case 'delivering': return 'On The Way to Customer';
      case 'delivered': return 'Order Complete';
      default: return '';
    }
  };

  const handleAction = () => {
    if (orderState === 'heading_to_pickup') {
      setOrderState('arrived');
    } else if (orderState === 'arrived') {
      setOrderState('delivering');
    } else if (orderState === 'delivering') {
      setOrderState('delivered');
      Alert.alert("Success", "Order delivered successfully!", [
        {
          text: "OK", onPress: () => {
            AsyncStorage.removeItem('currentOrder');
            router.navigate('/(rider)/index' as any);
          }
        }
      ]);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes", onPress: () => {
            AsyncStorage.removeItem('currentOrder');
            router.navigate('/(rider)/index' as any);
          }
        }
      ]
    );
  };

  if (!order) {
    return (
      <View style={styles.noOrder}>
        <FontAwesome name="map-o" size={64} color="#ccc" />
        <Text style={styles.noOrderText}>No active orders</Text>
        <TouchableOpacity style={styles.btnReturn} onPress={() => router.navigate('/(rider)/index' as any)}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Go back Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Determine routing parameters
  const getOrigin = () => {
    if (orderState === 'heading_to_pickup' || orderState === 'arrived') {
      return riderLocation || pickupCoords; // Route from Rider -> Pickup
    }
    return pickupCoords; // Route from Pickup -> Dropoff
  };

  const getDestination = () => {
    if (orderState === 'heading_to_pickup' || orderState === 'arrived') {
      return pickupCoords;
    }
    return dropoffCoords;
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: riderLocation?.latitude || 40.7150,
          longitude: riderLocation?.longitude || -74.0050,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Dynamic Route Polyline based on current order state */}
        {(riderLocation || orderState === 'delivering') && (
          <MapViewDirections
            origin={getOrigin()}
            destination={getDestination()}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor={Colors.default.primary}
            optimizeWaypoints={true}
            onError={(errorMessage) => console.log('MapViewDirections Error: ', errorMessage)}
          />
        )}

        {/* Fallback mock polyline if API key fails or during dev */}
        <Polyline
          coordinates={[getOrigin(), getDestination()]}
          strokeColor="rgba(255, 112, 67, 0.4)" // Faint red fallback
          strokeWidth={4}
          lineDashPattern={[5, 10]}
        />

        {/* Rider Marker (Only show custom marker if we don't rely on showsUserLocation, but we do use expo-location) */}
        {riderLocation && orderState !== 'delivered' && (
          <Marker coordinate={riderLocation} title="You">
            <MaterialCommunityIcons name="motorbike" size={36} color={Colors.default.primary} />
          </Marker>
        )}

        {/* Pickup marker */}
        <Marker coordinate={pickupCoords} title="Pickup" description={order?.pickupLocation}>
          <FontAwesome name="building" size={24} color="#4CAF50" />
        </Marker>

        {/* Dropoff marker */}
        <Marker coordinate={dropoffCoords} title="Dropoff" description={order?.dropoffLocation}>
          <FontAwesome name="home" size={24} color="#F44336" />
        </Marker>
      </MapView>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/(rider)/index' as any)}>
        <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
      </TouchableOpacity>

      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />

        <View style={styles.headerInfo}>
          <Text style={styles.statusText}>{currentStepLabel()}</Text>
          <Text style={styles.earningsText}>${order.amount.toFixed(2)}</Text>
        </View>

        <View style={styles.addressList}>
          <View style={orderState === 'heading_to_pickup' ? styles.activeLoc : styles.inactiveLoc}>
            <Text style={styles.locLabel}>Pickup Point</Text>
            <Text style={styles.locVal}>{order.pickupLocation}</Text>
          </View>
          <View style={styles.addressDivider} />
          <View style={orderState === 'delivering' ? styles.activeLoc : styles.inactiveLoc}>
            <Text style={styles.locLabel}>Drop-off Point</Text>
            <Text style={styles.locVal}>{order.dropoffLocation}</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAction}>
            <Text style={styles.primaryBtnTxt}>
              {orderState === 'heading_to_pickup' ? 'Arrived at Pickup' :
                orderState === 'arrived' ? 'Start Delivery' : 'Delivered'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  dragHandle: {
    width: 60,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  earningsText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.default.primary,
  },
  addressList: {
    backgroundColor: '#F7F7F7',
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
  },
  activeLoc: {
    opacity: 1,
  },
  inactiveLoc: {
    opacity: 0.5,
  },
  locLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  locVal: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  addressDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelBtn: {
    flex: 0.3,
    paddingVertical: 15,
    backgroundColor: '#FFEBEB',
    borderRadius: 25,
    alignItems: 'center',
  },
  cancelBtnTxt: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 16,
  },
  primaryBtn: {
    flex: 0.65,
    backgroundColor: Colors.default.primary,
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnTxt: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noOrder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA'
  },
  noOrderText: {
    marginTop: 15,
    fontSize: 18,
    color: '#757575',
    marginBottom: 20,
  },
  btnReturn: {
    backgroundColor: Colors.default.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  }
});
