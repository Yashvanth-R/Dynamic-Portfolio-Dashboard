import { Router, Request, Response } from 'express';
import { YahooFinanceService } from '../services/yahoo.service';
import { GoogleFinanceService } from '../services/google.service';
import { CacheService } from '../services/cache.service';

const router = Router();
const yahooService = new YahooFinanceService();
const googleService = new GoogleFinanceService();
const cacheService = new CacheService();

router.get('/stock/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  
  try {
    const cachedData = cacheService.get(symbol);
    if (cachedData) {
      return res.json({ ...cachedData, cached: true });
    }

    const [yahooData, googleData] = await Promise.allSettled([
      yahooService.fetchStockData(symbol),
      googleService.fetchStockData(symbol)
    ]);

    const marketData = {
      symbol,
      cmp: yahooData.status === 'fulfilled' ? yahooData.value.cmp : null,
      peRatio: googleData.status === 'fulfilled' ? googleData.value.peRatio : null,
      latestEarnings: googleData.status === 'fulfilled' ? googleData.value.latestEarnings : null,
      timestamp: new Date().toISOString(),
      cached: false
    };

    cacheService.set(symbol, marketData);
    
    res.json(marketData);
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    res.status(500).json({ 
      error: 'Failed to fetch market data',
      symbol,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/stocks/batch', async (req: Request, res: Response) => {
  const { symbols } = req.body;
  
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: 'Invalid symbols array' });
  }

  try {
    const results = await Promise.all(
      symbols.map(async (symbol: string) => {
        const cachedData = cacheService.get(symbol);
        if (cachedData) {
          return { ...cachedData, cached: true };
        }

        try {
          const [yahooData, googleData] = await Promise.allSettled([
            yahooService.fetchStockData(symbol),
            googleService.fetchStockData(symbol)
          ]);

          const marketData = {
            symbol,
            cmp: yahooData.status === 'fulfilled' ? yahooData.value.cmp : null,
            peRatio: googleData.status === 'fulfilled' ? googleData.value.peRatio : null,
            latestEarnings: googleData.status === 'fulfilled' ? googleData.value.latestEarnings : null,
            timestamp: new Date().toISOString(),
            cached: false
          };

          cacheService.set(symbol, marketData);
          return marketData;
        } catch (error) {
          return {
            symbol,
            cmp: null,
            peRatio: null,
            latestEarnings: null,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );

    res.json(results);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch batch data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
