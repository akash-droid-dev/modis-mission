'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_DURATION = 120; // seconds

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'stopped' | 'uploading' | 'success' | 'error';

interface UseRecorderReturn {
  state: RecordingState;
  error: string | null;
  elapsed: number;
  videoRef: React.RefObject<HTMLVideoElement>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  getRecordedBlob: () => Blob | null;
  resetState: () => void;
  hasPermission: boolean;
  requestPermission: () => Promise<boolean>;
}

export function useRecorder(maxDuration: number = MAX_DURATION): UseRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null!);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      }

      setHasPermission(true);
      setError(null);
      return true;
    } catch (err: any) {
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera & microphone access is required. Please allow permissions and try again.'
          : `Could not access camera: ${err.message}`
      );
      setHasPermission(false);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!streamRef.current) {
      const ok = await requestPermission();
      if (!ok) return;
    }

    chunksRef.current = [];
    blobRef.current = null;
    setElapsed(0);
    setError(null);
    setState('recording');
    startTimeRef.current = Date.now();

    // Determine supported MIME type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ];
    let mimeType = '';
    for (const mt of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mt)) {
        mimeType = mt;
        break;
      }
    }

    try {
      const mr = new MediaRecorder(streamRef.current!, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 2_500_000,
      });

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'video/webm',
        });
        blobRef.current = blob;
        setState('stopped');
      };

      mr.onerror = () => {
        setError('Recording failed. Please try again.');
        setState('error');
      };

      mediaRecorderRef.current = mr;
      mr.start(1000); // collect data every second

      // Timer
      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(secs);
        if (secs >= maxDuration) {
          mr.stop();
          if (timerRef.current) clearInterval(timerRef.current);
        }
      }, 250);
    } catch (err: any) {
      setError(`Recording error: ${err.message}`);
      setState('error');
    }
  }, [maxDuration, requestPermission]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const getRecordedBlob = useCallback(() => blobRef.current, []);

  const resetState = useCallback(() => {
    setState('idle');
    setElapsed(0);
    setError(null);
    blobRef.current = null;
    chunksRef.current = [];
  }, []);

  return {
    state,
    error,
    elapsed,
    videoRef,
    startRecording,
    stopRecording,
    getRecordedBlob,
    resetState,
    hasPermission,
    requestPermission,
  };
}
