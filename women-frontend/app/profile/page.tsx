'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { userApi, ApiError } from '@/lib/api';

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, refreshUser, logout } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!isLoading && !isAuthenticated) {
    router.push('/');
    return null;
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const startEditing = () => {
    setName(user.name);
    setPhone(user.phone ?? '');
    setEditing(true);
    setError('');
    setSuccess('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await userApi.updateProfile({ name: name.trim() || undefined, phone: phone.trim() || undefined });
      await refreshUser();
      setEditing(false);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profile</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your account details</p>
          </div>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">← Dashboard</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">{success}</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
        )}

        {/* Avatar + name */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
            {user.name[0].toUpperCase()}
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
            <div className="text-xs text-gray-400 mt-1">
              Member since {new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Details card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-semibold text-foreground">Account Details</h2>
            {!editing && (
              <button onClick={startEditing} className="text-sm text-primary hover:underline">Edit</button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" required className={inputClass} value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-gray-400 text-xs">(cannot be changed)</span></label>
                <input type="email" disabled className={`${inputClass} bg-gray-50 text-gray-400 cursor-not-allowed`} value={user.email} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 text-xs">(optional)</span></label>
                <input type="tel" className={inputClass} value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditing(false)} className="border border-gray-300 text-sm px-5 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-4">
              {[
                ['Full Name', user.name],
                ['Email', user.email],
                ['Phone', user.phone ?? 'Not provided'],
                ['User ID', user.id],
              ].map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <dt className="w-28 text-sm font-medium text-gray-500 shrink-0">{label}</dt>
                  <dd className="text-sm text-foreground break-all">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">Account Actions</h2>
          <button
            onClick={logout}
            className="border border-red-200 hover:bg-red-50 text-red-600 text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
