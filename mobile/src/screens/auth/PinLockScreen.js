import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';

export default function PinLockScreen() {
  const { unlockWithPin, company, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDigit = async (digit) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setErrorMsg('');

      if (nextPin.length === 4) {
        try {
          const success = await unlockWithPin(nextPin);
          if (!success) {
            setErrorMsg('Incorrect PIN. Please try again.');
            setPin('');
          }
        } catch (err) {
          setErrorMsg(err.message || 'Verification failed');
          setPin('');
        }
      }
    }
  };

  const handleDelete = () => {
    if (pin.length > 0) {
      setPin(pin.slice(0, -1));
      setErrorMsg('');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.logoBadge}>
          <Ionicons name="lock-closed" size={32} color={colors.goldPrimary} />
        </View>
        <Text style={styles.companyName}>{company?.name || 'TimberBooks'}</Text>
        <Text style={styles.instruction}>Enter Quick 4-Digit PIN</Text>

        {/* PIN Dots */}
        <View style={styles.dotsRow}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isFilled ? styles.dotFilled : null,
                  errorMsg ? styles.dotError : null
                ]}
              />
            );
          })}
        </View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>

      {/* Numeric Keypad */}
      <View style={styles.keypad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['bio', '0', 'del']
        ].map((row, rIdx) => (
          <View key={rIdx} style={styles.keypadRow}>
            {row.map((btn) => {
              if (btn === 'del') {
                return (
                  <TouchableOpacity
                    key={btn}
                    style={styles.keyButton}
                    onPress={handleDelete}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="backspace-outline" size={24} color={colors.white} />
                  </TouchableOpacity>
                );
              }
              if (btn === 'bio') {
                return (
                  <TouchableOpacity
                    key={btn}
                    style={styles.keyButton}
                    onPress={() => Alert.alert('Biometric Unlock', 'Touch fingerprint sensor or look at screen.')}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="finger-print" size={28} color={colors.goldPrimary} />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={btn}
                  style={styles.keyButton}
                  onPress={() => handleDigit(btn)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{btn}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <TouchableOpacity style={styles.switchLoginBtn} onPress={logout}>
          <Text style={styles.switchLoginText}>Use Master Password Instead</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navyDark,
    justifyContent: 'space-between'
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 40
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.goldPrimary,
    marginBottom: 16
  },
  companyName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white
  },
  instruction: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 18
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.goldDark,
    backgroundColor: 'transparent'
  },
  dotFilled: {
    backgroundColor: colors.goldPrimary,
    borderColor: colors.goldPrimary
  },
  dotError: {
    borderColor: colors.errorText,
    backgroundColor: colors.errorText
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    marginTop: 14,
    fontWeight: '600'
  },
  keypad: {
    paddingHorizontal: 30,
    paddingBottom: 30
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.navyPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.navyMedium
  },
  keyText: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white
  },
  switchLoginBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingVertical: 8
  },
  switchLoginText: {
    fontSize: 13,
    color: colors.goldPrimary,
    fontWeight: '600'
  }
});
