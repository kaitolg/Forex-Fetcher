// components/TradingChart.tsx
import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';
import { RSI, MACD, BollingerBands, SMA } from 'trading-signals';
import { saveToIndexedDB, getFromIndexedDB } from '../utils/indexedDB';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const TradingChart = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [error, setError] = useState<string | null>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<{ [key: string]: ISeriesApi<any> }>({});

  useEffect(() => {
    const initChart = async () => {
      if (!chartContainerRef.current) return;

      chart.current = createChart(chartContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#191919',
        },
        width: chartContainerRef.current.clientWidth,
        height: 600,
      });

      series.current.candles = chart.current.addCandlestickSeries();
      series.current.volume = chart.current.addHistogramSeries({
        color: '#26a69a',
        priceFormat: { type: 'volume' },
        priceScaleId: '',
      });

      series.current.rsi = chart.current.addLineSeries({
        color: '#7E57C2',
        lineWidth: 1,
        priceScaleId: 'rsi',
      });

      chart.current.priceScale('rsi').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0.1 },
      });

      try {
        const response = await fetch('/api/market-data');
        if (!response.ok) throw new Error('Network response failed');
        
        const data = await response.json();
        await saveToIndexedDB('marketData', data);
        
        updateChartData(data);
        calculateIndicators(data);
      } catch (err) {
        const cachedData = await getFromIndexedDB('marketData');
        if (cachedData) {
          updateChartData(cachedData);
          calculateIndicators(cachedData);
          setError('Using cached data - offline mode');
        } else {
          setError('Failed to load market data');
        }
      }
    };

    initChart();

    return () => {
      chart.current?.remove();
    };
  }, []);

  const updateChartData = (data: CandleData[]) => {
    series.current.candles?.setData(data);
    series.current.volume?.setData(data.map(d => ({
      time: d.time,
      value: d.volume,
    }));
  };

  const calculateIndicators = (data: CandleData[]) => {
    // RSI Calculation
    const rsi = new RSI(14);
    const rsiData = data.map((candle, index) => {
      const value = rsi.update(candle.close);
      return { time: candle.time, value: index >= 14 ? value : null };
    }).filter(d => d.value !== null);
    
    series.current.rsi?.setData(rsiData);
  };

  return (
    <div className="relative">
      {!isOnline && (
        <div className="absolute top-2 left-2 bg-yellow-100 p-2 rounded">
          Offline Mode - Showing cached data
        </div>
      )}
      {error && (
        <div className="absolute top-2 right-2 bg-red-100 p-2 rounded">
          {error}
        </div>
      )}
      <div ref={chartContainerRef} className="w-full h-[600px]" />
    </div>
  );
};

export default TradingChart;