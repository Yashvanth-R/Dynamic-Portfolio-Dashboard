import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import stockRoutes from './routes/stocks';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Portfolio Dashboard API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      singleStock: '/api/stock/:symbol',
      batchStocks: '/api/stocks/batch (POST)'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Portfolio Backend API'
  });
});

app.use('/api', stockRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(` Backend server running on http://localhost:${PORT}`);
    console.log(` API endpoints available at http://localhost:${PORT}/api`);
  });
}

// Export for Vercel
export default app;
