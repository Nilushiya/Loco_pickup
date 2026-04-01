import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/theme';

export default function RiderMapScreenWeb() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.noOrder}>
        <FontAwesome name="map-o" size={64} color="#ccc" />
        <Text style={styles.noOrderText}>Map is not supported on Web</Text>
        <Text style={styles.subText}>Please use a real device or emulator to test rider navigation features.</Text>
        <TouchableOpacity style={styles.btnReturn} onPress={() => router.push('/(rider)' as any)}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Go back Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA'
  },
  noOrder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  noOrderText: {
    marginTop: 15,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
  btnReturn: {
    backgroundColor: Colors.default.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 20,
  }
});
