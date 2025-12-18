import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { removeToken } from '../../lib/auth';

const IDLE_TIMEOUT = Platform.OS === 'web' 
  ? 10 * 60 * 1000   // 10 minutes for web
  : 5 * 60 * 1000;   // 5 minutes for app

export function useIdleLogout() {
  const router = useRouter();
  const lastActiveRef = useRef(Date.now());

  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      console.log('App state changed:', nextAppState);

      if (nextAppState === 'background') {
        lastActiveRef.current = Date.now();
        console.log('App backgrounded at', lastActiveRef.current);
      }
      if (nextAppState === 'active') {
        const now = Date.now();
        const seconds = (now - lastActiveRef.current) / 1000;
        console.log('App resumed after', seconds, 'seconds');
        if (now - lastActiveRef.current > IDLE_TIMEOUT) {
          console.log('Logging out due to inactivity!');
          await removeToken();
          router.replace('/login');
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);
}
