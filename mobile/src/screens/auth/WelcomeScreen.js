import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { useTranslation, AVAILABLE_LANGUAGES } from '../../i18n/LanguageContext';
import ServerConfigModal from '../../components/ServerConfigModal';

export default function WelcomeScreen({ navigation }) {
  const { t, language, setLanguage } = useTranslation();
  const [showServerModal, setShowServerModal] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.navyDark} />

      {/* Top Utility Bar with Server Settings & Language Selector */}
      <View style={styles.topUtilityBar}>
        <TouchableOpacity
          style={styles.serverPill}
          onPress={() => setShowServerModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="wifi-outline" size={13} color={colors.goldPrimary} style={{ marginRight: 4 }} />
          <Text style={styles.serverPillText}>Server</Text>
        </TouchableOpacity>

        <View style={styles.languagePillContainer}>
          {AVAILABLE_LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.langChip,
                language === lang.code && styles.langChipActive
              ]}
              onPress={() => setLanguage(lang.code)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.langChipText,
                  language === lang.code && styles.langChipTextActive
                ]}
              >
                {lang.native}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Brand Banner */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="cube-outline" size={40} color={colors.goldPrimary} />
          </View>
          <Text style={styles.brandTitle}>TimberBooks</Text>
          <Text style={styles.brandTagline}>Cloud GST Billing & Accounting for Timber Trade</Text>
          <View style={styles.badgePill}>
            <Ionicons name="cloud-done-outline" size={12} color={colors.goldPrimary} style={{ marginRight: 5 }} />
            <Text style={styles.badgeText}>Access Anywhere • Multi-Device • Multi-Tenant</Text>
          </View>
        </View>

        {/* Feature Cards Grid */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="calculator-outline" size={20} color={colors.goldPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Timber & Saw Mill Math</Text>
              <Text style={styles.featureDesc}>Automatic CFT ↔ CBM conversion, Quarter-Girth (Hoppus) log formula & Size plank calculations.</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="document-text-outline" size={20} color={colors.goldPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Compliant GST Invoicing</Text>
              <Text style={styles.featureDesc}>Tax invoices with automatic CGST, SGST & IGST split, round-off, e-Way bill notes and WhatsApp sharing.</Text>
            </View>
          </View>

          <View style={styles.featureCard}>
            <View style={styles.featureIconWrap}>
              <Ionicons name="wallet-outline" size={20} color={colors.goldPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>Full Double-Entry Accounting</Text>
              <Text style={styles.featureDesc}>Ledger statements, Cash Book, Outstanding receivables/payables, and live stock tracking.</Text>
            </View>
          </View>
        </View>

        {/* Primary Call to Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.88}
          >
            <Ionicons name="business-outline" size={19} color={colors.navyDark} style={{ marginRight: 8 }} />
            <Text style={styles.registerButtonText}>Register Your Company</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={19} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.loginButtonText}>Login to Existing Account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footerContainer}>
          <Ionicons name="shield-checkmark-outline" size={13} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.footerText}>Secure Cloud Architecture • Isolated Tenant Data</Text>
        </View>
      </ScrollView>

      {/* Server Config Modal */}
      <ServerConfigModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navyDark
  },
  topUtilityBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 8 : 12,
    paddingBottom: 8
  },
  serverPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.3)'
  },
  serverPillText: {
    fontSize: 11,
    color: colors.goldLight,
    fontWeight: '700'
  },
  languagePillContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 18,
    padding: 2
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14
  },
  langChipActive: {
    backgroundColor: colors.goldPrimary
  },
  langChipText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '600'
  },
  langChipTextActive: {
    color: colors.navyDark,
    fontWeight: '700'
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'android' ? 36 : 24
  },
  brandContainer: {
    alignItems: 'center',
    marginVertical: 12
  },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(212, 160, 23, 0.15)',
    borderWidth: 1.5,
    borderColor: colors.goldPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  brandTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5
  },
  brandTagline: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 3,
    paddingHorizontal: 16
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 160, 23, 0.3)'
  },
  badgeText: {
    fontSize: 10,
    color: colors.goldLight,
    fontWeight: '600'
  },
  featuresContainer: {
    marginVertical: 10
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 160, 23, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 2
  },
  featureDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 15
  },
  actionContainer: {
    marginTop: 6,
    marginBottom: 8
  },
  registerButton: {
    backgroundColor: colors.goldPrimary,
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: colors.goldPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4
  },
  registerButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.navyDark
  },
  loginButton: {
    backgroundColor: 'transparent',
    minHeight: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)'
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white
  },
  footerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6
  },
  footerText: {
    fontSize: 10,
    color: colors.textMuted
  }
});
