'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRecorder, RecordingState } from '@/hooks/useRecorder';
import { uploadRecording } from '@/lib/supabase';
import Image from 'next/image';

const MAX_DURATION = 120;

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Consent Modal ───
function ConsentModal({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-bg-card border border-saffron/20 rounded-2xl p-6 md:p-8 max-w-md w-full animate-[fade-slide-up_0.4s_ease-out]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-saffron/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-saffron" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-display font-bold gradient-text">Before You Record</h2>
        </div>

        <div className="space-y-3 text-sm text-slate-300 mb-6">
          <p>This app will access your <strong className="text-white">camera</strong> and <strong className="text-white">microphone</strong> to record a video message.</p>
          <div className="bg-bg/60 rounded-lg p-3 border border-slate-700/50">
            <p className="font-medium text-slate-200 mb-1">Your privacy matters:</p>
            <ul className="space-y-1 text-xs text-slate-400">
              <li>• Your recording will be securely stored</li>
              <li>• Recordings are reviewed by authorized administrators only</li>
              <li>• Maximum recording length: {MAX_DURATION} seconds</li>
              <li>• You can re-record if not satisfied</li>
            </ul>
          </div>
          <p className="text-xs text-slate-500">By proceeding, you consent to being recorded and your video being stored for review.</p>
        </div>

        <button
          onClick={onAccept}
          className="w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-300
                     bg-gradient-to-r from-saffron to-saffron-dark hover:from-saffron-dark hover:to-saffron
                     shadow-lg shadow-saffron/25 hover:shadow-saffron/40 active:scale-[0.98]"
        >
          I Understand — Continue
        </button>
      </div>
    </div>
  );
}

// ─── Record Button ───
function RecordButton({
  recordingState,
  elapsed,
  onStart,
  onStop,
}: {
  recordingState: RecordingState;
  elapsed: number;
  onStart: () => void;
  onStop: () => void;
}) {
  const isRecording = recordingState === 'recording';
  const remaining = MAX_DURATION - elapsed;

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Timer display */}
      {isRecording && (
        <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-full px-4 py-1.5 border border-red-500/40">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 timer-blink" />
          <span className="font-mono text-sm text-red-400 font-medium">
            {formatTime(elapsed)}
          </span>
          <span className="text-[10px] text-slate-500">/ {formatTime(MAX_DURATION)}</span>
        </div>
      )}

      {/* Button */}
      <button
        onClick={isRecording ? onStop : onStart}
        disabled={recordingState === 'uploading' || recordingState === 'requesting'}
        className={`
          relative w-16 h-16 md:w-20 md:h-20 rounded-full transition-all duration-300
          flex items-center justify-center
          ${isRecording
            ? 'bg-red-600 hover:bg-red-700 rec-pulse'
            : 'bg-gradient-to-br from-saffron to-saffron-dark hover:from-saffron-dark hover:to-saffron shadow-lg shadow-saffron/30'
          }
          ${(recordingState === 'uploading' || recordingState === 'requesting') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
        `}
      >
        {isRecording ? (
          <div className="w-6 h-6 md:w-7 md:h-7 rounded-sm bg-white" />
        ) : (
          <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white" />
        )}

        {/* Outer ring */}
        <div className={`absolute inset-[-4px] rounded-full border-2 ${
          isRecording ? 'border-red-400/50' : 'border-saffron/40'
        }`} />
      </button>

      {/* Label */}
      <span className="text-[11px] text-slate-400 font-medium">
        {isRecording ? 'Tap to Stop' : recordingState === 'idle' ? 'Tap to Record' : ''}
      </span>
    </div>
  );
}

