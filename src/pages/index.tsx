// pages/index.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useMarketStore } from '../src/store/useMarketStore';

// Dynamically load heavy components
const TradingChart = dynamic(
  () => import('../src/components/TradingChart'),
  { 
    suspense: true,
    ssr: false // Disable SSR for charting library
  }
);

const HomePage = () => {
  const lastUpdate = useMarketStore((state) => state.lastUpdate);
  
  return (
    <div className="space-y-4">
      <div className="p-4 bg-white rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold">AAPL - Daily Chart</h2>
        {lastUpdate && (
          <p className="text-sm text-gray-500">
            Last updated: {new Date(lastUpdate).toLocaleString()}
          </p>
        )}
      </div>

      <Suspense fallback={<ChartLoadingSkeleton />}>
        <TradingChart />
      </Suspense>
    </div>
  );
};

const ChartLoadingSkeleton = () => (
  <div className="w-full h-[600px] bg-gray-100 rounded-lg animate-pulse" />
);

export default HomePage;