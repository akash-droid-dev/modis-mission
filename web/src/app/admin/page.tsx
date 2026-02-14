'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { fetchRecordings, getRecordingUrl, deleteRecording } from '@/lib/supabase';

const ADMIN_USERNAME = process.env.NEXT_PUBLIC_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'ModiMission@2026';

// ─── Types ───
interface Recording {
  id: string;
  created_at: string;
  duration_seconds: number;
  file_size_bytes: number;
  device_type: 'web' | 'mobile';
  storage_path: string;
  status: string;
  metadata: Record<string, any>;
}

// ─── Login Screen ───
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 350));

      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        sessionStorage.setItem('admin_token', 'demo-admin-token');
        onLogin();
      } else {
        setError('Invalid credentials');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-saffron/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm bg-bg-card border border-slate-700/50 rounded-2xl p-8 shadow-2xl animate-[fade-slide-up_0.4s_ease-out]">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl font-bold gradient-text mb-1">Admin Panel</h1>
          <p className="text-slate-500 text-sm">Modi&apos;s Mission — Recordings Manager</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-bg border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/25 transition-colors"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e as any)}
              className="w-full px-4 py-2.5 bg-bg border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-saffron/50 focus:ring-1 focus:ring-saffron/25 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !username || !password}
            className="w-full py-3 bg-gradient-to-r from-saffron to-saffron-dark text-white rounded-lg font-semibold text-sm
                       hover:from-saffron-dark hover:to-saffron transition-all duration-300
                       shadow-lg shadow-saffron/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-6">Protected administrative access</p>
      </div>
    </main>
  );
}

// ─── Video Player Modal ───
function VideoPlayer({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <video
          src={url}
          controls
          autoPlay
          className="w-full rounded-xl bg-black shadow-2xl"
        />
      </div>
    </div>
  );
}

// ─── Recording Card ───
function RecordingCard({
  recording,
  onPlay,
  onDelete,
}: {
  recording: Recording;
  onPlay: (url: string) => void;
  onDelete: (id: string, path: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const url = getRecordingUrl(recording.storage_path);
  const date = new Date(recording.created_at);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async () => {
    if (!confirm('Delete this recording permanently?')) return;
    setDeleting(true);
    try {
      await onDelete(recording.id, recording.storage_path);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="group bg-bg-card border border-slate-700/40 rounded-xl overflow-hidden hover:border-saffron/30 transition-all duration-300 hover:shadow-lg hover:shadow-saffron/5">
      {/* Video preview / play area */}
      <div className="relative aspect-video bg-slate-900 cursor-pointer" onClick={() => onPlay(url)}>
        <video src={url} className="w-full h-full object-cover" preload="metadata" />
        
        {/* Play button overlay */}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="w-14 h-14 rounded-full bg-saffron/90 flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Device badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] font-medium text-slate-300">
          {recording.device_type === 'web' ? '🌐 Web' : '📱 Mobile'}
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[10px] font-mono text-slate-300">
          {formatDuration(recording.duration_seconds)}
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-300 font-medium">
              {date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} • {formatSize(recording.file_size_bytes)}
            </p>
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => onPlay(url)}
              className="p-1.5 rounded-lg bg-saffron/10 text-saffron hover:bg-saffron/20 transition-colors"
              title="Play"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ADMIN PAGE
// ═══════════════════════════════════════
export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(false);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, webCount: 0, mobileCount: 0, totalDuration: 0 });

  // Check existing session
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (token) setAuthenticated(true);
  }, []);

  // Load recordings
  const loadRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRecordings();
      setRecordings(data);
      setStats({
        total: data.length,
        webCount: data.filter((r: Recording) => r.device_type === 'web').length,
        mobileCount: data.filter((r: Recording) => r.device_type === 'mobile').length,
        totalDuration: data.reduce((sum: number, r: Recording) => sum + (r.duration_seconds || 0), 0),
      });
    } catch (err) {
      console.error('Failed to load recordings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) loadRecordings();
  }, [authenticated, loadRecordings]);

  const handleDelete = async (id: string, path: string) => {
    try {
      await deleteRecording(id, path);
      setRecordings((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete recording.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_token');
    setAuthenticated(false);
  };

  if (!authenticated) {
    return <LoginScreen onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <main className="min-h-screen bg-bg relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[400px] bg-saffron/3 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-teal/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-slate-800 bg-bg/80 backdrop-blur-md sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl md:text-2xl font-bold gradient-text">
                Admin Panel
              </h1>
              <p className="text-slate-500 text-xs">Modi&apos;s Mission — Recordings Manager</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadRecordings}
                disabled={loading}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 text-xs font-medium transition-colors"
              >
                ← Back
              </Link>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Stats Row */}
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Recordings', value: stats.total, color: 'text-saffron' },
              { label: 'Web Recordings', value: stats.webCount, color: 'text-blue-400' },
              { label: 'Mobile Recordings', value: stats.mobileCount, color: 'text-green-400' },
              { label: 'Total Duration', value: `${Math.round(stats.totalDuration / 60)}m`, color: 'text-purple-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-bg-card border border-slate-700/40 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
                <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recordings Grid */}
        <div className="max-w-7xl mx-auto px-4 pb-8">
          {loading && recordings.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-saffron/30 border-t-saffron rounded-full animate-spin" />
            </div>
          ) : recordings.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-slate-500 text-lg font-medium">No recordings yet</p>
              <p className="text-slate-600 text-sm mt-1">Recordings will appear here once users submit them.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {recordings.map((rec) => (
                <RecordingCard
                  key={rec.id}
                  recording={rec}
                  onPlay={(url) => setPlayerUrl(url)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Video Player Modal */}
      {playerUrl && <VideoPlayer url={playerUrl} onClose={() => setPlayerUrl(null)} />}
    </main>
  );
}