// ─── Upload Status Overlay ───
function UploadOverlay({ state, progress, error, onRetry, onReset }: {
  state: RecordingState;
  progress: number;
  error: string | null;
  onRetry: () => void;
  onReset: () => void;
}) {
  if (state !== 'stopped' && state !== 'uploading' && state !== 'success' && state !== 'error') return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl">
      <div className="text-center p-6 max-w-xs">
        {state === 'uploading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-saffron/30 border-t-saffron animate-spin" />
            <p className="text-white font-semibold mb-1">Uploading...</p>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-gradient-to-r from-saffron to-gold transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">{progress}% complete</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold text-lg mb-1">Recorded Successfully!</p>
            <p className="text-sm text-slate-400 mb-4">Your vision has been submitted.</p>
            <button onClick={onReset}
              className="px-5 py-2 bg-saffron/20 text-saffron rounded-lg text-sm font-medium hover:bg-saffron/30 transition-colors">
              Record Another
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-white font-semibold mb-1">Upload Failed</p>
            <p className="text-sm text-red-300 mb-4">{error || 'Something went wrong.'}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={onRetry}
                className="px-4 py-2 bg-saffron/20 text-saffron rounded-lg text-sm font-medium hover:bg-saffron/30 transition-colors">
                Retry
              </button>
              <button onClick={onReset}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-600 transition-colors">
                Discard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════
export default function HomePage() {
  const [showConsent, setShowConsent] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const {
    state,
    error: recorderError,
    elapsed,
    videoRef,
    startRecording,
    stopRecording,
    getRecordedBlob,
    resetState,
    hasPermission,
    requestPermission,
  } = useRecorder(MAX_DURATION);

  // Auto-upload when recording stops
  useEffect(() => {
    if (state === 'stopped' && !isUploading) {
      handleUpload();
    }
  }, [state]);

  const handleAcceptConsent = async () => {
    setShowConsent(false);
    await requestPermission();
  };

  const handleUpload = async () => {
    const blob = getRecordedBlob();
    if (!blob || isUploading) return;

    setIsUploading(true);
    setUploadProgress(10);
    setUploadError(null);

    try {
      // Simulate smooth progress
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 5, 75));
      }, 200);

      await uploadRecording(blob, 'web', elapsed, (pct) => {
        setUploadProgress(pct);
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Brief delay to show 100%
      setTimeout(() => {
        // Force state to success via a workaround (state managed in hook)
        setIsUploading(false);
      }, 500);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      setIsUploading(false);
    }
  };

  // Derive display state
  const displayState: RecordingState = isUploading
    ? 'uploading'
    : uploadProgress === 100 && state === 'stopped'
    ? 'success'
    : uploadError
    ? 'error'
    : state;

  const handleReset = () => {
    resetState();
    setUploadProgress(0);
    setUploadError(null);
    setIsUploading(false);
  };

  return (
    <main className="min-h-screen bg-bg relative overflow-hidden">
      {/* Background gradient decoration */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-saffron/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-teal/5 rounded-full blur-[100px]" />
      </div>

      {/* Consent modal */}
      {showConsent && <ConsentModal onAccept={handleAcceptConsent} />}

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* ─── Header ─── */}
        <header className="text-center mb-6 md:mb-8 page-enter">
          <h1 className="font-display text-3xl md:text-5xl font-bold gradient-text tracking-tight">
            Modi&apos;s Mission
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-2 font-light">
            Share your vision for a stronger India
          </p>
        </header>

        {/* ─── Main Content ─── */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          {/* Left: Brand Image Card (visible on lg+) */}
          <div className="hidden lg:block w-64 xl:w-72 flex-shrink-0 page-enter" style={{ animationDelay: '0.2s' }}>
            <div className="brand-image-wrapper">
              <Image
                src="/brand-cover.jpg"
                alt="Modi's Mission"
                width={280}
                height={420}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-3 italic">
              Record your vision for Modi&apos;s Mission
            </p>
          </div>

          {/* Center: Mirror + Controls */}
          <div className="flex-1 w-full max-w-2xl mx-auto">
            {/* Brand image banner (mobile/tablet only) */}
            <div className="lg:hidden mb-4 page-enter" style={{ animationDelay: '0.1s' }}>
              <div className="brand-image-wrapper max-w-[200px] mx-auto">
                <Image
                  src="/brand-cover.jpg"
                  alt="Modi's Mission"
                  width={200}
                  height={300}
                  className="w-full h-auto object-cover"
                  priority
                />
              </div>
            </div>

            {/* Mirror Container */}
            <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-700/50 shadow-2xl shadow-black/50 page-enter"
                 style={{ animationDelay: '0.15s' }}>
              {/* Video element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[4/3] md:aspect-video object-cover mirror-video bg-slate-900"
              />

              {/* Recording indicator */}
              {displayState === 'recording' && (
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 z-20">
                  <div className="w-2 h-2 rounded-full bg-red-500 timer-blink" />
                  <span className="text-xs font-mono text-red-400 font-medium">REC</span>
                </div>
              )}

              {/* Duration bar at top */}
              {displayState === 'recording' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800/80 z-20">
                  <div
                    className="h-full bg-gradient-to-r from-saffron to-red-500 transition-all duration-1000"
                    style={{ width: `${(elapsed / MAX_DURATION) * 100}%` }}
                  />
                </div>
              )}

              {/* Permission prompt overlay */}
              {!hasPermission && !showConsent && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-card/90 z-20">
                  <div className="text-center p-6">
                    <svg className="w-12 h-12 mx-auto mb-3 text-saffron/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-slate-300 mb-4 text-sm">Camera access is needed to continue</p>
                    <button
                      onClick={requestPermission}
                      className="px-5 py-2.5 bg-saffron text-white rounded-lg text-sm font-semibold hover:bg-saffron-dark transition-colors"
                    >
                      Enable Camera
                    </button>
                    {recorderError && (
                      <p className="text-red-400 text-xs mt-3 max-w-xs mx-auto">{recorderError}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Upload overlay */}
              <UploadOverlay
                state={displayState}
                progress={uploadProgress}
                error={uploadError}
                onRetry={handleUpload}
                onReset={handleReset}
              />

              {/* Record button (bottom-right) */}
              {hasPermission && displayState !== 'uploading' && displayState !== 'success' && displayState !== 'error' && (
                <div className="absolute bottom-4 right-4 z-20">
                  <RecordButton
                    recordingState={displayState}
                    elapsed={elapsed}
                    onStart={startRecording}
                    onStop={stopRecording}
                  />
                </div>
              )}
            </div>

            {/* Note text */}
            <p className="text-center text-slate-400 text-sm md:text-base mt-4 font-light page-enter"
               style={{ animationDelay: '0.3s' }}>
              Record your <span className="text-saffron font-medium">Vision</span> for Modi&apos;s Mission
            </p>

            {/* Error display */}
            {recorderError && displayState === 'idle' && (
              <p className="text-center text-red-400 text-xs mt-2">{recorderError}</p>
            )}
          </div>
        </div>

        {/* ─── Footer ─── */}
        <footer className="text-center mt-10 md:mt-14 pb-4 page-enter" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-center gap-4 text-xs text-slate-600">
            <a href="/admin" className="hover:text-slate-400 transition-colors">Admin Panel</a>
            <span>•</span>
            <span>Built for India</span>
          </div>
        </footer>
      </div>
    </main>
  );
}
