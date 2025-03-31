// pages/_app.tsx
import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { useMarketStore } from '../src/store/useMarketStore';
import '../src/styles/globals.css';
import '../styles/fonts.css';
import '../styles/globals.css';

function TradingApp({ Component, pageProps }: AppProps) {
  const setOnlineStatus = useMarketStore((state) => state.setOnlineStatus);

  useEffect(() => {
    // PWA Service Worker Registration
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    }

    // Network Status Listener
    const handleNetworkChange = () => {
      setOnlineStatus(navigator.onLine);
    };

    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);

    return () => {
      window.removeEventListener('online', handleNetworkChange);
      window.removeEventListener('offline', handleNetworkChange);
    };
  }, [setOnlineStatus]);

  return (
    <ErrorBoundary>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ErrorBoundary>
  );
}

// Layout Component for consistent page structure
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isOnline = useMarketStore((state) => state.isOnline);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="p-4 bg-white shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">
          Trading Platform
          {!isOnline && <span className="ml-2 text-sm text-yellow-600">(Offline Mode)</span>}
        </h1>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
};

// Example in your Layout component
const Layout = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <div>
      <button onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      {children}
    </div>
  );
};

export default TradingApp;
