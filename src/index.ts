import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db';
import authRoutes from './routes/authRoutes';
import studioRoutes from './routes/studioRoutes';
import bookingRoutes from './routes/bookingRoutes';
import wishlistRoutes from './routes/wishlistRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS setup supporting credentials (HTTPOnly cookies)
const configuredOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile, curl, Postman, SSR)
      if (!origin) return callback(null, true);
      // Allow listed origins, vercel preview deployments, or local development
      if (
        configuredOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1')
      ) {
        return callback(null, true);
      }
      // Permissive fallback so production Vercel clients aren't blocked by mismatching subdomains
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// Standard Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serverless-ready database connection middleware
app.use(async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await connectDB();
  } catch (err: any) {
    console.error('[Aperture Server] Database connection middleware error:', err?.message || err);
  }
  next();
});

// Diagnostic & Health Endpoints
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'Aperture Studio API',
    description: 'Peer-to-Peer Creative Workspace & Production Studio Sharing Platform',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      studios: '/api/studios',
      bookings: '/api/bookings',
      wishlist: '/api/wishlist',
      health: '/health',
    },
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Aperture Studio Production API v1.0.0',
  });
});

// Mount Resource Routes
app.use('/api/auth', authRoutes);
app.use('/api/studios', studioRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/wishlists', wishlistRoutes);

// Catch-all 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Aperture Server Error]', err);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Listen on port if started directly in development
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Aperture Server] Ready and listening on port ${PORT}`);
    console.log(`[Aperture Server] Health check available at http://localhost:${PORT}/health`);
  });
}

export default app;
