import { Entypo, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/theme';

const { width } = Dimensions.get('window');

interface OrderModalProps {
  visible: boolean;
  order: any;
  onAccept: () => void;
  onReject: () => void;
}

const OrderModal: React.FC<OrderModalProps> = ({ visible, order, onAccept, onReject }) => {
  if (!order) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="slide"
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.newOrderTitle}>New Delivery Request!</Text>

          <View style={styles.amountContainer}>
            <Text style={styles.amountText}>${order.amount}</Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.row}>
              <Entypo name="location-pin" size={24} color={Colors.default.primary} />
              <View style={styles.textWrap}>
                <Text style={styles.label}>Pickup</Text>
                <Text style={styles.value}>{order.pickupLocation}</Text>
              </View>
            </View>

            <View style={styles.dashedLine} />

            <View style={styles.row}>
              <MaterialCommunityIcons name="map-marker-check" size={24} color="#4CAF50" />
              <View style={styles.textWrap}>
                <Text style={styles.label}>Drop-off</Text>
                <Text style={styles.value}>{order.dropoffLocation}</Text>
              </View>
            </View>

            <View style={styles.row}>
              <MaterialCommunityIcons name="map-marker-distance" size={24} color="#757575" />
              <View style={styles.textWrap}>
                <Text style={styles.label}>Distance</Text>
                <Text style={styles.value}>{order.distance} miles</Text>
              </View>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.rejectBtn]} onPress={onReject}>
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.acceptBtn]} onPress={onAccept}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default OrderModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  newOrderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.default.primary,
    marginBottom: 10,
  },
  amountContainer: {
    backgroundColor: '#FFF0E6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginBottom: 20,
  },
  amountText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.default.primary,
  },
  detailsContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 15,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  textWrap: {
    marginLeft: 15,
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#757575',
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dashedLine: {
    height: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    marginVertical: 5,
    marginLeft: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  rejectBtn: {
    backgroundColor: '#FFEBEB',
    borderWidth: 1,
    borderColor: '#FF5252',
  },
  acceptBtn: {
    backgroundColor: Colors.default.primary,
  },
  rejectText: {
    color: '#FF5252',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
