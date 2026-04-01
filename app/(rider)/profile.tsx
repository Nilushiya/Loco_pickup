import { Feather, FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { Colors } from '../../constants/theme';
import { logout } from '../../redux/slices/authSlice';

export default function RiderProfileScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userRole');
    dispatch(logout());
    router.replace('/(auth)/login');
  };

  const menuItems = [
    { title: 'Earnings', icon: 'dollar', library: FontAwesome, value: '$450.00' },
    { title: 'Order History', icon: 'history', library: MaterialIcons, value: '15 deliveries' },
    { title: 'Settings', icon: 'settings', library: Feather, value: '' },
    { title: 'Help & Support', icon: 'help-circle', library: Feather, value: '' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Profile Header */}
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
            style={styles.avatar}
          />
          <View style={styles.info}>
            <Text style={styles.name}>John Doe (Rider)</Text>
            <Text style={styles.rating}>
              <FontAwesome name="star" size={16} color="#FFD700" /> 4.9 (120 Ratings)
            </Text>
            <Text style={styles.vehicle}>Vehicle: Honda CG 125</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem}>
              <View style={styles.menuLeft}>
                <item.library name={item.icon as any} size={24} color={Colors.default.primary} />
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <View style={styles.menuRight}>
                {item.value ? <Text style={styles.menuValue}>{item.value}</Text> : null}
                <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: 30,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  rating: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  vehicle: {
    fontSize: 14,
    color: '#757575',
  },
  menuContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    marginBottom: 30,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuValue: {
    fontSize: 14,
    color: '#757575',
    marginRight: 10,
  },
  logoutBtn: {
    backgroundColor: '#FFEBEE',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  logoutText: {
    color: '#D32F2F',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
