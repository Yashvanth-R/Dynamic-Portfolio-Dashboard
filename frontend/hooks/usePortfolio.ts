import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Stock, StockWithMarketData, SectorSummary, MarketData } from '@/types/stock';
import portfolioData from '@/data/portfolio.json';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';
const REFRESH_INTERVAL = 15000; // 15 seconds

export function usePortfolio() {
  const [stocks, setStocks] = useState<StockWithMarketData[]>([]);
  const [sectors, setSectors] = useState<SectorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchMarketData = async (stocks: Stock[]): Promise<MarketData[]> => {
    const symbols = stocks.map(s => s.symbol);
    
    try {
      const response = await axios.post(`${API_URL}/stocks/batch`, { symbols });
      return response.data;
    } catch (err) {
      console.error('Error fetching market data:', err);
      throw new Error('Failed to fetch market data from API');
    }
  };

  const calculatePortfolioMetrics = (
    stocks: Stock[],
    marketData: MarketData[]
  ): StockWithMarketData[] => {
    const totalInvestment = stocks.reduce(
      (sum, stock) => sum + stock.purchasePrice * stock.quantity,
      0
    );

    return stocks.map(stock => {
      const market = marketData.find(m => m.symbol === stock.symbol);
      const cmp = market?.cmp || stock.purchasePrice;
      const investment = stock.purchasePrice * stock.quantity;
      const presentValue = cmp * stock.quantity;
      const gainLoss = presentValue - investment;
      const gainLossPercentage = (gainLoss / investment) * 100;
      const portfolioPercentage = (investment / totalInvestment) * 100;

      return {
        ...stock,
        investment,
        portfolioPercentage,
        cmp,
        presentValue,
        gainLoss,
        gainLossPercentage,
        peRatio: market?.peRatio || null,
        latestEarnings: market?.latestEarnings || null,
      };
    });
  };

  const groupBySector = (stocks: StockWithMarketData[]): SectorSummary[] => {
    const sectorMap = new Map<string, StockWithMarketData[]>();

    stocks.forEach(stock => {
      if (!sectorMap.has(stock.sector)) {
        sectorMap.set(stock.sector, []);
      }
      sectorMap.get(stock.sector)!.push(stock);
    });

    return Array.from(sectorMap.entries()).map(([sector, sectorStocks]) => {
      const totalInvestment = sectorStocks.reduce((sum, s) => sum + s.investment, 0);
      const totalPresentValue = sectorStocks.reduce((sum, s) => sum + s.presentValue, 0);
      const gainLoss = totalPresentValue - totalInvestment;
      const gainLossPercentage = (gainLoss / totalInvestment) * 100;

      return {
        sector,
        totalInvestment,
        totalPresentValue,
        gainLoss,
        gainLossPercentage,
        stocks: sectorStocks,
      };
    });
  };

  const loadPortfolioData = useCallback(async () => {
    try {
      setError(null);
      
      const marketData = await fetchMarketData(portfolioData as Stock[]);
      const enrichedStocks = calculatePortfolioMetrics(portfolioData as Stock[], marketData);
      const sectorGroups = groupBySector(enrichedStocks);
      
      setStocks(enrichedStocks);
      setSectors(sectorGroups);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load portfolio data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPortfolioData();
    
    const interval = setInterval(() => {
      loadPortfolioData();
    }, REFRESH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [loadPortfolioData]);

  return {
    stocks,
    sectors,
    loading,
    error,
    lastUpdate,
    refresh: loadPortfolioData
  };
}
