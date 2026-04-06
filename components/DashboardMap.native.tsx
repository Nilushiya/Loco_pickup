import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../constants/theme';

const offlineMapStyle = [
  { elementType: 'geometry', stylers: [{ saturation: -100 }, { lightness: 10 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#5f5f5f' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
];

export default function DashboardMap({ isOnline = true }) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    const startLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      if (isOnline) {
        watcherRef.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => setLocation(loc)
        );
      }
    };

    startLocation();

    return () => {
      if (watcherRef.current) {
        watcherRef.current.remove();
        watcherRef.current = null;
      }
    };
  }, [isOnline]);

  if (errorMsg) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Locating rider...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        showsUserLocation={isOnline}
        showsMyLocationButton={isOnline}
        scrollEnabled={isOnline}
        zoomEnabled={isOnline}
        rotateEnabled={isOnline}
        pitchEnabled={isOnline}
        customMapStyle={isOnline ? [] : offlineMapStyle}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          title="My Location"
        >
          <MaterialCommunityIcons
            name="motorbike"
            size={32}
            color={isOnline ? Colors.default.primary : '#555'}
          />
        </Marker>
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 20,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorContainer: {
    flex: 1,
    margin: 20,
    backgroundColor: '#FFEBEB',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFCDD2',
    borderStyle: 'dashed',
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    padding: 10,
  },
  loadingContainer: {
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
  loadingText: {
    color: '#00838F',
    fontWeight: '600',
  },
});
