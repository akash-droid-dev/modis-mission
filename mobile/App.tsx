import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { uploadRecordingMobile } from './src/lib/supabase';

const MAX_DURATION = 120;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type AppState = 'consent' | 'permissions' | 'idle' | 'recording' | 'uploading' | 'success' | 'error';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

// ─── Consent Screen ───
function ConsentScreen({ onAccept }: { onAccept: () => void }) {
  return (
    <SafeAreaView style={styles.consentContainer}>
      <ScrollView contentContainerStyle={styles.consentContent}>
        <View style={styles.consentIconWrap}>
          <Text style={styles.consentIcon}>🎥</Text>
        </View>
        <Text style={styles.consentTitle}>Before You Record</Text>
        <Text style={styles.consentText}>
          This app will access your camera and microphone to record a video message.
        </Text>

        <View style={styles.consentBox}>
          <Text style={styles.consentBoxTitle}>Your privacy matters:</Text>
          <Text style={styles.consentBoxItem}>• Your recording will be securely stored</Text>
          <Text style={styles.consentBoxItem}>• Reviewed by authorized administrators only</Text>
          <Text style={styles.consentBoxItem}>• Maximum recording: {MAX_DURATION} seconds</Text>
          <Text style={styles.consentBoxItem}>• You can re-record if not satisfied</Text>
        </View>

        <Text style={styles.consentDisclaimer}>
          By proceeding, you consent to being recorded and your video being stored for review.
        </Text>

        <TouchableOpacity style={styles.consentButton} onPress={onAccept} activeOpacity={0.8}>
          <Text style={styles.consentButtonText}>I Understand — Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function App() {
  const [appState, setAppState] = useState<AppState>('consent');
  const [elapsed, setElapsed] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const cameraRef = useRef<CameraView>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);
  const recordingUriRef = useRef<string | null>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Request permissions
  const handleRequestPermissions = async () => {
    const camResult = await requestCameraPermission();
    const micResult = await requestMicPermission();

    if (camResult.granted && micResult.granted) {
      setAppState('idle');
    } else {
      Alert.alert(
        'Permissions Required',
        'Camera and microphone access are needed to record your message. Please enable them in Settings.',
        [{ text: 'Try Again', onPress: handleRequestPermissions }]
      );
    }
  };

  const handleConsent = () => {
    if (cameraPermission?.granted && micPermission?.granted) {
      setAppState('idle');
    } else {
      setAppState('permissions');
      handleRequestPermissions();
    }
  };

  // Start recording
  const startRecording = async () => {
    if (!cameraRef.current) return;

    setElapsed(0);
    setAppState('recording');
    startTimeRef.current = Date.now();

    // Start timer
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);
      if (secs >= MAX_DURATION) {
        stopRecording();
      }
    }, 250);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION,
      });
      if (video?.uri) {
        recordingUriRef.current = video.uri;
        handleUpload(video.uri);
      }
    } catch (err: any) {
      console.error('Recording error:', err);
      setErrorMsg(err.message || 'Recording failed');
      setAppState('error');
    }
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cameraRef.current?.stopRecording();
  }, []);

  // Upload
  const handleUpload = async (uri: string) => {
    setAppState('uploading');
    setUploadProgress(0);

    try {
      await uploadRecordingMobile(uri, elapsed, (pct) => {
        setUploadProgress(pct);
      });
      setAppState('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed');
      setAppState('error');
    }
  };

  const resetState = () => {
    setAppState('idle');
    setElapsed(0);
    setUploadProgress(0);
    setErrorMsg('');
    recordingUriRef.current = null;
  };

  // ─── Consent Screen ───
  if (appState === 'consent') {
    return <ConsentScreen onAccept={handleConsent} />;
  }

  // ─── Permissions Screen ───
  if (appState === 'permissions') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permContainer}>
          <ActivityIndicator size="large" color="#FF9933" />
          <Text style={styles.permText}>Requesting camera & microphone access...</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={handleRequestPermissions}>
            <Text style={styles.retryBtnText}>Grant Permissions</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1C" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Modi's Mission</Text>
        <Text style={styles.headerSub}>Share your vision for a stronger India</Text>
      </View>

      {/* Brand Image */}
      <View style={styles.brandWrap}>
        <Image
          source={require('./assets/brand-cover.jpg')}
          style={styles.brandImage}
          resizeMode="cover"
        />
      </View>

      {/* Camera Mirror */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="front"
          mirror={true}
          mode="video"
        />

        {/* Recording indicator */}
        {appState === 'recording' && (
          <>
            {/* Duration bar */}
            <View style={styles.durationBar}>
              <View style={[styles.durationFill, { width: `${(elapsed / MAX_DURATION) * 100}%` }]} />
            </View>

            {/* REC badge */}
            <View style={styles.recBadge}>
              <View style={styles.recDot} />
              <Text style={styles.recText}>REC</Text>
            </View>

            {/* Timer */}
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
              <Text style={styles.timerMax}> / {formatTime(MAX_DURATION)}</Text>
            </View>
          </>
        )}

        {/* Upload/Success/Error Overlay */}
        {(appState === 'uploading' || appState === 'success' || appState === 'error') && (
          <View style={styles.overlay}>
            {appState === 'uploading' && (
              <>
                <ActivityIndicator size="large" color="#FF9933" />
                <Text style={styles.overlayTitle}>Uploading...</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                </View>
                <Text style={styles.overlaySmall}>{uploadProgress}% complete</Text>
              </>
            )}
            {appState === 'success' && (
              <>
                <Text style={styles.successIcon}>✓</Text>
                <Text style={styles.overlayTitle}>Recorded Successfully!</Text>
                <Text style={styles.overlaySmall}>Your vision has been submitted.</Text>
                <TouchableOpacity style={styles.overlayBtn} onPress={resetState}>
                  <Text style={styles.overlayBtnText}>Record Another</Text>
                </TouchableOpacity>
              </>
            )}
            {appState === 'error' && (
              <>
                <Text style={styles.errorIcon}>✕</Text>
                <Text style={styles.overlayTitle}>Upload Failed</Text>
                <Text style={styles.errorText}>{errorMsg}</Text>
                <View style={styles.errorBtns}>
                  <TouchableOpacity
                    style={styles.overlayBtn}
                    onPress={() => recordingUriRef.current && handleUpload(recordingUriRef.current)}
                  >
                    <Text style={styles.overlayBtnText}>Retry</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.overlayBtnSecondary} onPress={resetState}>
                    <Text style={styles.overlayBtnSecondaryText}>Discard</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        )}

        {/* Record Button (bottom-right) */}
        {(appState === 'idle' || appState === 'recording') && (
          <View style={styles.recordBtnWrap}>
            <TouchableOpacity
              style={[styles.recordBtn, appState === 'recording' && styles.recordBtnRecording]}
              onPress={appState === 'recording' ? stopRecording : startRecording}
              activeOpacity={0.7}
            >
              {appState === 'recording' ? (
                <View style={styles.stopIcon} />
              ) : (
                <View style={styles.recordIcon} />
              )}
            </TouchableOpacity>
            <Text style={styles.recordLabel}>
              {appState === 'recording' ? 'Tap to Stop' : 'Tap to Record'}
            </Text>
          </View>
        )}
      </View>

      {/* Note */}
      <Text style={styles.noteText}>
        Record your <Text style={styles.noteHighlight}>Vision</Text> for Modi's Mission
      </Text>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════
// STYLES
// ═══════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1C',
  },

  // Header
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FF9933',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  // Brand
  brandWrap: {
    alignItems: 'center',
    marginVertical: 8,
  },
  brandImage: {
    width: 120,
    height: 180,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,153,51,0.2)',
  },

  // Camera
  cameraContainer: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.3)',
    position: 'relative',
  },
  camera: {
    flex: 1,
  },

  // Duration bar
  durationBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(30,41,59,0.8)',
  },
  durationFill: {
    height: '100%',
    backgroundColor: '#FF9933',
  },

  // REC badge
  recBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  recDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  recText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F87171',
    fontFamily: 'monospace',
  },

  // Timer
  timerBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F87171',
    fontFamily: 'monospace',
  },
  timerMax: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 8,
  },
  overlaySmall: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  overlayBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,153,51,0.2)',
    borderRadius: 10,
  },
  overlayBtnText: {
    color: '#FF9933',
    fontSize: 14,
    fontWeight: '600',
  },
  overlayBtnSecondary: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: 'rgba(71,85,105,0.3)',
    borderRadius: 10,
  },
  overlayBtnSecondaryText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
  },

  // Progress
  progressBar: {
    width: '80%',
    height: 6,
    backgroundColor: 'rgba(51,65,85,0.5)',
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF9933',
    borderRadius: 3,
  },

  // Success/Error icons
  successIcon: {
    fontSize: 40,
    color: '#22C55E',
    fontWeight: '800',
  },
  errorIcon: {
    fontSize: 40,
    color: '#EF4444',
    fontWeight: '800',
  },
  errorText: {
    color: '#F87171',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  errorBtns: {
    alignItems: 'center',
  },

  // Record button
  recordBtnWrap: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    alignItems: 'center',
  },
  recordBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FF9933',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,153,51,0.4)',
    shadowColor: '#FF9933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordBtnRecording: {
    backgroundColor: '#EF4444',
    borderColor: 'rgba(239,68,68,0.4)',
    shadowColor: '#EF4444',
  },
  recordIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF',
  },
  stopIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  recordLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
    fontWeight: '500',
  },

  // Note
  noteText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    paddingVertical: 12,
  },
  noteHighlight: {
    color: '#FF9933',
    fontWeight: '600',
  },

  // Consent
  consentContainer: {
    flex: 1,
    backgroundColor: '#0A0F1C',
  },
  consentContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
  },
  consentIconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,153,51,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  consentIcon: {
    fontSize: 26,
  },
  consentTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF9933',
    textAlign: 'center',
    marginBottom: 12,
  },
  consentText: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  consentBox: {
    backgroundColor: 'rgba(17,24,39,0.8)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(71,85,105,0.3)',
    marginBottom: 16,
  },
  consentBoxTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 8,
  },
  consentBoxItem: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
  consentDisclaimer: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
  },
  consentButton: {
    backgroundColor: '#FF9933',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FF9933',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  consentButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Permissions
  permContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permText: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#FF9933',
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
