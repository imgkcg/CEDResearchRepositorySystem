import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { saveToken } from '../lib/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: windowWidth } = Dimensions.get('window');

/* ----------------------------- Domain constants ----------------------------- */
const ALLOWED_DOMAIN = 'g.msuiit.edu.ph';
const DOMAIN_SUFFIX = `@${ALLOWED_DOMAIN}`;

/* Normalize any user input to a full email on the allowed domain. */
const normalizeEmailInput = (raw: string): { email: string; error?: string } => {
  const t = (raw || '').trim();
  if (!t) return { email: '' };

  if (t.includes('@')) {
    const [local, dom] = t.split('@');
    if (!local) return { email: '' };
    if ((dom || '').toLowerCase() !== ALLOWED_DOMAIN) {
      return { email: '', error: `Only ${DOMAIN_SUFFIX} accounts are allowed.` };
    }
    return { email: `${local}@${ALLOWED_DOMAIN}` };
  }
  return { email: `${t}${DOMAIN_SUFFIX}` };
};

/* ----------------------------- PIN INPUT COMPONENT ----------------------------- */
function PinInput({ value, onChange, error, autoFocus = false }) {
  const inputsRef = useRef([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

  const handleChange = (text, index) => {
    if (!/^\d?$/.test(text)) return;
    
    const newValue = value.split('');
    newValue[index] = text;
    onChange(newValue.join(''));

    // Auto-focus next input
    if (text && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleBackspace = () => {
    if (value.length > 0) {
      const newValue = value.slice(0, -1);
      onChange(newValue);
      const focusIndex = Math.min(value.length - 1, 5);
      inputsRef.current[focusIndex]?.focus();
    }
  };

  return (
    <Animated.View style={[styles.pinContainer, { transform: [{ translateX: shakeAnim }] }]}>
      <View style={styles.pinInputsRow}>
        {Array(6)
          .fill(0)
          .map((_, index) => (
            <Pressable
              key={index}
              style={[
                styles.pinInputWrapper,
                value[index] && styles.pinInputFilled,
                error && styles.pinInputError,
              ]}
              onPress={() => inputsRef.current[index]?.focus()}
            >
              <TextInput
                ref={ref => inputsRef.current[index] = ref}
                style={styles.pinInput}
                value={value[index] || ''}
                onChangeText={text => handleChange(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="numeric"
                maxLength={1}
                secureTextEntry
                autoFocus={autoFocus && index === 0}
                caretHidden
                contextMenuHidden
              />
              {value[index] ? (
                <View style={styles.pinDot} />
              ) : null}
            </Pressable>
          ))}
      </View>
      
      {value.length > 0 && (
        <TouchableOpacity 
          style={styles.clearButton}
          onPress={handleBackspace}
          activeOpacity={0.7}
        >
          <Ionicons name="backspace-outline" size={20} color="#64748b" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

/* ----------------------------- NATIVE LOGIN ----------------------------- */
function AppLogin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [hasSavedEmail, setHasSavedEmail] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const emailInputRef = useRef<TextInput | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 800, 
        useNativeDriver: true 
      }),
      Animated.timing(slideAnim, { 
        toValue: 0, 
        duration: 800, 
        useNativeDriver: true 
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('repo-email').then((saved) => {
      if (saved) {
        setIdentifier(saved);
        setHasSavedEmail(true);
      } else {
        setIdentifier('');
        setHasSavedEmail(false);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (pin.length !== 6) {
      setError('Please enter a 6-digit PIN');
      return;
    }

    const alreadyFull = identifier.includes('@') && identifier.toLowerCase().endsWith(DOMAIN_SUFFIX);
    const { email, error: normErr } = alreadyFull ? { email: identifier } : normalizeEmailInput(identifier);

    if (normErr) {
      setError(normErr);
      return;
    }
    if (!email) {
      setError('Enter a valid username or institutional email.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', { email, pin });
      const data = response.data;

      if (data.needsVerification) {
        setIsLoading(false);
        router.push(`/verify-code?email=${encodeURIComponent(email)}`);
        return;
      }

      await saveToken(data.user);
      await AsyncStorage.setItem('repo-email', email);
      setIsLoading(false);
      
      // Navigate based on role - ONLY on successful login
      if (data.user?.role === 'admin') {
        router.replace('/admin');
      } else if (data.user?.role === 'faculty') {
        router.replace('/faculty');
      } else if (data.user?.role === 'staff') {
        router.replace('/staff');
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      // On error, stay on the login screen
      setIsLoading(false);
      const errorMessage = err?.response?.data?.error || 'PIN incorrect. Please try again.';
      setError(errorMessage);
      setPin('');
      // Do NOT navigate - user stays on login screen
    }
  };

  const handleSwitchAccount = async () => {
    await AsyncStorage.removeItem('repo-email');
    setHasSavedEmail(false);
    setIdentifier('');
    setPin('');
    setError('');
    setTimeout(() => emailInputRef.current?.focus(), 200);
  };

  const onChangeIdentifier = (t: string) => {
    if (t.includes('@') && !t.toLowerCase().endsWith(DOMAIN_SUFFIX)) {
      setError(`Use your institutional address (${DOMAIN_SUFFIX}) or just type your username.`);
    } else {
      setError('');
    }
    setIdentifier(t.replace(/\s+/g, ''));
  };

  const showSuffixHint = !hasSavedEmail && !identifier.includes('@') && identifier.length > 0;
  const showPinSection = hasSavedEmail || identifier.trim().length > 0;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Background Pattern */}
      <View style={styles.backgroundPattern} />
      
      {/* Subtle gradient overlay */}
      <LinearGradient
        colors={['rgba(248, 250, 252, 0.7)', 'rgba(248, 250, 252, 0.9)']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Animated.View style={[styles.logoGlow, { opacity: fadeAnim }]} />
            <View style={styles.logoFrame}>
              <Image 
                source={require('../assets/images/logo.jpg')} 
                style={styles.logo} 
                resizeMode="cover"
              />
            </View>
          </View>
          
          <View style={styles.titleSection}>
            <Text style={styles.welcome}>Welcome to</Text>
            <Text style={styles.brand}>Research Repository</Text>
            <Text style={styles.tagline}>Secure academic access for researchers and faculty</Text>
          </View>
        </View>

        {/* Login Card */}
        <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
          {/* Card Header with gradient */}
          <LinearGradient
            colors={['#2563eb', '#3b82f6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardHeader}
          >
            <Text style={styles.accountLabel}>
              {hasSavedEmail ? 'Welcome Back' : 'Sign In to Continue'}
            </Text>
          </LinearGradient>

          <View style={styles.cardBody}>
            {hasSavedEmail ? (
              <>
                <View style={styles.emailBadge}>
                  <View style={styles.emailBadgeIcon}>
                    <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                  </View>
                  <View style={styles.emailInfo}>
                    <Text style={styles.emailLabel}>Signed in as</Text>
                    <Text style={styles.accountEmail}>{identifier}</Text>
                  </View>
                </View>
                
                <View style={styles.pinSection}>
                  <Text style={styles.pinLabel}>Enter your 6-digit PIN</Text>
                  <PinInput 
                    value={pin} 
                    onChange={setPin} 
                    error={!!error}
                    autoFocus
                  />
                  <Text style={styles.pinHint}>
                    Enter 6-digit PIN to continue
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={handleLogin} 
                  style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                  activeOpacity={0.7}
                  disabled={isLoading || pin.length !== 6}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Ionicons name="refresh" size={20} color="#ffffff" style={styles.loadingIcon} />
                      <Text style={styles.loginButtonText}>Signing in...</Text>
                    </View>
                  ) : (
                    <View style={styles.loginButtonContent}>
                      <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                      <Text style={styles.loginButtonText}>Sign In</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={handleSwitchAccount} 
                  style={styles.switchButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="swap-horizontal" size={16} color="#2563eb" />
                  <Text style={styles.switchAcc}>Switch Account</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputSection}>
                  <View style={styles.inputLabelRow}>
                    <Ionicons name="mail-outline" size={18} color="#64748b" />
                    <Text style={styles.inputLabel}>Institutional Email</Text>
                  </View>
                  
                  <View style={[
                    styles.inputContainer,
                    isFocused && styles.inputContainerFocused
                  ]}>
                    <TextInput
                      ref={emailInputRef}
                      style={styles.emailInput}
                      placeholder="username"
                      value={identifier}
                      onChangeText={onChangeIdentifier}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholderTextColor="#94a3b8"
                      autoFocus
                    />
                    {showSuffixHint && (
                      <View style={styles.suffixContainer}>
                        <Text style={styles.suffixText}>{DOMAIN_SUFFIX}</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.helperText}>
                    Enter your username, we'll add {DOMAIN_SUFFIX} automatically
                  </Text>
                </View>

                {showPinSection && (
                  <View style={styles.pinSection}>
                    <Text style={styles.pinLabel}>Enter your 6-digit PIN</Text>
                    <PinInput 
                      value={pin} 
                      onChange={setPin} 
                      error={!!error}
                      autoFocus={false}
                    />
                    <Text style={styles.pinHint}>
                      Enter 6-digit PIN to continue
                    </Text>
                    
                    <TouchableOpacity 
                      onPress={handleLogin} 
                      style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                      activeOpacity={0.7}
                      disabled={isLoading || pin.length !== 6}
                    >
                      {isLoading ? (
                        <View style={styles.loadingContainer}>
                          <Ionicons name="refresh" size={20} color="#ffffff" style={styles.loadingIcon} />
                          <Text style={styles.loginButtonText}>Signing in...</Text>
                        </View>
                      ) : (
                        <View style={styles.loginButtonContent}>
                          <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                          <Text style={styles.loginButtonText}>Sign In</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            {/* Footer Links */}
            <View style={styles.footer}>
              <TouchableOpacity 
                onPress={() => router.push('/reset-pin')} 
                style={styles.footerLink}
                activeOpacity={0.7}
              >
                <Ionicons name="key-outline" size={16} color="#64748b" />
                <Text style={styles.footerLinkText}>Forgot PIN?</Text>
              </TouchableOpacity>
              
              <View style={styles.divider} />
              
              <TouchableOpacity 
                onPress={() => router.push('/register')} 
                style={styles.footerLink}
                activeOpacity={0.7}
              >
                <Ionicons name="person-add-outline" size={16} color="#64748b" />
                <Text style={styles.footerLinkText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Security Note */}
        <View style={styles.securityNote}>
          <Ionicons name="shield-checkmark" size={14} color="#10b981" />
          <Text style={styles.securityText}>End-to-end encrypted • ISO 27001 certified</Text>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

/* ----------------------------- WEB LOGIN ----------------------------- */
function WebLogin() {
  return <AppLogin />;
}

export default Platform.OS === 'web' ? WebLogin : AppLogin;

/* ----------------------------- STYLES ----------------------------- */
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc',
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20,
  },
  backgroundPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.03,
    backgroundColor: '#2563eb',
    ...(Platform.OS === 'web' && {
      backgroundImage: `
        radial-gradient(circle at 25% 25%, rgba(37, 99, 235, 0.1) 0%, transparent 50%),
        radial-gradient(circle at 75% 75%, rgba(37, 99, 235, 0.05) 0%, transparent 50%)
      `,
    }),
  },
  content: { 
    width: '100%', 
    maxWidth: 480, 
    alignItems: 'center',
  },
  
  // Logo Section
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#2563eb',
    opacity: 0.1,
    ...Platform.select({
      web: {
        filter: 'blur(40px)',
      },
    }),
  },
  logoFrame: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  titleSection: {
    alignItems: 'center',
  },
  welcome: {
    fontSize: 15,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  brand: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Card Styles
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
    marginBottom: 24,
  },
  cardHeader: {
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  accountLabel: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardBody: {
    padding: 32,
  },
  
  // Email Badge
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  emailBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  emailInfo: {
    flex: 1,
  },
  emailLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
    fontWeight: '500',
  },
  accountEmail: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '600',
  },
  
  // Input Section
  inputSection: {
    marginBottom: 28,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: 56,
  },
  inputContainerFocused: {
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emailInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    paddingVertical: 16,
  },
  suffixContainer: {
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  suffixText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
    marginLeft: 4,
    lineHeight: 18,
  },
  
  // PIN Section
  pinSection: {
    marginBottom: 24,
  },
  pinLabel: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 16,
  },
  pinHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
  },
  
  // Login Button
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0,
  },
  loginButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingIcon: {
    transform: [{ rotate: '45deg' }],
  },
  
  // PIN Input Component
  pinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  pinInputsRow: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  pinInputWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pinInputFilled: {
    borderColor: '#2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    shadowColor: '#2563eb',
    shadowOpacity: 0.1,
  },
  pinInputError: {
    borderColor: '#dc2626',
    backgroundColor: 'rgba(220, 38, 38, 0.05)',
  },
  pinInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: 'transparent',
    backgroundColor: 'transparent',
  },
  pinDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginLeft: 12,
  },
  
  // Switch Button
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  switchAcc: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Error Container
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#fee2e2',
    gap: 12,
  },
  error: {
    flex: 1,
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  
  // Footer Links
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    gap: 20,
  },
  footerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  footerLinkText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: '#e2e8f0',
  },
  
  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  securityText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
});