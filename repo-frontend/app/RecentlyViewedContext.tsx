import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RecentlyViewedItem = { title: string; category: string };

const RecentlyViewedContext = createContext<{
  recentlyViewed: RecentlyViewedItem[];
  addRecentlyViewed: (tool: RecentlyViewedItem) => void;
}>({
  recentlyViewed: [],
  addRecentlyViewed: () => {},
});

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);

  // Load from storage on mount
  useEffect(() => {
    AsyncStorage.getItem('recentlyViewed').then((json) => {
      if (json) setRecentlyViewed(JSON.parse(json));
    });
  }, []);

  // Save to storage on update
  useEffect(() => {
    AsyncStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  const addRecentlyViewed = (tool: RecentlyViewedItem) => {
    setRecentlyViewed(prev => {
      const filtered = prev.filter(item =>
        !(item.title === tool.title && item.category === tool.category)
      );
      return [{ title: tool.title, category: tool.category }, ...filtered].slice(0, 5);
    });
  };

  return (
    <RecentlyViewedContext.Provider value={{ recentlyViewed, addRecentlyViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  return useContext(RecentlyViewedContext);
}
