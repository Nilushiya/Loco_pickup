import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardMap() {
  return (
    <View style={styles.mapPlaceholder}>
      <Ionicons name="map-outline" size={64} color="#BDBDBD" />
      <Text style={styles.mapText}>Finding your location...</Text>
      <Text style={styles.mapSubText}>GPS maps will be tracking here</Text>
      <Text style={[styles.mapSubText, { color: '#F44336', marginTop: 10 }]}>Web map unsupported</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
