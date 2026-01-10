/**
 * Emotion Logs API Routes
 * 
 * Stores and retrieves emotion analysis data from Hume AI EVI.
 * Correlates emotions with trading PnL for trigger pattern detection.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getCookie } from 'hono/cookie';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { analyzePositionEmotion, detectTriggerPatterns, type PositionEmotionAnalysis } from '../utils/humeAI';

interface UserVariable {
  google_user_data?: {
    sub: string;
    email?: string;
    name?: string;
  };
  firebase_user_id?: string;
  email?: string;
}

type Env = {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  HUME_API_KEY: string;
};

const EmotionLogSchema = z.object({
  positionId: z.string().uuid(),
  audioUrl: z.string().url().optional(),
  currentPnL: z.number(),
  positionSize: z.number(),
  entryPrice: z.number(),
  currentPrice: z.number(),
  audioBlob: z.instanceof(Blob).optional() // For direct audio upload
});

export const emotionLogsRouter = new Hono<{
  Bindings: Env;
  Variables: { user: UserVariable };
}>();

// Firebase session auth middleware
const firebaseAuthMiddleware = async (c: unknown, next: () => Promise<void>) => {
  const context = c as {
    get: (key: string) => UserVariable | undefined;
    set: (key: string, value: UserVariable) => void;
    json: (data: { error: string }, status: number) => Response;
    env: Env;
  };

  const firebaseSession = getCookie(context as Parameters<typeof getCookie>[0], 'firebase_session');
  if (firebaseSession) {
    try {
      const userData = JSON.parse(firebaseSession) as { google_user_id?: string; sub?: string; email?: string; name?: string };
      context.set('user', {
        google_user_data: {
          sub: userData.google_user_id || userData.sub || '',
          email: userData.email,
          name: userData.name,
        },
        firebase_user_id: userData.google_user_id || userData.sub,
        email: userData.email,
      });
      return next();
    } catch (error) {
      console.error('Error parsing Firebase session:', error);
    }
  }

  return context.json({ error: 'Unauthorized' }, 401);
};

emotionLogsRouter.use('*', firebaseAuthMiddleware);

/**
 * POST /api/emotion-logs
 * Store emotion analysis for a position
 */
