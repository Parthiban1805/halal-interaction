import { API_URL } from '../config';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import MetaLogin from '../components/auth/MetaLogin';

export default function MetaReviewDashboard() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    // Fetch connection status
    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/connection-status`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch (e) {
        console.error('Failed to fetch status', e);
      }
    };

    fetchStatus();
    
    const interval = setInterval(() => {
      fetchStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout title="Connect Account">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)]">Connect Account</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Connect your Instagram Business account to reply to DMs and Comments.</p>
        </div>
        <Link to="/meta-review/checklist" className="btn-primary">
          View Readiness Checklist
        </Link>
      </div>

        <div className="fade-in">
          <MetaLogin status={status} />
        </div>
    </DashboardLayout>
  );
}
