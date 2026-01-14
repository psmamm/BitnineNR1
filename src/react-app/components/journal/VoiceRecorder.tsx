import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { buildApiUrl } from '../../hooks/useApi';

// ============================================================================
// TYPES
// ============================================================================

interface EmotionAnalysis {
  primary_emotion: string;
  sentiment: number;
  confidence_level: number;
  stress_indicators: boolean;
  trading_state: 'focused' | 'anxious' | 'overconfident' | 'fearful' | 'neutral' | 'tilt';
}

interface VoiceRecorderProps {
  tradeId?: string;
  onUploadComplete?: (entry: {
    id: string;
    audio_url: string;
    duration_seconds: number;
    emotion_analysis?: EmotionAnalysis;
  }) => void;
  onError?: (error: string) => void;
  maxDuration?: number; // in seconds
  autoAnalyze?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'recorded' | 'uploading' | 'analyzing';

// ============================================================================
// COMPONENT
// ============================================================================

export function VoiceRecorder({
  tradeId,
  onUploadComplete,
  onError,
  maxDuration = 300, // 5 minutes default
  autoAnalyze = true,
}: VoiceRecorderProps) {
  // Recording state
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [emotionResult, setEmotionResult] = useState<EmotionAnalysis | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Waveform visualization
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);

  // ============================================================================
  // RECORDING LOGIC
  // ============================================================================

  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup analyzer for visualization
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAudioBlob(blob);
        setState('recorded');

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second

