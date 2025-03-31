// pages/api/market-data.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getFromIndexedDB, saveToIndexedDB } from '../../utils/indexedDB';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const apiResponse = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&count=100&token=${process.env.FINNHUB_KEY}`
    );
    
    if (!apiResponse.ok) throw new Error('API request failed');
    
    const data = await apiResponse.json();
    const formattedData = data.t.map((time: number, index: number) => ({
      time: time.toString(),
      open: data.o[index],
      high: data.h[index],
      low: data.l[index],
      close: data.c[index],
      volume: data.v[index],
    }));

    await saveToIndexedDB('marketData', formattedData);
    
    res.status(200).json(formattedData);
  } catch (error) {
    console.error('API Error:', error);
    const cachedData = await getFromIndexedDB('marketData');
    
    if (cachedData) {
      res.status(200).json(cachedData);
    } else {
      res.status(503).json({ error: 'Service unavailable' });
    }
  }
}