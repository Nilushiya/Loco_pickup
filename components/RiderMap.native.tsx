import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import {
  buildPickupClaimPayload,
  cancelPickupOrder,
  fetchPickupOrderDetails,
  handoverOrder,
  pickupOrder,
} from '../api/orderService';
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
  const [pickupOrderDetails, setPickupOrderDetails] = useState<any>(null);
  const [isSubmittingPickup, setIsSubmittingPickup] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{ latitude: number, longitude: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ latitude: number, longitude: number } | null>(null);

  // Real-world location tracking
  const [riderLocation, setRiderLocation] = useState<{ latitude: number, longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const mapRef = React.useRef<MapView>(null);
  const orderFee = Number(order?.deliveryFee ?? order?.amount ?? 0);
  const customerName =
    order?.user?.firstname && order?.user?.lastname
      ? `${order.user.firstname} ${order.user.lastname}`
      : order?.user?.name ||
        order?.customerName ||
        order?.userName ||
        'Customer';
  const deliveryUserName = pickupOrderDetails?.userName || customerName;
  const deliveryUserPhone =
    pickupOrderDetails?.userPhoneNumber ||
    order?.userPhoneNumber ||
    'Phone not available';
  const stationDisplayName =
    pickupOrderDetails?.stationName || order?.stationName || 'Station';
  const stationDisplayAddress =
    pickupOrderDetails?.stationAddress ||
    order?.dropLocation ||
    order?.dropoffLocation ||
    '';
  const trainDisplayName =
    pickupOrderDetails?.trainName || order?.trainName || 'Train not available';
  const restaurantDisplayName =
    pickupOrderDetails?.restaurantName || order?.restaurantName || 'Restaurant';
  const restaurantDisplayAddress =
    pickupOrderDetails?.restaurantAddress || order?.pickupLocation || '';
  const detailItems = pickupOrderDetails?.items || [];
  const detailTotalAmount = Number(
    pickupOrderDetails?.totalAmount ?? orderFee
  ) || 0;

  useEffect(() => {
    loadOrder();
    startLocationTracking();
  }, []);

  useEffect(() => {
    const loadPickupDetails = async () => {
      if (!order?.id || !order?.pickupPersonId) {
        return;
      }

      try {
        setIsLoadingDetails(true);
        const details = await fetchPickupOrderDetails({
          orderId: order.id,
          pickupPersonId: order.pickupPersonId,
        });
        console.log('Fetched pickup order details:', details, order.id, order.pickupPersonId);
        setPickupOrderDetails(details);
      } catch (error) {
        console.log('Failed to load pickup order details:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    loadPickupDetails();
  }, [order?.id, order?.pickupPersonId]);

  useEffect(() => {
    const resolveRoutePoints = async () => {
      if (!order) {
        return;
      }

      try {
        const nextPickupCoords =
          order?.pickupCoords ||
          (order?.pickupLocation
            ? (await Location.geocodeAsync(order.pickupLocation))[0]
            : null);

        const nextDropoffCoords =
          order?.dropoffCoords ||
          (order?.dropLocation || order?.dropoffLocation
            ? (
                await Location.geocodeAsync(
                  order.dropLocation || order.dropoffLocation
                )
              )[0]
            : null);

        setPickupCoords(
          nextPickupCoords
            ? {
                latitude: nextPickupCoords.latitude,
                longitude: nextPickupCoords.longitude,
              }
            : null
        );
        setDropoffCoords(
          nextDropoffCoords
            ? {
                latitude: nextDropoffCoords.latitude,
                longitude: nextDropoffCoords.longitude,
              }
            : null
        );
      } catch (error) {
        console.log('Failed to geocode order route:', error);
      }
    };

    resolveRoutePoints();
  }, [order]);

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
      case 'heading_to_pickup': return 'Heading to Restaurant';
      case 'arrived': return 'At Restaurant';
      case 'delivering': return 'Heading to Station';
      case 'delivered': return 'Order Complete';
      default: return '';
    }
  };

  const handleAction = async () => {
    if (orderState === 'heading_to_pickup') {
      setOrderState('arrived');
    } else if (orderState === 'arrived') {
      try {
        setIsSubmittingPickup(true);
        await pickupOrder(
          buildPickupClaimPayload(order, order?.pickupPersonId)
        );
        setOrderState('delivering');
      } catch (error: any) {
        Alert.alert(
          'Pickup Failed',
          error?.response?.data?.message ||
            'Could not confirm pickup. Please try again.'
        );
      } finally {
        setIsSubmittingPickup(false);
      }
    } else if (orderState === 'delivering') {
      try {
        await handoverOrder(
          buildPickupClaimPayload(order, order?.pickupPersonId)
        );
        setOrderState('delivered');
        Alert.alert("Success", "Order handed over successfully!", [
          {
            text: "OK", onPress: () => {
              AsyncStorage.removeItem('currentOrder');
              router.navigate('/(rider)/index' as any);
            }
          }
        ]);
      } catch (error: any) {
        Alert.alert(
          'Handover Failed',
          error?.response?.data?.message ||
            'Could not hand over this order. Please try again.'
        );
      }
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Order",
      "Are you sure you want to cancel? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes", onPress: async () => {
            try {
              await cancelPickupOrder(
                buildPickupClaimPayload(order, order?.pickupPersonId)
              );
            } catch (error: any) {
              Alert.alert(
                'Cancel Failed',
                error?.response?.data?.message ||
                  'Could not cancel this order. Please try again.'
              );
              return;
            }

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
    return riderLocation || pickupCoords || dropoffCoords || {
      latitude: 6.9744,
      longitude: 79.9161,
    };
  };

  const getDestination = () => {
    if (orderState === 'heading_to_pickup' || orderState === 'arrived') {
      return pickupCoords || getOrigin();
    }
    return dropoffCoords || getOrigin();
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={true}
        showsMyLocationButton={true}
        initialRegion={{
          latitude: riderLocation?.latitude || 6.9744,
          longitude: riderLocation?.longitude || 79.9161,
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
            strokeColor="#2F80ED"
            optimizeWaypoints={true}
            onError={(errorMessage) => console.log('MapViewDirections Error: ', errorMessage)}
          />
        )}

        {pickupCoords && dropoffCoords ? (
          <Polyline
            coordinates={[getOrigin(), getDestination()]}
            strokeColor="rgba(47, 128, 237, 0.35)"
            strokeWidth={4}
            lineDashPattern={[5, 10]}
          />
        ) : null}

        {/* Rider Marker (Only show custom marker if we don't rely on showsUserLocation, but we do use expo-location) */}
        {riderLocation && orderState !== 'delivered' && (
          <Marker coordinate={riderLocation} title="You">
            <MaterialCommunityIcons name="motorbike" size={36} color={Colors.default.primary} />
          </Marker>
        )}

        {/* Pickup marker */}
        {pickupCoords ? (
          <Marker
            coordinate={pickupCoords}
            title={restaurantDisplayName}
            description={restaurantDisplayAddress}
          >
            <FontAwesome name="building" size={24} color="#4CAF50" />
          </Marker>
        ) : null}

        {dropoffCoords ? (
          <Marker
            coordinate={dropoffCoords}
            title={stationDisplayName}
            description={stationDisplayAddress}
          >
            <FontAwesome name="home" size={24} color="#F44336" />
          </Marker>
        ) : null}
      </MapView>

      <TouchableOpacity style={styles.backBtn} onPress={() => router.navigate('/(rider)/index' as any)}>
        <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
      </TouchableOpacity>

      <View style={styles.bottomSheet}>
        <View style={styles.dragHandle} />

        <View style={styles.headerInfo}>
          <Text style={styles.statusText}>{currentStepLabel()}</Text>
          <Text style={styles.earningsText}>Rs. {detailTotalAmount.toFixed(2)}</Text>
        </View>

        <ScrollView
          style={styles.sheetScroll}
          contentContainerStyle={styles.sheetScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.addressList}>
          {orderState === 'heading_to_pickup' || orderState === 'arrived' ? (
            <>
              <View style={styles.activeLoc}>
                <Text style={styles.locLabel}>Restaurant</Text>
                <Text style={styles.locVal}>{restaurantDisplayName}</Text>
                <Text style={styles.locSubVal}>{restaurantDisplayAddress}</Text>
              </View>
              {orderState === 'arrived' ? (
                <>
                  <View style={styles.addressDivider} />
                  <View style={styles.activeLoc}>
                    <Text style={styles.locLabel}>Order Items</Text>
                    {isLoadingDetails ? (
                      <Text style={styles.locSubVal}>Loading items...</Text>
                    ) : detailItems.length > 0 ? (
                      detailItems.map((item: any) => (
                        <View key={String(item.id)} style={styles.itemRow}>
                          {item.image ? (
                            <Image
                              source={{ uri: item.image }}
                              style={styles.itemImage}
                            />
                          ) : (
                            <View style={styles.itemPlaceholder}>
                              <MaterialCommunityIcons
                                name="food-outline"
                                size={18}
                                color="#7D7D7D"
                              />
                            </View>
                          )}
                          <View style={styles.itemInfo}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemMeta}>
                              Qty {item.quantity} x Rs. {Number(item.unitPrice || 0).toFixed(2)}
                            </Text>
                          </View>
                          <Text style={styles.itemTotal}>
                            Rs. {Number(item.total || 0).toFixed(2)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.locSubVal}>No item details available.</Text>
                    )}
                  </View>
                  <View style={styles.addressDivider} />
                  <View style={styles.activeLoc}>
                    <Text style={styles.locLabel}>Total Amount</Text>
                    <Text style={styles.locVal}>Rs. {detailTotalAmount.toFixed(2)}</Text>
                  </View>
                </>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.activeLoc}>
                <Text style={styles.locLabel}>Drop Point</Text>
                <Text style={styles.locVal}>{stationDisplayName}</Text>
                <Text style={styles.locSubVal}>{stationDisplayAddress}</Text>
              </View>
              <View style={styles.addressDivider} />
              <View style={styles.activeLoc}>
                <Text style={styles.locLabel}>User</Text>
                <Text style={styles.locVal}>{deliveryUserName}</Text>
                <Text style={styles.locSubVal}>{deliveryUserPhone}</Text>
              </View>
              <View style={styles.addressDivider} />
              <View style={styles.activeLoc}>
                <Text style={styles.locLabel}>Train</Text>
                <Text style={styles.locVal}>{trainDisplayName}</Text>
              </View>
            </>
          )}
          </View>
        </ScrollView>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelBtnTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleAction}>
            <Text style={styles.primaryBtnTxt}>
              {orderState === 'heading_to_pickup'
                ? 'ARRIVED TO SHOP'
                : orderState === 'arrived'
                  ? (isSubmittingPickup ? 'SAVING...' : 'PICKUP')
                  : 'HANDOVER'}
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
    maxHeight: height * 0.52,
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
    marginBottom: 16,
  },
  sheetScroll: {
    maxHeight: height * 0.28,
  },
  sheetScrollContent: {
    paddingBottom: 6,
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
  locSubVal: {
    fontSize: 14,
    color: '#6F6F6F',
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  itemImage: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EAEAEA',
  },
  itemPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#ECECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  itemMeta: {
    fontSize: 12,
    color: '#6F6F6F',
    marginTop: 3,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.default.primary,
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
