/**
 * Hume AI EVI (Empathic Voice Interface) Integration
 * 
 * Analyzes voice audio streams using Speech Prosody Model to detect
 * emotional patterns (stress, hesitation, fear, overconfidence).
 * 
 * Detects 25+ emotion patterns for correlation with trading PnL.
 */

export interface EmotionScore {
  name: string;
  score: number; // 0-1 scale
}

export interface EmotionAnalysis {
  emotions: EmotionScore[];
  prosody: {
    stress: number;        // Voice tremor/stress level
    hesitation: number;    // Pauses and filler words
    fear: number;         // Pitch variation indicating fear
    overconfidence: number; // Speech rate indicating overconfidence
  };
  timestamp: number;
  audioUrl?: string;
}

export interface HumeAIResponse {
  predictions: Array<{
    emotions: Array<{
      name: string;
      score: number;
    }>;
    prosody: {
      stress: number;
      hesitation: number;
      fear: number;
      overconfidence: number;
    };
  }>;
}

/**
 * Analyzes voice emotion from audio stream using Hume AI EVI
 * 
 * @param audioStream - Audio blob/stream to analyze
 * @param apiKey - Hume AI API key
 * @returns Emotion analysis with 25+ emotion patterns
 */
export async function analyzeVoiceEmotion(
  audioStream: Blob,
  apiKey: string
): Promise<EmotionAnalysis> {
  const formData = new FormData();
  formData.append('audio', audioStream, 'recording.webm');

  try {
    // Hume AI EVI API endpoint
    const response = await fetch('https://api.hume.ai/v0/evi/analyze', {
      method: 'POST',
      headers: {
        'X-Hume-Api-Key': apiKey
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Hume AI API error (${response.status}): ${errorText.substring(0, 200)}`);
    }

    const data: HumeAIResponse = await response.json();

    // Extract emotion scores
    const emotions: EmotionScore[] = [];
    let prosody = {
      stress: 0,
      hesitation: 0,
      fear: 0,
      overconfidence: 0
    };

    if (data.predictions && data.predictions.length > 0) {
      const prediction = data.predictions[0];
      
      // Extract all emotions
      if (prediction.emotions) {
        prediction.emotions.forEach(emotion => {
          emotions.push({
            name: emotion.name,
            score: emotion.score
          });
        });
      }

      // Extract prosody metrics
      if (prediction.prosody) {
        prosody = {
          stress: prediction.prosody.stress || 0,
          hesitation: prediction.prosody.hesitation || 0,
          fear: prediction.prosody.fear || 0,
          overconfidence: prediction.prosody.overconfidence || 0
        };
      }
    }

    return {
      emotions,
      prosody,
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Hume AI analysis error:', error);
    throw error;
  }
}

/**
 * Analyzes voice emotion with position context
 * Correlates emotions with current PnL for trigger pattern detection
 */
export interface PositionEmotionAnalysis extends EmotionAnalysis {
  positionId: string;
  currentPnL: number;
  positionSize: number;
  entryPrice: number;
  currentPrice: number;
}

export async function analyzePositionEmotion(
  audioStream: Blob,
  apiKey: string,
  positionId: string,
  currentPnL: number,
  positionSize: number,
  entryPrice: number,
  currentPrice: number
): Promise<PositionEmotionAnalysis> {
  const analysis = await analyzeVoiceEmotion(audioStream, apiKey);

  return {
    ...analysis,
    positionId,
    currentPnL,
    positionSize,
    entryPrice,
    currentPrice
  };
}

/**
 * Detects emotional trigger patterns
 * Identifies correlations between emotions and trading performance
 */
export interface TriggerPattern {
  emotion: string;
  correlation: number; // -1 to 1
  pattern: 'positive' | 'negative' | 'neutral';
  description: string;
}

export function detectTriggerPatterns(
  analyses: PositionEmotionAnalysis[]
): TriggerPattern[] {
  const patterns: TriggerPattern[] = [];

  if (analyses.length < 2) {
    return patterns;
  }

  // Calculate correlations between emotions and PnL
  const emotionScores: Record<string, number[]> = {};
  const pnlValues: number[] = [];

  analyses.forEach(analysis => {
    pnlValues.push(analysis.currentPnL);
    analysis.emotions.forEach(emotion => {
      if (!emotionScores[emotion.name]) {
        emotionScores[emotion.name] = [];
      }
      emotionScores[emotion.name].push(emotion.score);
    });
  });

  // Calculate correlation for each emotion
  Object.keys(emotionScores).forEach(emotionName => {
    const scores = emotionScores[emotionName];
    const correlation = calculateCorrelation(scores, pnlValues);

    let pattern: 'positive' | 'negative' | 'neutral' = 'neutral';
    if (correlation > 0.3) pattern = 'positive';
    if (correlation < -0.3) pattern = 'negative';

    patterns.push({
      emotion: emotionName,
      correlation,
      pattern,
      description: getPatternDescription(emotionName, correlation, pattern)
    });
  });

  return patterns.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

function getPatternDescription(
  emotion: string,
  correlation: number,
  pattern: 'positive' | 'negative' | 'neutral'
): string {
  const absCorr = Math.abs(correlation);
  const strength = absCorr > 0.7 ? 'strong' : absCorr > 0.4 ? 'moderate' : 'weak';

  if (pattern === 'positive') {
    return `${strength} positive correlation: Higher ${emotion} associated with better PnL`;
  } else if (pattern === 'negative') {
    return `${strength} negative correlation: Higher ${emotion} associated with worse PnL`;
  }
  return `No significant correlation between ${emotion} and PnL`;
}
