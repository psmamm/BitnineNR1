/**
 * Hume Voice Journal Component
 * 
 * Enhanced voice journaling with real-time emotion detection using Hume AI EVI.
 * Records audio during open positions and correlates emotions with PnL.
 */

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { buildApiUrl } from '../../hooks/useApi';
import { useTheme } from '../../contexts/ThemeContext';
import { getCardBg, getCardBorder, getTextColor } from '../../utils/themeUtils';

interface HumeVoiceJournalProps {
  positionId: string;
  currentPnL: number;
  positionSize: number;
  entryPrice: number;
  currentPrice: number;
  onAnalysisComplete?: (analysis: any) => void;
}

interface EmotionDisplay {
  name: string;
  score: number;
  color: string;
}

export default function HumeVoiceJournal({
  positionId,
  currentPnL,
  positionSize,
  entryPrice,
  currentPrice,
  onAnalysisComplete
}: HumeVoiceJournalProps) {
  const { theme } = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalysis, setLastAnalysis] = useState<any>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await analyzeAndStore(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);

      // Start timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // Analyze and store emotion data
  const analyzeAndStore = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Convert blob to base64 for JSON transmission
      // Note: In production, you might want to use FormData instead
      const formData = new FormData();
      formData.append('audioBlob', audioBlob, 'recording.webm');
      formData.append('positionId', positionId);
      formData.append('currentPnL', currentPnL.toString());
      formData.append('positionSize', positionSize.toString());
      formData.append('entryPrice', entryPrice.toString());
      formData.append('currentPrice', currentPrice.toString());

      const response = await fetch(buildApiUrl('/api/emotion-logs'), {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to analyze emotion');
      }

      const data = await response.json();
      setLastAnalysis(data.analysis);
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data.analysis);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze emotion');
    } finally {
      setIsAnalyzing(false);
      setRecordingTime(0);
    }
  };

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get emotion color
  const getEmotionColor = (emotion: string, score: number): string => {
    // High stress/fear = red, positive emotions = green
    if (emotion.toLowerCase().includes('stress') || emotion.toLowerCase().includes('fear') || emotion.toLowerCase().includes('anxiety')) {
      return score > 0.5 ? '#f6465d' : '#f6465d80';
    }
    if (emotion.toLowerCase().includes('joy') || emotion.toLowerCase().includes('confidence') || emotion.toLowerCase().includes('calm')) {
      return score > 0.5 ? '#2ead65' : '#2ead6580';
    }
    return '#848e9c';
  };

  return (
    <div className={`${getCardBg(theme)} rounded-lg border ${getCardBorder(theme)} p-4`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`${getTextColor(theme, 'primary')} font-semibold text-sm`}>
            Voice Journal with Emotion Analysis
          </h3>
          <p className={`${getTextColor(theme, 'muted')} text-xs mt-1`}>
            Record your thoughts during the trade. Emotions will be analyzed in real-time.
          </p>
        </div>
      </div>

      {/* Recording Controls */}
      <div className="flex items-center gap-4 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-[#f6465d] hover:bg-[#d93d52] disabled:bg-[#2b3139] disabled:text-[#848e9c] text-white rounded-lg transition-colors"
          >
            <Mic className="w-4 h-4" />
            <span>Start Recording</span>
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 bg-[#2b3139] hover:bg-[#1e2026] text-[#eaecef] rounded-lg transition-colors"
          >
            <Square className="w-4 h-4" />
            <span>Stop Recording</span>
          </button>
        )}

        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#f6465d] rounded-full animate-pulse" />
            <span className={`${getTextColor(theme, 'secondary')} text-sm`}>
              Recording: {formatTime(recordingTime)}
            </span>
          </div>
        )}

        {isAnalyzing && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#f0b90b]/30 border-t-[#f0b90b] rounded-full animate-spin" />
            <span className={`${getTextColor(theme, 'secondary')} text-sm`}>
              Analyzing emotions...
            </span>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-[#f6465d]/10 border border-[#f6465d]/30 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-[#f6465d] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-[#f6465d] text-sm font-medium">Error</div>
            <div className="text-[#f6465d]/80 text-xs mt-1">{error}</div>
          </div>
        </div>
      )}

      {/* Last Analysis Results */}
      {lastAnalysis && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className={`${getTextColor(theme, 'primary')} font-medium text-sm`}>
              Emotion Analysis
            </h4>
            <div className={`flex items-center gap-1 text-xs ${
              currentPnL >= 0 ? 'text-[#2ead65]' : 'text-[#f6465d]'
            }`}>
              {currentPnL >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>PnL: ${currentPnL.toFixed(2)}</span>
            </div>
          </div>

          {/* Prosody Metrics */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`${getCardBg(theme)} rounded p-2 border ${getCardBorder(theme)}`}>
              <div className={`${getTextColor(theme, 'muted')} text-xs`}>Stress</div>
              <div className={`text-sm font-medium ${
                lastAnalysis.prosody?.stress > 0.5 ? 'text-[#f6465d]' : 'text-[#848e9c]'
              }`}>
                {(lastAnalysis.prosody?.stress * 100).toFixed(0)}%
              </div>
            </div>
            <div className={`${getCardBg(theme)} rounded p-2 border ${getCardBorder(theme)}`}>
              <div className={`${getTextColor(theme, 'muted')} text-xs`}>Hesitation</div>
              <div className={`text-sm font-medium ${
                lastAnalysis.prosody?.hesitation > 0.5 ? 'text-[#f6465d]' : 'text-[#848e9c]'
              }`}>
                {(lastAnalysis.prosody?.hesitation * 100).toFixed(0)}%
              </div>
            </div>
            <div className={`${getCardBg(theme)} rounded p-2 border ${getCardBorder(theme)}`}>
              <div className={`${getTextColor(theme, 'muted')} text-xs`}>Fear</div>
              <div className={`text-sm font-medium ${
                lastAnalysis.prosody?.fear > 0.5 ? 'text-[#f6465d]' : 'text-[#848e9c]'
              }`}>
                {(lastAnalysis.prosody?.fear * 100).toFixed(0)}%
              </div>
            </div>
            <div className={`${getCardBg(theme)} rounded p-2 border ${getCardBorder(theme)}`}>
              <div className={`${getTextColor(theme, 'muted')} text-xs`}>Overconfidence</div>
              <div className={`text-sm font-medium ${
                lastAnalysis.prosody?.overconfidence > 0.5 ? 'text-[#f6465d]' : 'text-[#848e9c]'
              }`}>
                {(lastAnalysis.prosody?.overconfidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Top Emotions */}
          {lastAnalysis.emotions && lastAnalysis.emotions.length > 0 && (
            <div>
              <div className={`${getTextColor(theme, 'muted')} text-xs mb-2`}>Top Emotions</div>
              <div className="space-y-1">
                {lastAnalysis.emotions
                  .sort((a: any, b: any) => b.score - a.score)
                  .slice(0, 5)
                  .map((emotion: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className={`${getTextColor(theme, 'secondary')} text-xs`}>
                        {emotion.name}
                      </span>
                      <div className="flex items-center gap-2 flex-1 mx-2">
                        <div className="flex-1 h-1.5 bg-[#2b3139] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${emotion.score * 100}%`,
                              backgroundColor: getEmotionColor(emotion.name, emotion.score)
                            }}
                          />
                        </div>
                        <span className={`${getTextColor(theme, 'secondary')} text-xs w-8 text-right`}>
                          {(emotion.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
