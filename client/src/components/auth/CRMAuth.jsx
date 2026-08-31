import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';
import { UserPlus, LogIn, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import logo from '../../assets/logo.png';
import CustomSelect from '../ui/CustomSelect';

export default function CRMAuth({ onAuthSuccess }) {
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);

 const navigate = useNavigate();
 const location = useLocation();
 const { login, isAuthenticated } = useAuth();

 useEffect(() => {
 if (isAuthenticated && location.pathname === '/crm-login') {
 navigate('/dashboard');
 }
 }, [isAuthenticated, location.pathname, navigate]);

 const handleSubmit = async (e) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
 await login(email, password);
 if (onAuthSuccess) {
 onAuthSuccess();
 }
 } catch (err) {
 setError(err.message || 'Authentication failed');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="flex items-center justify-center min-h-[400px] py-10 fade-in">
 <div className="w-full max-w-md bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-8 transition-colors duration-300">
 <div className="flex flex-col items-center text-center mb-6">
 <img src={logo} alt="Halal Interactions Logo" className="w-16 h-16 object-contain mb-2" />
 <h3 className="text-xl font-bold text-[var(--color-text-main)]">Halal Interactions CRM</h3>
 <p className="text-[var(--color-text-muted)] text-sm max-w-xs mx-auto mt-1">
 Authenticate to access pipelines, templates, and communication workflows.
 </p>
 </div>

 {error && (
 <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-3 rounded-lg text-sm mb-6 text-center font-medium">
 {error}
 </div>
 )}

 <form onSubmit={handleSubmit} className="space-y-4 text-left">
 <div>
 <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">Email Address</label>
 <input
 type="email"
 placeholder="agent@brand.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
 required
 />
 </div>

 <div>
 <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1.5 uppercase tracking-wider">Password</label>
 <input
 type="password"
 placeholder="••••••••"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
 required
 />
 </div>

 <button
 type="submit"
 disabled={loading}
 className="btn-primary w-full py-3 text-sm font-semibold rounded-lg mt-6"
 >
 {loading ? <Spinner size={20} /> : 'Sign In'}
 </button>
 </form>
 </div>
 </div>
 );
}
