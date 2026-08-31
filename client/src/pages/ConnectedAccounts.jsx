import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Users, 
  Tag, 
  Mail, 
  Phone, 
  Globe, 
  ExternalLink, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Skeleton } from '../components/ui/Skeleton';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';
import { API_URL } from '../config';

export default function ConnectedAccounts() {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/account/details`);
      const data = await res.json();
      
      if (data.success) {
        setAccount(data.data);
      } else {
        setError(data.error || 'Failed to fetch account details');
      }
    } catch (err) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountDetails();
  }, []);

  if (loading) {
    return (
      <div className="fade-in space-y-6 pb-20">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="space-y-2">
            <Skeleton variant="text" className="h-6 w-32" />
            <Skeleton variant="text" className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6 flex flex-col h-64">
            <div className="flex justify-between items-start mb-6">
              <Skeleton variant="text" className="h-4 w-32" />
              <Skeleton variant="rectangular" className="h-6 w-24 rounded-full" />
            </div>
            <div className="flex items-center gap-4 mb-6">
              <Skeleton variant="circular" className="w-12 h-12 shrink-0" />
              <div className="space-y-2">
                <Skeleton variant="text" className="h-5 w-40" />
                <div className="flex gap-3">
                  <Skeleton variant="rectangular" className="h-6 w-24 rounded-md" />
                  <Skeleton variant="rectangular" className="h-6 w-24 rounded-md" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} variant="rectangular" className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6 flex flex-col h-64">
            <div className="flex justify-between items-start mb-6">
              <Skeleton variant="text" className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-4 mb-8">
              <Skeleton variant="circular" className="w-12 h-12 shrink-0" />
              <div className="space-y-2">
                <Skeleton variant="text" className="h-5 w-32" />
                <Skeleton variant="rectangular" className="h-6 w-24 rounded-md" />
              </div>
            </div>
            <div className="mt-auto">
              <Skeleton variant="rectangular" className="h-20 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
          <Button variant="outline" size="sm" onClick={fetchAccountDetails} className="ml-4">Retry</Button>
        </div>
      </div>
    );
  }

  if (!account) return null;

  const igAccount = account.instagram_business_account;

  return (
    <div className="fade-in space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">Accounts</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage your social media integrations and messaging connections.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* FACEBOOK PAGE */}
        <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6 flex flex-col relative">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
               Facebook Page
            </h2>
            <div className="bg-green-500/10 text-green-600 border border-green-500/20 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              {account.tokenValidDays || 'Connected'}
            </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full shrink-0">
              <div className="w-full h-full overflow-hidden">
                <img src={account.picture?.data?.url || "/logo.png"} alt={account.name} className="w-full h-full object-cover rounded-full" onError={(e) => e.target.style.display = 'none'} />
              </div>
            </div>
            <div>
              <h3 className="text-md font-medium text-[var(--color-text-main)] mb-2">{account.name || 'Unknown Page'}</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                  <Users size={14} /> {account.followers_count || 0} Followers
                </span>
                {account.category && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] bg-[var(--color-bg-subtle)] px-2.5 py-1 rounded-md border border-[var(--color-border-subtle)]">
                    <Tag size={14} /> {account.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
            {account.emails && account.emails.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-subtle)] rounded-xl border border-[var(--color-border-subtle)]">
                <Mail size={16} className="text-[var(--color-text-muted)] shrink-0" />
                <span className="text-sm font-semibold text-[var(--color-text-main)] truncate">{account.emails[0]}</span>
              </div>
            )}
            {account.phone && (
              <div className="flex items-center gap-3 p-3 bg-[var(--color-bg-subtle)] rounded-xl border border-[var(--color-border-subtle)]">
                <Phone size={16} className="text-[var(--color-text-muted)] shrink-0" />
                <span className="text-sm font-semibold text-[var(--color-text-main)] truncate">{account.phone}</span>
              </div>
            )}
            {account.website && (
              <a href={account.website.startsWith('http') ? account.website : `https://${account.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl border border-blue-500/10 transition-colors group">
                <Globe size={16} className="text-blue-500 shrink-0" />
                <span className="text-sm font-semibold text-blue-600 truncate group-hover:underline">{account.website}</span>
              </a>
            )}
            <a href={`https://facebook.com/${account.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-500/5 hover:bg-blue-500/10 rounded-xl border border-blue-500/10 transition-colors group">
              <ExternalLink size={16} className="text-blue-500 shrink-0" />
              <span className="text-sm font-semibold text-blue-600 group-hover:underline">View Facebook Page</span>
            </a>
          </div>
        </div>

        {/* INSTAGRAM BUSINESS */}
        {igAccount && (
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6  flex flex-col relative">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-widest flex items-center gap-2">
                 Instagram Business
              </h2>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full shrink-0">
                <div className="w-full h-full flex items-center justify-center p-0.5 overflow-hidden">
                   <img src={igAccount.profile_picture_url || "/logo.png"} alt={igAccount.username} className="w-full h-full object-cover rounded-full" onError={(e) => e.target.style.display = 'none'} />
                </div>
              </div>
              <div>
                <h3 className="text-md font-medium text-[var(--color-text-main)] mb-2">@{igAccount.username}</h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                    <Users size={14} /> {igAccount.followers_count || 0} Followers
                  </span>
                </div>
              </div>
            </div>

            {igAccount.biography && (
              <div className="mt-auto bg-[var(--color-bg-subtle)] p-4 rounded-xl border border-[var(--color-border-subtle)]">
                <h4 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-2">Bio</h4>
                <p className="text-sm text-[var(--color-text-main)] leading-relaxed font-medium whitespace-pre-wrap">
                  {igAccount.biography}
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
