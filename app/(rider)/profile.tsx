import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import apiClient from '../../api/client';
import {
  fetchPickupPersonDetails,
  getStoredPickupPersonId,
} from '../../api/pickupPersonService';
import { ENDPOINTS } from '../../constants/Config';
import { Colors } from '../../constants/theme';
import { logout } from '../../redux/slices/authSlice';

export default function RiderProfileScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { id, token } = useSelector((state: any) => state.auth);
  const [pickupPerson, setPickupPerson] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPickupPerson = async () => {
      try {
        setIsLoading(true);
        const resolvedId = await getStoredPickupPersonId(id, token);

        if (!resolvedId) {
          return;
        }

        const details = await fetchPickupPersonDetails(resolvedId);
        setPickupPerson(details);
      } catch (error) {
        console.error('Failed to load pickup person profile:', error);
        Alert.alert('Error', 'Could not load your profile details.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPickupPerson();
  }, [id, token]);

  const handleLogout = async () => {
    try {
      const resolvedId = pickupPerson?.id ?? id;

      if (resolvedId) {
        await apiClient.put(ENDPOINTS.UPDATE_AVAILABILITY, {
          availability: false,
          id: Number(resolvedId),
        });
      }
    } catch (error) {
      console.log('Availability was already off or update failed.');
    }

    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('userRole');
    dispatch(logout());
    router.replace('/(auth)/login');
  };

  const joinedDate = pickupPerson?.createdAt
    ? new Date(pickupPerson.createdAt).toLocaleDateString()
    : 'Not available';

  const fullName = pickupPerson
    ? `${pickupPerson.firstname || ''} ${pickupPerson.lastname || ''}`.trim()
    : 'Pickup Person';

  const menuItems = [
    {
      title: 'Email',
      icon: 'email',
      library: MaterialIcons,
      value: pickupPerson?.email || 'Not available',
    },
    {
      title: 'Phone Number',
      icon: 'phone',
      library: Feather,
      value: pickupPerson?.phoneNumber || 'Not available',
    },
    {
      title: 'Status',
      icon: 'check-circle',
      library: Feather,
      value: pickupPerson?.status || 'Not available',
    },
    {
      title: 'Availability',
      icon: 'radio-button-on',
      library: Ionicons,
      value: pickupPerson?.availability ? 'ONLINE' : 'OFFLINE',
    },
    {
      title: 'Verification',
      icon: 'shield-checkmark-outline',
      library: Ionicons,
      value: pickupPerson?.isVerified ? 'Verified' : 'Not Verified',
    },
    {
      title: 'Joined',
      icon: 'calendar',
      library: Feather,
      value: joinedDate,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
            style={styles.avatar}
          />
          <View style={styles.info}>
            <Text style={styles.name}>{fullName}</Text>
            <Text style={styles.roleText}>Pickup Partner</Text>
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.default.primary} />
            ) : (
              <Text style={styles.metaText}>
                ID: {pickupPerson?.id ?? 'Not available'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <View
              key={`${item.title}-${index}`}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
            >
              <View style={styles.menuLeft}>
                <item.library
                  name={item.icon as any}
                  size={24}
                  color={Colors.default.primary}
                />
                <Text style={styles.menuText}>{item.title}</Text>
              </View>
              <View style={styles.menuRight}>
                <Text style={styles.menuValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

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
    backgroundColor: '#fff',
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
  roleText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
  },
  metaText: {
    fontSize: 14,
    color: '#757575',
  },
  menuContainer: {
    backgroundColor: '#fff',
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
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  menuRight: {
    maxWidth: '55%',
    alignItems: 'flex-end',
  },
  menuValue: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'right',
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
