import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Text, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { removeToken } from "../lib/auth";

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.7)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const dividerWidth = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // --- Main animation sequence ---
    Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 40,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
      // Title entrance
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslate, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      // Divider and subtitle
      Animated.parallel([
        Animated.timing(dividerWidth, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }),
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 600,
          delay: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Subtle pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating idle animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer effect
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();

    // --- Navigate after 4 seconds ---
    const navigateAfterSplash = async () => {
      try {
        await removeToken();
        console.log("Cleared tokens, navigating to login...");
        router.replace("/login");
      } catch (err) {
        console.error("Error navigating:", err);
        router.replace("/login");
      }
    };

    const timeout = setTimeout(() => {
      navigateAfterSplash();
    }, 4000); // 4 seconds display time

    return () => clearTimeout(timeout);
  }, []);

  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150],
  });

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <LinearGradient
        colors={["#f8fafc", "#f1f5f9", "#e2e8f0"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle background pattern */}
      <View style={styles.patternOverlay} />

      {/* Main content */}
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            transform: [
              { translateY: floatTranslate },
              { scale: pulseAnim }
            ],
          },
        ]}
      >
        {/* Logo container */}
        <View style={styles.logoContainer}>
          <Animated.View
            style={[
              styles.logoGlow,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <LinearGradient
              colors={["#2563eb", "#1d4ed8"]}
              style={styles.logoGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </Animated.View>
          
          <Animated.View
            style={[
              styles.logoFrame,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }],
              },
            ]}
          >
            <Animated.Image
              source={require("../assets/images/logo.jpg")}
              style={styles.logo}
              resizeMode="cover"
            />
            {/* Shimmer effect overlay */}
            <Animated.View
              style={[
                styles.shimmer,
                {
                  transform: [{ translateX: shimmerTranslate }],
                },
              ]}
            />
          </Animated.View>
        </View>

        {/* Text content */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: titleOpacity,
              transform: [{ translateY: titleTranslate }],
            },
          ]}
        >
          <Text style={styles.title}>Research Repository</Text>

          <Animated.View
            style={[
              styles.divider,
              {
                width: dividerWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "60%"],
                }),
              },
            ]}
          >
            <LinearGradient
              colors={["#2563eb", "#3b82f6", "#2563eb"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dividerGradient}
            />
          </Animated.View>

          <Animated.View style={{ opacity: subtitleOpacity, alignItems: "center" }}>
            <Text style={styles.subtitle}>
              Advancing Academic Excellence Through Research
            </Text>
            <Text style={styles.tagline}>
              A Digital Archive for Scholarly Innovation
            </Text>
            
            <View style={styles.featuresContainer}>
              <View style={styles.featureBadge}>
                <Text style={styles.featureText}>Research Management</Text>
              </View>
              <View style={styles.featureBadge}>
                <Text style={styles.featureText}>Academic Collaboration</Text>
              </View>
              <View style={styles.featureBadge}>
                <Text style={styles.featureText}>Knowledge Discovery</Text>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Footer */}
      <Animated.View style={[styles.footer, { opacity: subtitleOpacity }]}>
        <View style={styles.footerContent}>
          <Text style={styles.footerText}>
            Secured Platform • Academic Year {new Date().getFullYear()}
          </Text>
          <View style={styles.loadingIndicator}>
            <View style={[styles.loadingDot, styles.dot1]} />
            <View style={[styles.loadingDot, styles.dot2]} />
            <View style={[styles.loadingDot, styles.dot3]} />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
  },
  patternOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
    opacity: 0.03,
    ...(Platform.OS === "web" && {
      backgroundImage:
        "linear-gradient(90deg, #2563eb 1px, transparent 1px), linear-gradient(#2563eb 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    }),
  },
  contentWrapper: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  logoGlow: {
    position: "absolute",
    width: Platform.OS === "web" ? 220 : 180,
    height: Platform.OS === "web" ? 220 : 180,
    borderRadius: 110,
    ...(Platform.OS === "web" && { filter: "blur(40px)" }),
  },
  logoGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 110,
  },
  logoFrame: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    overflow: "hidden",
    position: "relative",
  },
  logo: {
    width: Platform.OS === "web" ? 140 : 110,
    height: Platform.OS === "web" ? 140 : 110,
    borderRadius: 16,
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    ...(Platform.OS === "web" && {
      background:
        "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)",
    }),
  },
  textContainer: {
    alignItems: "center",
    maxWidth: 500,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: Platform.OS === "web" ? 36 : 28,
    color: "#1e293b",
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
    marginBottom: 16,
    textShadowColor: "rgba(37, 99, 235, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  divider: {
    height: 2,
    marginVertical: 20,
    overflow: "hidden",
    borderRadius: 1,
  },
  dividerGradient: {
    flex: 1,
    height: "100%",
  },
  subtitle: {
    fontSize: Platform.OS === "web" ? 18 : 16,
    color: "#475569",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  tagline: {
    fontSize: Platform.OS === "web" ? 15 : 13,
    color: "#64748b",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  featuresContainer: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 8,
  },
  featureBadge: {
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.15)",
  },
  featureText: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  footer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
    width: "100%",
  },
  footerContent: {
    alignItems: "center",
    gap: 16,
  },
  footerText: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  loadingIndicator: {
    flexDirection: "row",
    gap: 6,
  },
  loadingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#2563eb",
  },
  dot1: {
    opacity: 0.4,
    animationDelay: "0s",
  },
  dot2: {
    opacity: 0.7,
    animationDelay: "0.2s",
  },
  dot3: {
    opacity: 1,
    animationDelay: "0.4s",
  },
});