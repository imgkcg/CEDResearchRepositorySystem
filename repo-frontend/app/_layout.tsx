// app/_layout.tsx
import React, { useEffect, useState } from "react";
import { Stack, Redirect } from "expo-router";
import SplashScreen from "./SplashScreen";
import { getToken } from "../lib/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      try {
        // First, show splash screen for at least 3 seconds
        const splashTimeout = setTimeout(async () => {
          try {
            // Check if user has a token
            const token = await getToken();
            
            if (token) {
              // User is logged in, check their role
              try {
                const userData = await AsyncStorage.getItem('user');
                if (userData) {
                  const user = JSON.parse(userData);
                  
                  // Set initial route based on role
                  if (user.role === 'admin') {
                    setInitialRoute('/admin');
                  } else if (user.role === 'faculty') {
                    setInitialRoute('/faculty');
                  } else if (user.role === 'staff') {
                    setInitialRoute('/staff');
                  } else {
                    setInitialRoute('/(tabs)');
                  }
                } else {
                  // No user data, go to login
                  setInitialRoute('/login');
                }
              } catch (error) {
                console.log("Error parsing user data:", error);
                setInitialRoute('/login');
              }
            } else {
              // No token found, go to login
              setInitialRoute('/login');
            }
          } catch (error) {
            console.error("Error checking auth:", error);
            setInitialRoute('/login');
          } finally {
            // Hide splash screen
            setShowSplash(false);
          }
        }, 3000); // Show splash for minimum 3 seconds

        return () => clearTimeout(splashTimeout);
      } catch (error) {
        console.error("Error in auth check:", error);
        setInitialRoute('/login');
        setShowSplash(false);
      }
    };

    checkAuthAndNavigate();
  }, []);

  // Show splash screen while checking auth
  if (showSplash) {
    return <SplashScreen />;
  }

  // If we haven't determined the route yet, show nothing (brief moment)
  if (!initialRoute) {
    return null;
  }

  // Redirect to the determined route
  return (
    <>
      <Redirect href={initialRoute} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}