import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../lib/api';

const INSTITUTIONAL_EMAIL = /@(?:g\.)?msuiit\.edu\.ph$/i;

export default function ResetPinScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // cooldown
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef(null);

  // modals & fields
  const [otpModal, setOtpModal] = useState(false);
  const [pinModal, setPinModal] = useState(false);
  const [code, setCode] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  // keep valid, server-checked code
  const [verifiedCode, setVerifiedCode] = useState('');

  // animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true })
    ]).start();
  }, []);

  useEffect(() => () => timerRef.current && clearInterval(timerRef.current), []);

  const startCooldown = (secs = 45) => {
    setCooldown(secs);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(timerRef.current); timerRef.current = null; return 0; }
        return s - 1;
      });
    }, 1000);
  };

  /** Step 1: Send reset code, then open OTP modal */
  const handleSendCode = async () => {
    setError(''); setMessage('');
    const e = (email || '').trim().toLowerCase();
    if (!e) return setError('Please enter your institutional email.');
    if (!INSTITUTIONAL_EMAIL.test(e)) return setError('Use @msuiit.edu.ph or @g.msuiit.edu.ph');

    setLoading(true);
    try {
      await api.post('/auth/send-pin-reset-code', { email: e });
      setMessage('A 6-digit code was sent to your email.');
      setCode('');
      setOtpModal(true);
      startCooldown(45);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error sending code.');
    } finally {
      setLoading(false);
    }
  };

  /** Step 2: Verify OTP with server; if OK → open PIN modal */
  const handleVerifyOtp = async () => {
    setError(''); setMessage('');
    const e = (email || '').trim().toLowerCase();
    const c = (code  || '').trim();
    if (!/^\d{6}$/.test(c)) return setError('Enter the 6-digit code.');

    setLoading(true);
    try {
      await api.post('/auth/validate-reset-code', { email: e, code: c });
      setVerifiedCode(c);
      setOtpModal(false);
      setPinModal(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  /** Step 3: Submit new PIN with previously verified code */
  const handleResetPin = async () => {
    setError(''); setMessage('');
    if (!/^\d{6}$/.test(newPin)) return setError('New PIN must be 6 digits.');
    if (newPin !== confirmPin) return setError('PINs do not match.');

    setLoading(true);
    try {
      await api.post('/auth/reset-pin', {
        email: (email || '').trim().toLowerCase(),
        code: verifiedCode,
        newPin,
      });
      setPinModal(false);
      setMessage('PIN successfully reset! Redirecting…');
      setTimeout(() => router.replace('/login'), 1400);
    } catch (err) {
      setError(err?.response?.data?.error || 'Error resetting PIN.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(''); setMessage('');
    setLoading(true);
    try {
      await api.post('/auth/send-pin-reset-code', { email: (email || '').trim().toLowerCase() });
      setMessage('Code resent.');
      startCooldown(45);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Animated.View 
        style={[
          styles.container, 
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.brand}>Research Repository</Text>
          <Text style={styles.title}>🔑 Reset PIN</Text>
          <Text style={styles.subtitle}>Recover access to your account</Text>
        </View>

        {/* Email card */}
        <View style={styles.card}>
          <Text style={styles.label}>Enter your institutional email</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputIcon}>📧</Text>
            <TextInput
              style={styles.input}
              placeholder="yourname@g.msuiit.edu.ph"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); setMessage(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              placeholderTextColor="#64748b"
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!email || loading) && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={!email || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>📨 Send Code</Text>
            )}
          </TouchableOpacity>

          {cooldown > 0 && (
            <View style={styles.cooldownBadge}>
              <Text style={styles.cooldownText}>⏱️ Resend in {cooldown}s</Text>
            </View>
          )}
          {cooldown === 0 && !!email && (
            <TouchableOpacity onPress={handleResend} style={styles.resendButton}>
              <Text style={styles.resend}>↻ Resend code</Text>
            </TouchableOpacity>
          )}

          {!!message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageIcon}>✅</Text>
              <Text style={styles.message}>{message}</Text>
            </View>
          )}
          {!!error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <TouchableOpacity onPress={() => router.replace('/login')} style={styles.backButton}>
          <Text style={styles.backLink}>← Back to Sign In</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* OTP Modal FIRST */}
      <Modal transparent visible={otpModal} animationType="fade" onRequestClose={() => setOtpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔐 Enter Verification Code</Text>
            <Text style={styles.labelSmall}>We sent a 6-digit code to:</Text>
            <View style={styles.emailBadge}>
              <Text style={styles.emailBadgeText}>{email}</Text>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔢</Text>
              <TextInput
                style={styles.input}
                placeholder="6-digit code"
                value={code}
                onChangeText={(t) => setCode((t || '').replace(/\D/g, '').slice(0, 6))}
                keyboardType="numeric"
                maxLength={6}
                autoFocus
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.codeIndicator}>
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <View key={i} style={styles.codeDotWrap}>
                    <View style={[styles.codeDot, code[i] && styles.codeDotFilled]} />
                  </View>
                ))}
            </View>

            <TouchableOpacity
              style={[styles.button, (code.length !== 6 || loading) && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={code.length !== 6 || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>✓ Verify</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setOtpModal(false)} style={styles.cancelButton}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>

            {!!error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.error}>{error}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* New PIN Modal ONLY AFTER OTP OK */}
      <Modal transparent visible={pinModal} animationType="fade" onRequestClose={() => setPinModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔒 Set a New PIN</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔑</Text>
              <TextInput
                style={styles.input}
                placeholder="New 6-digit PIN"
                value={newPin}
                onChangeText={(t) => setNewPin((t || '').replace(/\D/g, '').slice(0, 6))}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                autoFocus
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.pinIndicator}>
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <View key={i} style={styles.pinDotWrap}>
                    <View style={[styles.pinDot, newPin[i] && styles.pinDotFilled]} />
                  </View>
                ))}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔐</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm PIN"
                value={confirmPin}
                onChangeText={(t) => setConfirmPin((t || '').replace(/\D/g, '').slice(0, 6))}
                keyboardType="numeric"
                secureTextEntry
                maxLength={6}
                placeholderTextColor="#64748b"
              />
            </View>

            <View style={styles.pinIndicator}>
              {Array(6)
                .fill(0)
                .map((_, i) => (
                  <View key={i} style={styles.pinDotWrap}>
                    <View style={[styles.pinDot, confirmPin[i] && styles.pinDotFilled]} />
                  </View>
                ))}
            </View>

            <TouchableOpacity
              style={[
                styles.button,
                (loading || newPin.length !== 6 || confirmPin.length !== 6) && styles.buttonDisabled
              ]}
              onPress={handleResetPin}
              disabled={loading || newPin.length !== 6 || confirmPin.length !== 6}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>🚀 Reset PIN</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setPinModal(false)} style={styles.cancelButton}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>

            {!!error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.error}>{error}</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: { 
    flex: 1, 
    backgroundColor: '#0a0f1e' 
  },
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  brand: { 
    fontSize: 24, 
    color: '#94a3b8', 
    fontWeight: '700', 
    letterSpacing: 0.5, 
    marginBottom: 8 
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#ffffff', 
    marginBottom: 8, 
    textAlign: 'center',
    letterSpacing: -0.5 
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  card: {
    width: 400, 
    maxWidth: '100%', 
    backgroundColor: '#1a1f35', 
    borderRadius: 32, 
    padding: 36,
    shadowColor: '#6366f1', 
    shadowOpacity: 0.2, 
    shadowRadius: 30, 
    shadowOffset: { width: 0, height: 15 },
    elevation: 12, 
    marginBottom: 20, 
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2d3548',
  },
  label: { 
    fontSize: 16, 
    color: '#94a3b8', 
    marginBottom: 16, 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  labelSmall: { 
    fontSize: 14, 
    color: '#64748b', 
    marginBottom: 8, 
    textAlign: 'center', 
    fontWeight: '600' 
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f1419',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2d3548',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  inputIcon: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#f1f5f9',
    fontWeight: '500',
  },
  button: {
    width: '100%', 
    backgroundColor: '#6366f1', 
    borderRadius: 16, 
    paddingVertical: 18, 
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12, 
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
    fontWeight: '700', 
    fontSize: 17,
    letterSpacing: 0.5,
  },
  cooldownBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 8,
  },
  cooldownText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 14,
  },
  resendButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  resend: { 
    color: '#818cf8', 
    fontWeight: '600', 
    fontSize: 15 
  },
  divider: {
    width: 60,
    height: 1,
    backgroundColor: '#2d3548',
    marginVertical: 12,
  },
  backButton: {
    paddingVertical: 8,
  },
  backLink: { 
    color: '#818cf8', 
    fontWeight: '600', 
    fontSize: 16 
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064e3b',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#10b981',
    width: '100%',
  },
  messageIcon: {
    fontSize: 18,
  },
  message: { 
    color: '#a7f3d0', 
    fontWeight: '600', 
    fontSize: 14,
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7f1d1d',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
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
    fontWeight: '600', 
    fontSize: 14,
    flex: 1,
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1f35', 
    borderRadius: 32, 
    padding: 36, 
    width: 420, 
    maxWidth: '100%', 
    alignItems: 'center',
    elevation: 20, 
    shadowColor: '#6366f1', 
    shadowOpacity: 0.3, 
    shadowRadius: 30, 
    shadowOffset: { width: 0, height: 15 },
    borderWidth: 1,
    borderColor: '#2d3548',
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    marginBottom: 16,
    color: '#f1f5f9',
    letterSpacing: -0.5,
  },
  emailBadge: { 
    backgroundColor: '#2d3548',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#3d4558',
  },
  emailBadgeText: {
    color: '#a5b4fc', 
    fontWeight: '600',
    fontSize: 15,
  },
  codeIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  codeDotWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2d3548',
  },
  codeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3d4558',
  },
  codeDotFilled: {
    backgroundColor: '#818cf8',
    shadowColor: '#818cf8',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  pinIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  pinDotWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2d3548',
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3d4558',
  },
  pinDotFilled: {
    backgroundColor: '#818cf8',
    shadowColor: '#818cf8',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  cancel: {
    color: '#64748b',
    fontWeight: '600',
    fontSize: 15,
  },
});