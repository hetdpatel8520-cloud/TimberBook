import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GLOBAL_ERROR_BOUNDARY]', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="sparkles" size={32} color={colors.goldPrimary} />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              Don't worry, your timber accounts and business records are completely safe.
            </Text>
            <TouchableOpacity style={styles.reloadBtn} onPress={this.handleReload} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color={colors.navyDark} style={{ marginRight: 6 }} />
              <Text style={styles.reloadBtnText}>Tap to Reload App</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.navyDark,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFBEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navyDark,
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: colors.slateGrey,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20
  },
  reloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.goldPrimary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    width: '100%'
  },
  reloadBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.navyDark
  }
});
