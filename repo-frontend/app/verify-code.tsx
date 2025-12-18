import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Animated, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { saveToken } from '../lib/auth';
import api from '../lib/api';

const { width: windowWidth } = Dimensions.get('window');

export default function VerifyCode() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  const rawEmail = typeof params.email === 'string' ? params.email : '';
  const [email, setEmail] = useState(rawEmail.trim().toLowerCase());

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation for icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const sanitized = (code || '').replace(/\D/g, '').slice(0, 6);

      if (!email) {
        setError('Missing email. Go back and login again.');
        setLoading(false);
        return;
      }
      if (sanitized.length !== 6) {
        setError('Enter the 6-digit code');
        setLoading(false);
        return;
      }

      const { data } = await api.post('/auth/verify-code', {
        email,
        code: sanitized,
      });

      await saveToken({
        token: data.user.token,
        firstName: data.user.firstName,
        lastName: data.user.lastName,
        id: data.user.id,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    
    setError('');
    setResending(true);
    try {
      if (!email) { 
        setError('Missing email. Go back and login again.'); 
        return; 
      }
      await api.post('/auth/resend-code', { email });
      setCooldown(60);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <View style={styles.iconGlow} />
            <Animated.View 
              style={[
                styles.iconCircle,
                { transform: [{ scale: pulseAnim }] }
              ]}
            >
              <Text style={styles.iconText}>📧</Text>
            </Animated.View>
            <View style={styles.pulseRing1} />
            <View style={styles.pulseRing2} />
          </View>
          <Text style={styles.headerTitle}>Email Verification</Text>
          <Text style={styles.headerSubtitle}>Secure your account access</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>🔐 Enter Verification Code</Text>
          <Text style={styles.subtitle}>
            We sent a 6-digit code to:
          </Text>
          <View style={styles.emailBadge}>
            <View style={styles.emailIconBadge}>
              <Text style={styles.emailIconText}>✓</Text>
            </View>
            <Text style={styles.email}>{email}</Text>
          </View>

          <Animated.View 
            style={[
              styles.codeInputContainer,
              { transform: [{ translateX: shakeAnim }] }
            ]}
          >
            <View style={styles.dotsContainer}>
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.codeDot,
                      code[i] && styles.codeDotFilled,
                      error && styles.codeDotError,
                    ]}
                  >
                    {code[i] ? (
                      <Text style={styles.codeDotText}>{code[i]}</Text>
                    ) : (
                      <View style={styles.codeDotEmpty} />
                    )}
                  </View>
                ))}
            </View>
            <TextInput
              value={code}
              onChangeText={(text) => {
                const onlyDigits = (text || '').replace(/\D/g, '').slice(0, 6);
                setCode(onlyDigits);
                setError('');
              }}
              keyboardType="numeric"
              maxLength={6}
              autoFocus
              style={styles.invisibleInput}
              caretHidden={false}
              selectionColor="transparent"
              contextMenuHidden
            />
          </Animated.View>

          <TouchableOpacity
            style={[
              styles.button,
              (loading || code.length < 6) && styles.buttonDisabled
            ]}
            onPress={handleVerify}
            disabled={loading || code.length < 6}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>
              {loading ? '⏳ Verifying...' : '✓ Verify Code'}
            </Text>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.error}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.infoContainer}>
            <Text style={styles.infoIcon}>💡</Text>
            <Text style={styles.info}>
              Didn't receive the code? Check your spam folder or wait a few moments before resending.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.actionsContainer}>
            {cooldown > 0 ? (
              <View style={styles.cooldownBadge}>
                <Text style={styles.cooldownText}>⏱️ Resend in {cooldown}s</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                style={[styles.actionButton, { opacity: resending ? 0.6 : 1 }]}
                disabled={resending}
              >
                <Text style={styles.actionButtonText}>
                  {resending ? '⏳ Resending…' : '↻ Resend verification code'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backButtonText}>← Back to Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footerInfo}>🔒 Your code expires in 10 minutes</Text>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0f1e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
  },
  iconGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#6366f1',
    opacity: 0.2,
    ...(Platform.OS === 'web' && { filter: 'blur(30px)' }),
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1a1f35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#3d4558',
    shadowColor: '#6366f1',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 2,
  },
  pulseRing1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#6366f1',
    opacity: 0.3,
  },
  pulseRing2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#818cf8',
    opacity: 0.2,
  },
  iconText: {
    fontSize: 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#1a1f35',
    width: '100%',
    borderRadius: 32,
    padding: 36,
    shadowColor: '#6366f1',
    shadowOpacity: 0.2,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 15 },
    elevation: 12,
    borderWidth: 1,
    borderColor: '#2d3548',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#94a3b8',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  emailBadge: {
    backgroundColor: '#2d3548',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#3d4558',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#6366f1',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  emailIconBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailIconText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  email: {
    color: '#a5b4fc',
    fontSize: 15,
    fontWeight: '600',
  },
  codeInputContainer: {
    width: '100%',
    marginBottom: 28,
    position: 'relative',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  codeDot: {
    width: 52,
    height: 60,
    backgroundColor: '#0f1419',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2d3548',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  codeDotFilled: {
    borderColor: '#6366f1',
    backgroundColor: '#1e293b',
    shadowColor: '#6366f1',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  codeDotError: {
    borderColor: '#ef4444',
    backgroundColor: '#7f1d1d',
    shadowColor: '#ef4444',
    shadowOpacity: 0.3,
  },
  codeDotEmpty: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#475569',
  },
  codeDotText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  invisibleInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
  },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 18,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#6366f1',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    borderWidth: 1,
    borderColor: '#7c7ff1',
  },
  buttonDisabled: {
    backgroundColor: '#475569',
    borderColor: '#64748b',
    shadowOpacity: 0.2,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7f1d1d',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#dc2626',
    shadowColor: '#dc2626',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    width: '100%',
  },
  errorIcon: {
    fontSize: 18,
  },
  error: {
    color: '#fecaca',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#2d3548',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#3d4558',
    marginBottom: 16,
    width: '100%',
  },
  infoIcon: {
    fontSize: 18,
    marginTop: 1,
  },
  info: {
    flex: 1,
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 19,
    fontWeight: '500',
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: '#2d3548',
    marginVertical: 8,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: 10,
  },
  actionButtonText: {
    color: '#818cf8',
    fontSize: 15,
    fontWeight: '600',
  },
  backButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  cooldownBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#475569',
  },
  cooldownText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  footerInfo: {
    marginTop: 24,
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
});