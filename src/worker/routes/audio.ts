import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { authMiddleware } from "@getmocha/users-service/backend";
import type { R2Bucket } from "@cloudflare/workers-types";

type Env = {
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  AI: any; // Cloudflare Workers AI binding
};

export const audioRouter = new Hono<{ Bindings: Env; Variables: { user: any } }>();

// Combined auth middleware that supports both mocha sessions and Firebase sessions
const combinedAuthMiddleware = async (c: any, next: any) => {
  // First try the mocha auth middleware
  try {
    await authMiddleware(c, async () => { });
    if (c.get('user')) {
      return next();
    }
  } catch (e) {
    // Mocha auth failed, try Firebase session
  }

  // Try Firebase session as fallback
  const firebaseSession = getCookie(c, 'firebase_session');
  if (firebaseSession) {
    try {
      const userData = JSON.parse(firebaseSession);
      // Set user in context in the format expected by routes
      c.set('user', {
        google_user_data: {
          sub: userData.google_user_id || userData.sub,
          email: userData.email,
          name: userData.name,
        },
        email: userData.email,
      });
      return next();
    } catch (e) {
      console.error('Error parsing Firebase session:', e);
    }
  }

  // Both auth methods failed
  return c.json({ error: 'Unauthorized' }, 401);
};

// Apply combined auth middleware to all routes in this router
audioRouter.use('*', combinedAuthMiddleware);

// Upload audio file and transcribe using AI
audioRouter.post('/upload', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get user ID for file organization
    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    if (!userId) {
      return c.json({ error: 'User ID not found' }, 401);
    }

    // Get FormData from request
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return c.json({ error: 'No audio file provided' }, 400);
    }

    // Validate file type
    const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(audioFile.type)) {
      return c.json({ 
        error: 'Invalid file type. Allowed types: webm, mp3, wav, ogg' 
      }, 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (audioFile.size > maxSize) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400);
    }

    // Generate unique filename
    const uuid = crypto.randomUUID();
    const fileExtension = audioFile.name.split('.').pop() || 'webm';
    const r2Key = `voice_notes/${userId}/${uuid}.${fileExtension}`;

    console.log(`Uploading audio file: ${r2Key} (${audioFile.size} bytes, ${audioFile.type})`);

    // Convert File to ArrayBuffer for R2 upload
    const arrayBuffer = await audioFile.arrayBuffer();

    // Upload to R2
    await c.env.R2_BUCKET.put(r2Key, arrayBuffer, {
      httpMetadata: {
        contentType: audioFile.type,
      },
      customMetadata: {
        userId: userId,
        originalName: audioFile.name,
        uploadedAt: new Date().toISOString(),
      },
    });

    console.log(`Audio file uploaded to R2: ${r2Key}`);

    // Get public URL (or generate signed URL if needed)
    // For now, we'll return a path that can be used with a public endpoint
    const audioUrl = `/api/audio/play/${r2Key}`;

    // Transcribe audio using Cloudflare Workers AI (Whisper)
    console.log('Starting AI transcription...');
    console.log('Audio file details:', {
      size: arrayBuffer.byteLength,
      type: audioFile.type,
      name: audioFile.name,
    });
    
    // Check if AI binding is available
    if (!c.env.AI) {
      console.warn('AI binding not available, skipping transcription');
      return c.json({
        success: true,
        text: '',
        audioUrl: audioUrl,
        r2Key: r2Key,
        fileSize: audioFile.size,
        fileType: audioFile.type,
        warning: 'AI transcription not available',
      }, 200);
    }
    
    let transcriptionText = '';

    try {
      // Cloudflare Workers AI Whisper expects the audio as ArrayBuffer
      // arrayBuffer is already an ArrayBuffer from the File
      console.log('Calling AI.run with @cf/openai/whisper...');
      console.log('Audio ArrayBuffer size:', arrayBuffer.byteLength);
      
      // Use Cloudflare Workers AI Whisper model
      // The model expects the audio as Uint8Array (from ArrayBuffer)
      // According to Cloudflare docs, pass as { audio: Uint8Array }
      const transcriptionResponse = await c.env.AI.run(
        '@cf/openai/whisper',
        {
          audio: new Uint8Array(arrayBuffer),
        }
      );

      console.log('AI transcription response type:', typeof transcriptionResponse);
      console.log('AI transcription response:', JSON.stringify(transcriptionResponse).substring(0, 200));

      // The response format may vary, check for text property
      if (transcriptionResponse) {
        if (typeof transcriptionResponse === 'string') {
          transcriptionText = transcriptionResponse;
        } else if (transcriptionResponse.text) {
          transcriptionText = transcriptionResponse.text;
        } else if (transcriptionResponse.transcription) {
          transcriptionText = transcriptionResponse.transcription;
        } else if (transcriptionResponse.result) {
          transcriptionText = transcriptionResponse.result;
        } else {
          // Try to stringify and parse if it's a complex object
          try {
            const responseStr = JSON.stringify(transcriptionResponse);
            const parsed = JSON.parse(responseStr);
            transcriptionText = parsed.text || parsed.transcription || parsed.result || '';
          } catch (parseError) {
            console.error('Failed to parse transcription response:', parseError);
            // Try direct access to common properties
            transcriptionText = (transcriptionResponse as any).text || 
                               (transcriptionResponse as any).transcription || 
                               (transcriptionResponse as any).result || 
                               '';
          }
        }
        
        if (transcriptionText) {
          console.log(`✅ Transcription successful: ${transcriptionText.substring(0, 100)}...`);
        } else {
          console.warn('⚠️ Transcription returned empty result. Full response:', transcriptionResponse);
        }
      } else {
        console.warn('⚠️ Transcription returned null/undefined');
        transcriptionText = '';
      }
    } catch (aiError) {
      console.error('❌ AI transcription failed:', aiError);
      console.error('Error details:', {
        message: aiError instanceof Error ? aiError.message : String(aiError),
        stack: aiError instanceof Error ? aiError.stack : undefined,
      });
      // Don't fail the upload if transcription fails - return empty text
      transcriptionText = '';
    }

    return c.json({
      success: true,
      text: transcriptionText,
      audioUrl: audioUrl,
      r2Key: r2Key,
      fileSize: audioFile.size,
      fileType: audioFile.type,
    }, 200);

  } catch (error) {
    console.error('Error in POST /api/audio/upload:', error);
    return c.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

// Get audio file (for playback)
audioRouter.get('/play/:key(*)', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const userId = user.google_user_data?.sub || (user as any).firebase_user_id;
    const key = c.req.param('key');

    if (!key) {
      return c.json({ error: 'File key is required' }, 400);
    }

    // Verify that the file belongs to the user
    if (!key.startsWith(`voice_notes/${userId}/`)) {
      return c.json({ error: 'Unauthorized access to file' }, 403);
    }

    // Get file from R2
    const object = await c.env.R2_BUCKET.get(key);

    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get file data
    const arrayBuffer = await object.arrayBuffer();
    const contentType = object.httpMetadata?.contentType || 'audio/webm';

    // Return audio file with proper headers
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Error in GET /api/audio/play:', error);
    return c.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, 500);
  }
});