      setState('recording');
      setDuration(0);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setDuration((prev) => {
          if (prev >= maxDuration - 1) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      // Start visualization
      visualize();
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check permissions.');
      onError?.('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    }
  };

  const discardRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setDuration(0);
    setEmotionResult(null);
    setState('idle');
  };

  // ============================================================================
  // VISUALIZATION
  // ============================================================================

  const visualize = useCallback(() => {
    const canvas = canvasRef.current;
    const analyzer = analyzerRef.current;

    if (!canvas || !analyzer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (state !== 'recording') return;

      animationRef.current = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#0F0F12';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient from primary to success
        const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
        gradient.addColorStop(0, '#A855F7');
        gradient.addColorStop(1, '#10B981');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }, [state]);

  // ============================================================================
  // UPLOAD
  // ============================================================================

  const uploadRecording = async () => {
    if (!audioBlob) return;

    setState('uploading');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('duration_seconds', duration.toString());
      if (tradeId) {
        formData.append('trade_id', tradeId);
      }

      const response = await fetch(buildApiUrl('/api/voice-journal/upload'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to upload recording');
      }

      const data = await response.json();

      if (autoAnalyze) {
        setState('analyzing');

        // Request emotion analysis
        const analyzeResponse = await fetch(
          `/api/voice-journal/${data.entry.id}/analyze-emotions`,
          {
            method: 'POST',
            credentials: 'include',
          }
        );

        if (analyzeResponse.ok) {
          const analyzeData = await analyzeResponse.json();
          if (analyzeData.emotion_analysis) {
            setEmotionResult(analyzeData.emotion_analysis);
          }
        }
      }

      onUploadComplete?.({
        id: data.entry.id,
        audio_url: data.entry.audio_url,
        duration_seconds: duration,
        emotion_analysis: emotionResult || undefined,
      });

      setState('idle');
      discardRecording();
    } catch (err) {
      console.error('Error uploading recording:', err);
      setError('Failed to upload recording. Please try again.');
      setState('recorded');
      onError?.('Failed to upload recording');
    }
  };

  // ============================================================================
  // PREVIEW PLAYBACK
  // ============================================================================

  const togglePreview = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlayingPreview) {
      audioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  useEffect(() => {
    if (audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlayingPreview(false);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [audioUrl]);

  // ============================================================================
  // CLEANUP
  // ============================================================================

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ============================================================================
  // RENDER
  // ============================================================================

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="glass overflow-hidden">
      <CardContent className="p-6">
        {/* Error display */}
        {error && (
          <div className="flex items-center gap-2 text-danger bg-danger/10 px-4 py-2 rounded-lg mb-4">
            <AlertCircle size={16} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Main content */}
        <div className="space-y-4">
          {/* Visualization / Preview */}
          <div className="relative h-24 bg-dark-base rounded-lg overflow-hidden">
            {state === 'recording' ? (
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                width={400}
                height={96}
              />
            ) : state === 'recorded' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <CheckCircle2 className="mx-auto text-success mb-2\" size={24} />
                  <p className="text-sm text-zinc-400">
                    Recording ready ({formatDuration(duration)})
                  </p>
                </div>
              </div>
            ) : state === 'uploading' || state === 'analyzing' ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="mx-auto text-primary-400 animate-spin mb-2" size={24} />
                  <p className="text-sm text-zinc-400">
                    {state === 'uploading' ? 'Uploading...' : 'Analyzing emotions...'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Mic className="mx-auto text-zinc-600 mb-2" size={24} />
                  <p className="text-sm text-zinc-500">Click to start recording</p>
                </div>
              </div>
            )}

            {/* Recording indicator */}
            {state === 'recording' && (
              <div className="absolute top-2 right-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
                <span className="text-xs text-zinc-400 font-mono">
                  {formatDuration(duration)} / {formatDuration(maxDuration)}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {state === 'idle' && (
              <Button
                variant="premium"
                size="lg"
                onClick={startRecording}
                className="w-16 h-16 rounded-full"
              >
                <Mic size={24} />
              </Button>
            )}

            {state === 'recording' && (
              <Button
                variant="destructive"
                size="lg"
                onClick={stopRecording}
                className="w-16 h-16 rounded-full"
              >
                <Square size={24} />
              </Button>
            )}

            {state === 'recorded' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={discardRecording}
                  className="text-danger"
                >
                  <Trash2 size={20} />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={togglePreview}
                >
                  {isPlayingPreview ? <Pause size={20} /> : <Play size={20} />}
                </Button>

                <Button
                  variant="premium"
                  onClick={uploadRecording}
                  className="px-6"
                >
                  <Upload size={18} className="mr-2" />
                  Save & Analyze
                </Button>
              </>
            )}
          </div>

          {/* Emotion result */}
          {emotionResult && (
            <div className="glass p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="text-primary-400" size={16} />
                <span className="text-sm font-medium">Emotion Analysis</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500">Primary Emotion</p>
                  <p className="text-sm font-medium capitalize">
                    {emotionResult.primary_emotion}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Trading State</p>
                  <p
                    className={`text-sm font-medium capitalize ${
                      emotionResult.trading_state === 'focused'
                        ? 'text-success'
                        : emotionResult.trading_state === 'tilt'
                        ? 'text-danger'
                        : 'text-warning'
                    }`}
                  >
                    {emotionResult.trading_state}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Sentiment</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-dark-overlay rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          emotionResult.sentiment >= 0 ? 'bg-success' : 'bg-danger'
                        }`}
                        style={{
                          width: `${Math.abs(emotionResult.sentiment) * 50 + 50}%`,
                          marginLeft:
                            emotionResult.sentiment < 0
                              ? `${50 - Math.abs(emotionResult.sentiment) * 50}%`
                              : '50%',
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono">
                      {emotionResult.sentiment > 0 ? '+' : ''}
                      {(emotionResult.sentiment * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-zinc-500">Stress Level</p>
                  <p
                    className={`text-sm font-medium ${
                      emotionResult.stress_indicators ? 'text-danger' : 'text-success'
                    }`}
                  >
                    {emotionResult.stress_indicators ? 'High' : 'Normal'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="text-xs text-zinc-500 text-center">
            {state === 'idle' && (
              <p>
                Record your thoughts about this trade. AI will analyze your emotions.
              </p>
            )}
            {state === 'recording' && (
              <p>Speak clearly about your trade, emotions, and observations.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default VoiceRecorder;







