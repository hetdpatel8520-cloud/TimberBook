import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { getBaseUrl, healthApi, CURRENT_APP_VERSION } from '../api/client';

export default function DeveloperInfoModal({ visible, onClose }) {
  const [loading, setLoading] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      loadHealth();
    }
  }, [visible]);

  const loadHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await healthApi.check();
      setHealthData(data);
    } catch (e) {
      setError(e.message || 'Failed to reach /health');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="code-slash" size={20} color={colors.goldPrimary} style={{ marginRight: 8 }} />
              <Text style={styles.title}>Developer & Environment Info</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body}>
            <View style={styles.row}>
              <Text style={styles.label}>App Version:</Text>
              <Text style={styles.value}>v{CURRENT_APP_VERSION} (Build 5)</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Active API Base URL:</Text>
              <Text style={styles.codeValue}>{getBaseUrl()}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.healthHeader}>
              <Text style={styles.subTitle}>Backend /health Status</Text>
              <TouchableOpacity onPress={loadHealth} disabled={loading} style={styles.refreshBtn}>
                <Ionicons name="refresh" size={16} color={colors.goldPrimary} />
                <Text style={styles.refreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.goldPrimary} />
                <Text style={styles.loadingText}>Pinging /health...</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#FF6B6B" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {healthData && (
              <View style={styles.healthDetails}>
                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>Server Status:</Text>
                  <View style={[styles.badge, { backgroundColor: healthData.status === 'ok' ? '#2ECC71' : '#E74C3C' }]}>
                    <Text style={styles.badgeText}>{healthData.status?.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>Database Status:</Text>
                  <View style={[styles.badge, { backgroundColor: healthData.db === 'connected' ? '#2ECC71' : '#E74C3C' }]}>
                    <Text style={styles.badgeText}>{healthData.db?.toUpperCase() || 'DISCONNECTED'}</Text>
                  </View>
                </View>

                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>Database Name:</Text>
                  <Text style={styles.healthVal}>{healthData.dbName || 'timberbooks'}</Text>
                </View>

                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>Backend Version:</Text>
                  <Text style={styles.healthVal}>v{healthData.version || '1.0.3'}</Text>
                </View>

                <View style={styles.healthRow}>
                  <Text style={styles.healthLabel}>Timestamp:</Text>
                  <Text style={styles.healthValSmall}>{healthData.timestamp}</Text>
                </View>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.navyDark,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.4)',
    overflow: 'hidden',
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.goldLight
  },
  closeBtn: {
    padding: 4
  },
  body: {
    padding: 16
  },
  row: {
    marginBottom: 12
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2
  },
  value: {
    fontSize: 14,
    color: colors.textLight,
    fontWeight: '600'
  },
  codeValue: {
    fontSize: 13,
    color: colors.goldLight,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 6,
    borderRadius: 6,
    marginTop: 2
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 14
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textLight
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(212, 160, 23, 0.15)',
    borderRadius: 6
  },
  refreshText: {
    fontSize: 12,
    color: colors.goldPrimary,
    fontWeight: '600',
    marginLeft: 4
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    marginLeft: 8
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    padding: 10,
    borderRadius: 6,
    marginTop: 6
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    flex: 1
  },
  healthDetails: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 12,
    borderRadius: 8,
    marginTop: 6
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  healthLabel: {
    fontSize: 12,
    color: colors.textMuted
  },
  healthVal: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '600'
  },
  healthValSmall: {
    fontSize: 11,
    color: colors.textMuted
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  badgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700'
  },
  doneBtn: {
    backgroundColor: colors.goldPrimary,
    paddingVertical: 12,
    alignItems: 'center',
    margin: 16,
    borderRadius: 8
  },
  doneBtnText: {
    color: colors.navyDark,
    fontSize: 14,
    fontWeight: '700'
  }
});