emotionLogsRouter.post(
  '/',
  zValidator('json', EmotionLogSchema),
  async (c) => {
    try {
      const user = c.get('user');
      const userId = user?.google_user_data?.sub || (user as any)?.firebase_user_id;
      
      if (!userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const data = c.req.valid('json');
      const { positionId, audioUrl, currentPnL, positionSize, entryPrice, currentPrice, audioBlob } = data;

      if (!c.env.HUME_API_KEY) {
        return c.json({ error: 'Hume AI not configured' }, 500);
      }

      let emotionAnalysis;
      let storedAudioUrl = audioUrl;

      // If audio blob provided, analyze it
      if (audioBlob) {
        // Upload audio to R2 first
        const uuid = crypto.randomUUID();
        const r2Key = `emotion_logs/${userId}/${positionId}/${uuid}.webm`;
        
        const arrayBuffer = await audioBlob.arrayBuffer();
        await c.env.R2_BUCKET.put(r2Key, arrayBuffer, {
          httpMetadata: {
            contentType: 'audio/webm',
          },
          customMetadata: {
            userId,
            positionId,
            timestamp: new Date().toISOString(),
          },
        });

        storedAudioUrl = `/api/emotion-logs/audio/${r2Key}`;

        // Analyze with Hume AI
        emotionAnalysis = await analyzePositionEmotion(
          audioBlob,
          c.env.HUME_API_KEY,
          positionId,
          currentPnL,
          positionSize,
          entryPrice,
          currentPrice
        );
      } else if (audioUrl) {
        // Fetch audio from URL and analyze
        const audioResponse = await fetch(audioUrl);
        if (!audioResponse.ok) {
          return c.json({ error: 'Failed to fetch audio' }, 400);
        }
        const audioBlob = await audioResponse.blob();
        
        emotionAnalysis = await analyzePositionEmotion(
          audioBlob,
          c.env.HUME_API_KEY,
          positionId,
          currentPnL,
          positionSize,
          entryPrice,
          currentPrice
        );
      } else {
        return c.json({ error: 'No audio provided' }, 400);
      }

      // Store in database
      await c.env.DB.prepare(`
        INSERT INTO emotion_logs (
          user_id, position_id, audio_url, emotions_json, prosody_json,
          current_pnl, position_size, entry_price, current_price, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        userId,
        positionId,
        storedAudioUrl,
        JSON.stringify(emotionAnalysis.emotions),
        JSON.stringify(emotionAnalysis.prosody),
        currentPnL,
        positionSize,
        entryPrice,
        currentPrice
      ).run();

      return c.json({
        success: true,
        analysis: emotionAnalysis,
        audioUrl: storedAudioUrl
      });
    } catch (error) {
      console.error('Emotion log error:', error);
      return c.json({
        error: 'Failed to store emotion log',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 500);
    }
  }
);

/**
 * GET /api/emotion-logs/:positionId
 * Get all emotion logs for a position
 */
emotionLogsRouter.get('/:positionId', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }
    const positionId = c.req.param('positionId');

    const logs = await c.env.DB.prepare(`
      SELECT * FROM emotion_logs
      WHERE user_id = ? AND position_id = ?
      ORDER BY timestamp DESC
    `).bind(userId, positionId).all();

    const analyses: PositionEmotionAnalysis[] = (logs.results as Array<{
      emotions_json?: string;
      prosody_json?: string;
      timestamp?: string;
      audio_url?: string;
      position_id?: string;
      current_pnl?: number;
      position_size?: number;
      entry_price?: number;
      current_price?: number;
    }>)
      .filter((log) => log.position_id && log.timestamp && log.current_pnl !== undefined && log.position_size !== undefined && log.entry_price !== undefined && log.current_price !== undefined)
      .map((log) => {
        const typedLog = log as {
          emotions_json: string;
          prosody_json: string;
          timestamp: string;
          audio_url?: string;
          position_id: string;
          current_pnl: number;
          position_size: number;
          entry_price: number;
          current_price: number;
        };
        return {
          emotions: JSON.parse(typedLog.emotions_json || '[]'),
          prosody: JSON.parse(typedLog.prosody_json || '{}'),
          timestamp: new Date(typedLog.timestamp).getTime(),
          audioUrl: typedLog.audio_url,
          positionId: typedLog.position_id,
          currentPnL: typedLog.current_pnl,
          positionSize: typedLog.position_size,
          entryPrice: typedLog.entry_price,
          currentPrice: typedLog.current_price
        };
      });

    return c.json({ logs: analyses });
  } catch (error) {
    console.error('Get emotion logs error:', error);
    return c.json({
      error: 'Failed to fetch emotion logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/emotion-logs/patterns/:positionId
 * Analyze trigger patterns for a position
 */
emotionLogsRouter.get('/patterns/:positionId', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const userId = user.google_user_data?.sub || user.firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }
    const positionId = c.req.param('positionId');

    const logs = await c.env.DB.prepare(`
      SELECT * FROM emotion_logs
      WHERE user_id = ? AND position_id = ?
      ORDER BY timestamp ASC
    `).bind(userId, positionId).all();

    const analyses: PositionEmotionAnalysis[] = (logs.results as Array<{
      emotions_json?: string;
      prosody_json?: string;
      timestamp?: string;
      audio_url?: string;
      position_id?: string;
      current_pnl?: number;
      position_size?: number;
      entry_price?: number;
      current_price?: number;
    }>)
      .filter((log) => log.position_id && log.timestamp && log.current_pnl !== undefined && log.position_size !== undefined && log.entry_price !== undefined && log.current_price !== undefined)
      .map((log) => {
        const typedLog = log as {
          emotions_json: string;
          prosody_json: string;
          timestamp: string;
          audio_url?: string;
          position_id: string;
          current_pnl: number;
          position_size: number;
          entry_price: number;
          current_price: number;
        };
        return {
          emotions: JSON.parse(typedLog.emotions_json || '[]'),
          prosody: JSON.parse(typedLog.prosody_json || '{}'),
          timestamp: new Date(typedLog.timestamp).getTime(),
          audioUrl: typedLog.audio_url,
          positionId: typedLog.position_id,
          currentPnL: typedLog.current_pnl,
          positionSize: typedLog.position_size,
          entryPrice: typedLog.entry_price,
          currentPrice: typedLog.current_price
        };
      });

    const patterns = detectTriggerPatterns(analyses);

    return c.json({ patterns, analysisCount: analyses.length });
  } catch (error) {
    console.error('Pattern analysis error:', error);
    return c.json({
      error: 'Failed to analyze patterns',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
});

/**
 * GET /api/emotion-logs/audio/:key
 * Serve audio file from R2
 */
emotionLogsRouter.get('/audio/:key', async (c) => {
  try {
    const key = c.req.param('key');
    const object = await c.env.R2_BUCKET.get(`emotion_logs/${key}`);

    if (!object) {
      return c.json({ error: 'Audio not found' }, 404);
    }

    const audio = await object.arrayBuffer();
    return new Response(audio, {
      headers: {
        'Content-Type': 'audio/webm',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error('Audio serve error:', error);
    return c.json({ error: 'Failed to serve audio' }, 500);
  }
});