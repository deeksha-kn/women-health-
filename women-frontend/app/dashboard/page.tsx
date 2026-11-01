'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { historyApi, reportApi, type HistoryItem, type PredictionStats } from '@/lib/api';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<PredictionStats | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoadingData(true);
    try {
      const [h, s] = await Promise.all([historyApi.getAll(), historyApi.getStats()]);
      setHistory(h);
      setStats(s);
    } catch {
      setError('Failed to load your history. Please refresh the page.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this record? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await historyApi.delete(id);
      setHistory(prev => prev.filter(h => h.id !== id));
      await historyApi.getStats().then(setStats);
    } catch {
      setError('Failed to delete record. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (item: HistoryItem) => {
    setDownloadingId(item.id);
    try {
      const label = item.kind === 'text'
        ? `${item.prediction_type}_${item.prediction_result}`
        : `acne_${item.severity}`;
      await reportApi.download(item.id, `healthhub_report_${label}.pdf`);
    } catch {
      setError('Failed to generate report. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const conditionColor = (type: string | null) => {
    if (!type) return 'bg-purple-100 text-purple-700';
    const m: Record<string, string> = { pcos: 'bg-pink-100 text-pink-700', pcod: 'bg-rose-100 text-rose-700', thyroid: 'bg-blue-100 text-blue-700' };
    return m[type] ?? 'bg-gray-100 text-gray-700';
  };

  const severityColor = (s: string | null) => {
    const m: Record<string, string> = { low: 'bg-green-100 text-green-700', moderate: 'bg-yellow-100 text-yellow-700', high: 'bg-red-100 text-red-700' };
    return s ? (m[s.toLowerCase()] ?? 'bg-gray-100 text-gray-700') : 'bg-gray-100 text-gray-700';
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading…</p>
      </div>
    </div>
  );

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Welcome back, {user?.name?.split(' ')[0]}</p>
          </div>
          <div className="flex gap-3">
            <Link href="/profile" className="border border-gray-300 hover:border-primary text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              Profile
            </Link>
            <Link href="/" className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              + New Scan
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
            <button onClick={() => setError('')} className="ml-2 text-red-400 hover:text-red-600">×</button>
          </div>
        )}

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Scans', value: stats.total_predictions, icon: '🔬' },
              { label: 'Text Predictions', value: stats.text_predictions, icon: '📋' },
              { label: 'Image Analyses', value: stats.image_predictions, icon: '📸' },
              { label: 'Conditions Checked', value: Object.keys(stats.by_condition).length, icon: '🩺' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="text-3xl font-bold text-foreground">{card.value}</div>
                <div className="text-xs text-gray-500 mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Breakdown */}
        {stats && (stats.text_predictions > 0 || stats.image_predictions > 0) && (
          <div className="grid md:grid-cols-2 gap-4">
            {stats.text_predictions > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">By Condition</h3>
                <div className="space-y-2">
                  {Object.entries(stats.by_condition).map(([cond, count]) => (
                    <div key={cond} className="flex justify-between items-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${conditionColor(cond)}`}>{cond.toUpperCase()}</span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.image_predictions > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Acne Severity Results</h3>
                <div className="space-y-2">
                  {Object.entries(stats.by_severity).map(([sev, count]) => (
                    <div key={sev} className="flex justify-between items-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${severityColor(sev)}`}>{sev.charAt(0).toUpperCase() + sev.slice(1)}</span>
                      <span className="font-semibold text-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-foreground">Prediction History</h2>
          </div>

          {loadingData ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔬</div>
              <p className="text-gray-500 text-sm mb-4">No predictions yet.</p>
              <Link href="/" className="bg-primary hover:bg-primary/90 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors">
                Take your first scan
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {['Type', 'Result', 'Confidence', 'Model', 'Date', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-block text-xs px-2.5 py-1 rounded-full font-medium ${item.kind === 'text' ? conditionColor(item.prediction_type) : 'bg-purple-100 text-purple-700'}`}>
                          {item.kind === 'text' ? (item.prediction_type?.toUpperCase() ?? 'TEXT') : '📸 IMAGE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {item.kind === 'text'
                          ? item.prediction_result ?? '—'
                          : <span className={`text-xs px-2 py-0.5 rounded-full ${severityColor(item.severity)}`}>{item.severity ?? '—'}</span>
                        }
                      </td>
                      <td className="px-6 py-4 text-gray-600">{item.confidence_score.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-gray-400 text-xs">{item.model_variant ?? '—'}</td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">{formatDate(item.created_at)}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDownload(item)}
                            disabled={downloadingId === item.id}
                            className="text-xs border border-gray-200 hover:border-primary hover:text-primary px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {downloadingId === item.id ? '…' : '↓ PDF'}
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deletingId === item.id}
                            className="text-xs border border-gray-200 hover:border-red-300 hover:text-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {deletingId === item.id ? '…' : '🗑'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
