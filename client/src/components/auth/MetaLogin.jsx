import { API_URL } from '../../config';
import { Check, LogOut, Shield } from 'lucide-react';
import Spinner from '../ui/Spinner';
import { useState, useEffect } from 'react';
import FacebookIcon from '../../assets/facebook.svg';
export default function MetaLogin({ status }) {
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [loginMode, setLoginMode] = useState('oauth');
 const [manualToken, setManualToken] = useState('');

 const handleManualSubmit = async (e) => {
 e.preventDefault();
 if (!manualToken.trim()) return;
 setLoading(true);
 setError(null);
 try {
 const res = await fetch(`${API_URL}/api/auth/manual`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ token: manualToken.trim() })
 });
 const data = await res.json();
 if (!res.ok) {
 throw new Error(data.error || 'Failed to connect manual token');
 }
 window.location.reload();
 } catch (err) {
 setError(err.message);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 const hash = window.location.hash;
 if (hash && hash.includes('access_token=')) {
 setLoading(true);
 const params = new URLSearchParams(hash.substring(1));
 const accessToken = params.get('access_token');
 
 // Clear hash from URL cleanly
 window.history.replaceState(null, null, window.location.pathname + window.location.search);

 if (accessToken) {
 fetch(`${API_URL}/api/auth/facebook`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ accessToken })
 })
 .then(res => {
 if (!res.ok) {
 return res.json().then(errorData => {
 throw new Error(errorData.error || 'Failed to connect with backend');
 });
 }
 return res.json();
 })
 .then(() => {
 window.location.reload();
 })
 .catch(err => {
 setError(err.message);
 setLoading(false);
 });
 } else {
 setLoading(false);
 }
 } else if (hash && hash.includes('error=')) {
 const params = new URLSearchParams(hash.substring(1));
 setError(params.get('error_message') || 'Facebook Login failed or was cancelled.');
 window.history.replaceState(null, null, window.location.pathname + window.location.search);
 }
 }, []);

 const handleFacebookLogin = () => {
 setLoading(true);
 const appId = import.meta.env.VITE_FACEBOOK_APP_ID || "1000000000000000";
 // Using the ngrok backend URL for HTTPS requirements
 const redirectUri = 'https://carded-symptom-kissable.ngrok-free.dev/meta-review';
 
 // Direct top-level OAuth redirect (Bypasses popup blockers and iframe redirect bugs)
 window.location.href = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,instagram_manage_messages,instagram_manage_comments,pages_show_list,pages_messaging,pages_manage_metadata,pages_read_engagement,pages_manage_posts,pages_manage_engagement&response_type=token`;
 };

 const disconnect = async () => {
 setLoading(true);
 try {
 await fetch(`${API_URL}/api/auth/disconnect`, { method: 'POST' });
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 if (status?.accountId) {
 return (
 <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-6 transition-colors duration-300">
 <div className="flex items-center justify-between mb-4">
 <div className="flex items-center gap-3">
  {status.profilePicUrl ? (
  <div className="relative">
  <img src={status.profilePicUrl} alt="Profile" className="w-12 h-12 rounded-full border-2 border-[var(--color-primary)] object-cover" />
  <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5 border-2 border-[var(--color-bg-card)]">
  <Check size={12} className="text-white" />
  </div>
  </div>
  ) : (
  <div className="bg-green-100 p-2 rounded-full text-green-600">
  <Check size={24} />
  </div>
  )}
 <div>
 <h3 className="font-semibold text-[var(--color-text-main)]">Connected to Instagram</h3>
 <p className="text-sm text-[var(--color-status-success)] font-medium">Active Connection</p>
 </div>
 </div>
 <button 
 onClick={disconnect}
 disabled={loading}
 className="text-[var(--color-text-muted)] hover:text-[var(--color-status-error)] flex items-center gap-1 text-sm font-medium transition-colors"
 >
 <LogOut size={16} /> Disconnect
 </button>
 </div>
 
 <div className="space-y-3 mt-6">
 <div className="flex justify-between py-2 border-b border-[var(--color-border-subtle)]">
 <span className="text-[var(--color-text-muted)] text-sm">Username</span>
 <span className="font-semibold text-[var(--color-text-main)]">@{status.botUsername}</span>
 </div>
 <div className="flex justify-between py-2">
 <span className="text-[var(--color-text-muted)] text-sm">Account ID</span>
 <span className="font-mono text-sm text-[var(--color-text-main)]">{status.accountId}</span>
 </div>
 </div>
 </div>
 );
 }

 return (
 <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-8 transition-colors duration-300">
 <div className="flex flex-col items-center text-center mb-6">
 <div className="bg-[var(--color-primary-light)] w-16 h-16 rounded-full flex items-center justify-center mb-4">
 <img
 src={FacebookIcon}
 alt="Facebook"
 className="w-8 h-8"
 />
 </div>
 <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2">Connect your Account</h3>
 <p className="text-[var(--color-text-muted)] text-sm max-w-sm mx-auto">
 Connect your Instagram Business account to manage messages and automations.
 </p>
 </div>

 {/* Connection Mode Tabs */}
 <div className="flex border-b border-[var(--color-border-subtle)] mb-6">
 <button
 onClick={() => { setLoginMode('oauth'); setError(null); }}
 className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
 loginMode === 'oauth'
 ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
 : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
 }`}
 >
 Connect via Facebook
 </button>
 <button
 onClick={() => { setLoginMode('manual'); setError(null); }}
 className={`flex-1 pb-3 text-sm font-semibold border-b-2 transition-colors ${
 loginMode === 'manual'
 ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
 : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
 }`}
 >
 Manual Token
 </button>
 </div>

 {error && (
 <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-3 rounded-lg text-sm mb-6 text-center">
 {error}
 </div>
 )}

 {loginMode === 'oauth' ? (
 <button
 onClick={handleFacebookLogin}
 disabled={loading}
 className="bg-[#1877F2] text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 w-full hover:bg-[#166FE5] transition-colors disabled:opacity-70"
 >
 {loading ? (
 <Spinner size={20} />
 ) : (
 <img
 src={FacebookIcon}
 alt="Facebook"
 className="w-5 h-5"
 />
 )}
 Continue with Facebook
 </button>
 ) : (
 <form onSubmit={handleManualSubmit} className="space-y-4 text-left">
 <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
 Generate a <strong>Page Access Token</strong> or <strong>User Access Token</strong> with <code>instagram_basic</code>, <code>instagram_manage_messages</code>, and <code>pages_show_list</code> from the Graph API Explorer and paste it below.
 </p>
 <div>
 <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">Access Token</label>
 <input
 type="password"
 placeholder="EAAb..."
 value={manualToken}
 onChange={(e) => setManualToken(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
 required
 />
 </div>
 <button
 type="submit"
 disabled={loading || !manualToken.trim()}
 className="btn-primary w-full py-3 text-sm font-semibold rounded-lg disabled:opacity-70"
 >
 {loading ? <Spinner size={20} /> : 'Connect Token'}
 </button>
 </form>
 )}
 
 <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)]">
 <Shield size={12} />
 Secure login via Meta
 </div>
 </div>
 );
}
