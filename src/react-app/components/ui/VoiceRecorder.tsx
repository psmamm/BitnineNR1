import { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildApiUrl } from '../../hooks/useApi';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string, audioUrl: string) => void;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'uploading';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

export default function VoiceRecorder({ onTranscriptionComplete, className = '' }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'error' });
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'error' });
    }, 3000);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop recording if component unmounts
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('MediaRecorder API is not supported in this browser');
      }

      // Determine MIME type (prefer webm with opus codec, fallback for Safari)
      let selectedMimeType = '';
      
      // Check for webm with opus codec first (best quality, widely supported)
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        selectedMimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        selectedMimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        // Fallback for Safari
        selectedMimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        selectedMimeType = 'audio/ogg;codecs=opus';
      } else {
        // Last resort: use default (browser will choose)
        console.warn('No preferred MIME type supported, using browser default');
        selectedMimeType = '';
      }

      console.log('Selected MIME type:', selectedMimeType || 'browser default');

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMimeType || undefined,
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Create blob from chunks
        const finalMimeType = selectedMimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, {
          type: finalMimeType,
        });

        console.log('Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length,
        });

        // Upload and transcribe
        await uploadAndTranscribe(audioBlob, finalMimeType);
      };

      // Handle errors
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setState('idle');
        showToast('Recording error occurred', 'error');
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setState('recording');

    } catch (err) {
      console.error('Error starting recording:', err);
      let errorMessage = 'Failed to start recording';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorMessage = 'Microphone permission denied. Please allow microphone access.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorMessage = 'Microphone is already in use by another application.';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      setState('idle');
      showToast(errorMessage, 'error');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setState('uploading');
    }
  };

  // Upload and transcribe audio
  const uploadAndTranscribe = async (audioBlob: Blob, mimeType: string) => {
    try {
      setState('uploading');
      setError(null);

      // Create FormData
      const formData = new FormData();
      const fileExtension = mimeType.includes('webm') ? 'webm' : 
                           mimeType.includes('ogg') ? 'ogg' : 
                           mimeType.includes('mp4') ? 'mp4' : 
                           mimeType.includes('mpeg') ? 'mp3' : 'webm';
      
      // Create File object with proper MIME type
      const audioFile = new File([audioBlob], `recording.${fileExtension}`, {
        type: mimeType,
      });
      
      formData.append('audio', audioFile);
      
      console.log('Uploading audio:', {
        size: audioFile.size,
        type: audioFile.type,
        name: audioFile.name,
      });

      // Send to API
      const response = await fetch(buildApiUrl('/api/audio/upload'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Upload failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        // Call callback with transcription and audio URL
        onTranscriptionComplete(result.text || '', result.audioUrl || '');
        setState('idle');
        showToast('Audio transcribed successfully!', 'success');
      } else {
        throw new Error(result.error || 'Transcription failed');
      }

    } catch (err) {
      console.error('Error uploading/transcribing audio:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload or transcribe audio';
      setError(errorMessage);
      setState('idle');
      showToast(errorMessage, 'error');
    }
  };

  // Handle button click
  const handleClick = () => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
    // uploading state: button is disabled
  };

  // Get button content based on state
  const getButtonContent = () => {
    switch (state) {
      case 'recording':
        return <Square className="w-5 h-5" />;
      case 'uploading':
        return <Loader2 className="w-5 h-5 animate-spin" />;
      default:
        return <Mic className="w-5 h-5" />;
    }
  };

  // Get button classes based on state
  const getButtonClasses = () => {
    const baseClasses = 'relative flex items-center justify-center w-12 h-12 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    if (state === 'recording') {
      return `${baseClasses} bg-red-500/20 text-red-500 hover:bg-red-500/30 ring-1 ring-red-500`;
    } else if (state === 'uploading') {
      return `${baseClasses} bg-zinc-700 text-zinc-400 cursor-wait`;
    } else {
      return `${baseClasses} bg-zinc-800 text-zinc-300 hover:bg-zinc-700`;
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={state === 'uploading'}
        className={`${getButtonClasses()} ${className}`}
        aria-label={state === 'recording' ? 'Stop recording' : state === 'uploading' ? 'Uploading...' : 'Start recording'}
      >
        {getButtonContent()}
        
        {/* Pulsing animation for recording state */}
        {state === 'recording' && (
          <motion.div
            className="absolute inset-0 rounded-lg bg-red-500/20"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </button>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[200] transform -translate-x-1/2"
          >
            <div className={`${
              toast.type === 'success' 
                ? 'bg-[#2ECC71] text-white' 
                : 'bg-[#E74C3C] text-white'
            } px-6 py-4 rounded-lg shadow-2xl flex items-center space-x-3`}>
              <div className={`w-2 h-2 bg-white rounded-full ${
                toast.type === 'success' ? 'animate-pulse' : ''
              }`} />
              <span className="font-semibold">{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

