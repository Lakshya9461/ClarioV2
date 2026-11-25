import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import mongoose from 'mongoose';

import { connectDB } from './config/db.js';
import { initRedis, isRedisFallback } from './config/redis.js';
import User from './models/User.js';
import { seedData } from './scripts/seed.js';

import authRoutes from './routes/authRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import studyListRoutes from './routes/studyListRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import shortsRoutes from './routes/shortsRoutes.js';
import learningGraphRoutes from './routes/learningGraphRoutes.js';

import { notFound, errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database & initialize Redis
await connectDB();
initRedis();

// Auto-seed demo accounts and concept questions if database is empty
try {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('🌱 [Auto-Seed] Empty database detected. Seeding demo accounts and concept questions...');
    await seedData(false);
    console.log('✅ [Auto-Seed] Demo accounts ready: student@clario.edu, teacher@clario.edu, admin@clario.edu');
  }
} catch (seedErr) {
  console.warn('⚠️ [Auto-Seed Notice]', seedErr.message);
}

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible cross-origin in dev & Vite hot reloading
  })
);

// CORS Whitelist configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Dev convenience
    },
    credentials: true,
  })
);

// Standard Middlewares
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'Clario AI Learning Portal API',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: isRedisFallback() ? 'memory-fallback' : 'connected',
      llmEngine: process.env.LLM_API_URL ? 'configured' : 'local-engine',
    },
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/study-lists', studyListRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/shorts', shortsRoutes);
app.use('/api/learning-graph', learningGraphRoutes);

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

// Start server if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 [Clario Server] Running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    console.log(`🔗 Health check available at: http://localhost:${PORT}/api/health`);
  });
}

export default app;
