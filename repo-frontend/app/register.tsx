import { useState, useRef, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Image, KeyboardAvoidingView, Platform, Dimensions, Animated,
  ScrollView 
} from 'react-native';
import { useRouter } from 'expo-router';
import api from '../lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');
const isDesktop = Platform.OS === 'web' && windowWidth > 768;

export default function Register() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const pinRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
const DOMAIN = '@g.msuiit.edu.ph';

const normalizeEmail = (value: string) => {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes('@') ? trimmed : `${trimmed}${DOMAIN}`;
};

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

 const handleRegister = async () => {
  if (!firstName || !lastName || !email || !pin) {
    setError('All fields are required');
    return;
  }

  const fullEmail = normalizeEmail(email);

  const domainPattern = /^[\w.-]+@g\.msuiit\.edu\.ph$/i;
  if (!domainPattern.test(fullEmail)) {
    setError('Only @g.msuiit.edu.ph institutional emails are allowed');
    return;
  }

  if (!/^\d{6}$/.test(pin)) {
    setError('PIN must be exactly 6 digits');
    pinRef.current?.focus();
    return;
  }

  setIsLoading(true);
  try {
    await api.post('/auth/register', {
      firstName,
      lastName,
      email: fullEmail, // ✅ SEND FULL EMAIL
      pin,
    });

    setError('');
    router.push('/login');
  } catch (err: any) {
    setError(err.response?.data?.error || 'Registration failed. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  const handlePinChange = (text: string) => {
    if (/^\d*$/.test(text) && text.length <= 6) {
      setPin(text);
    }
  };

  const handleKeyPress = (e: any, nextRef?: React.RefObject<TextInput>) => {
    if (e.nativeEvent.key === 'Enter' && nextRef) {
      nextRef.current?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Background */}
      <LinearGradient
        colors={['#f8fafc', '#f1f5f9']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Logo and Title Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoGlow} />
              <View style={styles.logoFrame}>
                <Image 
                  source={require('../assets/images/logo.jpg')} 
                  style={styles.logo} 
                  resizeMode="cover"
                />
              </View>
            </View>
            
            <View style={styles.titleSection}>
              <Text style={styles.welcome}>Create Account</Text>
              <Text style={styles.brand}>Research Repository</Text>
              <Text style={styles.tagline}>Join our academic research community</Text>
            </View>
          </View>

          {/* Registration Form Card */}
          <View style={styles.card}>
            {/* Form Title */}
            <View style={styles.formHeader}>
              <Ionicons name="person-add" size={isDesktop ? 28 : 24} color="#2563eb" />
              <Text style={styles.formTitle}>Register Your Account</Text>
              <Text style={styles.formSubtitle}>Fill in your details to get started</Text>
            </View>

            {/* Name Fields - Horizontal on desktop, vertical on mobile */}
            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Text style={styles.inputLabel}>First Name</Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'firstName' && styles.inputContainerFocused
                ]}>
                  <Ionicons name="person-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                      ref={firstNameRef}
                      style={styles.input}
                      placeholder="John"
                      value={firstName}
                      onChangeText={setFirstName}
                      onFocus={() => setFocusedInput('firstName')}
                      onBlur={() => setFocusedInput(null)}
                      onKeyPress={(e) => handleKeyPress(e, lastNameRef)}
                      autoCapitalize="words"
                      placeholderTextColor="#94a3b8"
                      editable={!isLoading}
                      returnKeyType="next"
                    />

                </View>
              </View>

              <View style={styles.nameField}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <View style={[
                  styles.inputContainer,
                  focusedInput === 'lastName' && styles.inputContainerFocused
                ]}>
                  <Ionicons name="people-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                  <TextInput
                    ref={lastNameRef}
                    style={styles.input}
                    placeholder="Doe"
                    value={lastName}
                    onChangeText={setLastName}
                    onFocus={() => setFocusedInput('lastName')}
                    onBlur={() => setFocusedInput(null)}
                    onKeyPress={(e) => handleKeyPress(e, emailRef)}
                    autoCapitalize="words"
                    placeholderTextColor="#94a3b8"
                    editable={!isLoading}
                    returnKeyType="next"
                  />
                </View>
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Institutional Email</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'email' && styles.inputContainerFocused
              ]}>
                <Ionicons name="mail-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  ref={emailRef}
                  style={styles.input}
                  placeholder="username"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                  onKeyPress={(e) => handleKeyPress(e, pinRef)}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="#94a3b8"
                  editable={!isLoading}
                  returnKeyType="next"
                />
                {email.length > 0 && !email.includes('@') && (
                  <View style={styles.suffixContainer}>
                    <Text style={styles.suffixText}>@g.msuiit.edu.ph</Text>
                  </View>
                )}
              </View>
              <Text style={styles.helperText}>
                Use your institutional email address
              </Text>
            </View>

            {/* PIN Field */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Create 6-digit PIN</Text>
              <View style={[
                styles.inputContainer,
                focusedInput === 'pin' && styles.inputContainerFocused
              ]}>
                <Ionicons name="lock-closed-outline" size={18} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  ref={pinRef}
                  style={styles.input}
                  placeholder="Enter 6 digits"
                  value={pin}
                  onChangeText={handlePinChange}
                  onFocus={() => setFocusedInput('pin')}
                  onBlur={() => setFocusedInput(null)}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={6}
                  placeholderTextColor="#94a3b8"
                  editable={!isLoading}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
              </View>
              
              {/* PIN Visual Indicator */}
              <View style={styles.pinIndicator}>
                {Array(6).fill(0).map((_, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.pinDotWrapper,
                      pin[index] && styles.pinDotWrapperFilled
                    ]}
                  >
                    {pin[index] ? (
                      <View style={styles.pinDot} />
                    ) : null}
                  </View>
                ))}
              </View>
              
              <Text style={styles.helperText}>
                Remember this PIN for future logins
              </Text>
            </View>

            {/* Register Button */}
            <TouchableOpacity 
              style={[
                styles.registerButton,
                isLoading && styles.registerButtonDisabled,
                (!firstName || !lastName || !email || !pin || pin.length !== 6) && styles.registerButtonDisabled
              ]} 
              onPress={handleRegister}
              disabled={isLoading || !firstName || !lastName || !email || !pin || pin.length !== 6}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#2563eb', '#3b82f6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <View style={styles.buttonContent}>
                    <Ionicons name="refresh" size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Creating Account...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                    <Text style={styles.buttonText}>Create Account</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Terms and Login Section */}
            <View style={styles.footerSection}>
              <View style={styles.termsContainer}>
                <Ionicons name="shield-checkmark" size={14} color="#64748b" />
                <Text style={styles.termsText}>
                  By registering, you agree to our Terms & Privacy Policy
                </Text>
              </View>

              <View style={styles.loginContainer}>
                <Text style={styles.loginPrompt}>Already have an account?</Text>
                <TouchableOpacity 
                  onPress={() => router.push('/login')}
                  disabled={isLoading}
                  activeOpacity={0.7}
                  style={styles.loginButton}
                >
                  <Text style={styles.loginLink}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={16} color="#2563eb" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: isDesktop ? 40 : 20,
    paddingHorizontal: 20,
    minHeight: windowHeight,
  },
  content: {
    width: '100%',
    maxWidth: isDesktop ? 500 : 400,
    alignItems: 'center',
  },
  
  // Header Section
  headerSection: {
    alignItems: 'center',
    marginBottom: isDesktop ? 40 : 30,
    width: '100%',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: isDesktop ? 24 : 20,
  },
  logoGlow: {
    position: 'absolute',
    width: isDesktop ? 160 : 120,
    height: isDesktop ? 160 : 120,
    borderRadius: isDesktop ? 80 : 60,
    backgroundColor: '#2563eb',
    opacity: 0.1,
    ...Platform.select({
      web: {
        filter: 'blur(30px)',
      },
    }),
  },
  logoFrame: {
    width: isDesktop ? 100 : 80,
    height: isDesktop ? 100 : 80,
    borderRadius: isDesktop ? 20 : 16,
    backgroundColor: '#ffffff',
    padding: isDesktop ? 10 : 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.1)',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: isDesktop ? 14 : 12,
  },
  titleSection: {
    alignItems: 'center',
  },
  welcome: {
    fontSize: isDesktop ? 18 : 16,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  brand: {
    fontSize: isDesktop ? 28 : 24,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tagline: {
    fontSize: isDesktop ? 14 : 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 300,
  },
  
  // Card Styles
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: isDesktop ? 32 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  
  // Form Header
  formHeader: {
    alignItems: 'center',
    marginBottom: isDesktop ? 28 : 24,
  },
  formTitle: {
    fontSize: isDesktop ? 22 : 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  formSubtitle: {
    fontSize: isDesktop ? 14 : 13,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 300,
  },
  
  // Name Fields
  nameRow: {
    flexDirection: isDesktop ? 'row' : 'column',
    gap: isDesktop ? 16 : 16,
    marginBottom: isDesktop ? 24 : 20,
  },
  nameField: {
    flex: isDesktop ? 1 : undefined,
  },
  
  // Input Sections
  inputSection: {
    marginBottom: isDesktop ? 24 : 20,
  },
  inputLabel: {
    fontSize: isDesktop ? 14 : 13,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    height: isDesktop ? 52 : 48,
  },
  inputContainerFocused: {
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: isDesktop ? 15 : 14,
    color: '#1e293b',
    fontWeight: '500',
    paddingVertical: 0,
    height: '100%',
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
    fontSize: isDesktop ? 12 : 11,
    fontWeight: '600',
  },
  helperText: {
    fontSize: isDesktop ? 12 : 11,
    color: '#94a3b8',
    marginTop: 8,
    lineHeight: 18,
  },
  
  // PIN Indicator
  pinIndicator: {
    flexDirection: 'row',
    gap: isDesktop ? 12 : 10,
    marginTop: 16,
    marginBottom: 8,
    justifyContent: 'center',
  },
  pinDotWrapper: {
    width: isDesktop ? 44 : 40,
    height: isDesktop ? 44 : 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pinDotWrapperFilled: {
    borderColor: '#2563eb',
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
    shadowColor: '#2563eb',
    shadowOpacity: 0.1,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563eb',
  },
  
  // Register Button
  registerButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: isDesktop ? 24 : 20,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    paddingVertical: isDesktop ? 18 : 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: isDesktop ? 16 : 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  
  // Error Container
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: isDesktop ? 16 : 14,
    borderRadius: 10,
    marginBottom: isDesktop ? 20 : 16,
    borderWidth: 1,
    borderColor: '#fee2e2',
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: '#dc2626',
    fontSize: isDesktop ? 14 : 13,
    fontWeight: '500',
    lineHeight: 20,
  },
  
  // Footer Section
  footerSection: {
    marginTop: isDesktop ? 8 : 4,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: isDesktop ? 12 : 10,
    paddingHorizontal: isDesktop ? 16 : 12,
    backgroundColor: 'rgba(248, 250, 252, 0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: isDesktop ? 20 : 16,
  },
  termsText: {
    flex: 1,
    fontSize: isDesktop ? 12 : 11,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 16,
  },
  
  // Login Container
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: isDesktop ? 12 : 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  loginPrompt: {
    fontSize: isDesktop ? 14 : 13,
    color: '#64748b',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  loginLink: {
    fontSize: isDesktop ? 14 : 13,
    color: '#2563eb',
    fontWeight: '700',
  },
});