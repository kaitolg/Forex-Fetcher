// store/useMarketStore.ts
import { create } from 'zustand';

interface MarketState {
  isOnline: boolean;
  lastUpdate: Date | null;
  candles: any[];
  indicators: {
    rsi: number[];
    macd: number[];
  };
  setOnlineStatus: (status: boolean) => void;
  updateData: (newData: any[]) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  isOnline: navigator.onLine,
  lastUpdate: null,
  candles: [],
  indicators: { rsi: [], macd: [] },
  
  setOnlineStatus: (status) => set({ isOnline: status }),
  updateData: (newData) => set({
    candles: newData,
    lastUpdate: new Date()
  }),
}));