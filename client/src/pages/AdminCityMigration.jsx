import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import CitySelector from '../components/ui/CitySelector';
import Table from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { ArrowLeft, RefreshCw, Eye, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminCityMigration() {
  const { token } = useAuth();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mappings, setMappings] = useState({});
  const [updating, setUpdating] = useState(null);

  const [selectedCityForLeads, setSelectedCityForLeads] = useState(null);
  const [cityLeads, setCityLeads] = useState([]);
  const [loadingLeads, setLoadingLeads] = useState(false);

  const fetchUniqueCities = async () => {
    try {
      const res = await fetch(`${API_URL}/api/leads/unique-cities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const nonStandard = data.data.filter(c => {
           const str = c.originalCity || "";
           return !(str.endsWith('India') && str.split(',').length >= 3);
        });
        setCities(nonStandard);
      }
    } catch (err) {
      toast.error('Failed to fetch legacy cities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniqueCities();
  }, [token]);

  const handleViewLeads = async (city) => {
    setSelectedCityForLeads(city);
    setLoadingLeads(true);
    try {
      const res = await fetch(`${API_URL}/api/leads/by-city?city=${encodeURIComponent(city)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCityLeads(data);
        } else {
          setCityLeads(data.data || []);
        }
      } else {
        toast.error('Failed to fetch leads');
      }
    } catch (err) {
      toast.error('Server error');
    } finally {
      setLoadingLeads(false);
    }
  };

  const handleMigrate = async (oldCity) => {
    const newCity = mappings[oldCity];
    if (!newCity) {
      toast.error('Please select a new city to migrate to.');
      return;
    }
    if (!window.confirm(`Are you sure you want to update all leads with "${oldCity}" to "${newCity}"?`)) {
      return;
    }

    setUpdating(oldCity);
    try {
      const res = await fetch(`${API_URL}/api/leads/bulk-update-city`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldCity, newCity })
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || 'Leads updated successfully');
        setCities(prev => prev.filter(c => c.originalCity !== oldCity));
        setMappings(prev => {
          const newMappings = { ...prev };
          delete newMappings[oldCity];
          return newMappings;
        });
      } else {
        toast.error(data.error || 'Update failed');
      }
    } catch (err) {
      toast.error('Server error during migration');
    } finally {
      setUpdating(null);
    }
  };

  const tableColumns = [
    { 
      key: "originalCity", 
      label: "Legacy City String",
      render: (row) => (
        <span className="font-medium text-[var(--color-text-main)]">
          {row.originalCity}
        </span>
      )
    },
    { 
      key: "count", 
      label: "Affected Leads",
      render: (row) => (
        <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-[var(--color-bg-subtle)] text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
          {row.count}
        </span>
      )
    },
    {
      key: "mapping",
      label: "Standardized Mapping",
      render: (row, index) => (
        <div className="w-full max-w-sm relative" style={{ zIndex: updating === row.originalCity ? 0 : 500 - (index || 0) }}>
          <CitySelector
            value={mappings[row.originalCity] || ''}
            onChange={(e) => setMappings({ ...mappings, [row.originalCity]: e.target.value })}
            placeholder="Search standard city..."
            disabled={updating === row.originalCity}
          />
        </div>
      )
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewLeads(row.originalCity)}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-hover)] rounded-md transition-colors"
            title="View Leads"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => handleMigrate(row.originalCity)}
            disabled={!mappings[row.originalCity] || updating === row.originalCity}
            className="btn-primary text-xs px-3 py-1.5 min-w-[100px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating === row.originalCity ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              'Migrate'
            )}
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="fade-in space-y-6 pb-20 flex flex-col">
      <div className="mb-6 flex flex-col items-start gap-2">
        <Link 
          to="/admin/cities" 
          className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={16} /> Back to City Configuration
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">
            Migrate Legacy Cities
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Map old, unstructured city strings to the standardized format. This updates all affected leads instantly.
          </p>
        </div>
      </div>

      <div className="">
        {loading ? (
          <div className="p-6">
            <Skeleton className="w-full h-64" />
          </div>
        ) : cities.length === 0 ? (
          <div className="p-12 text-center text-[var(--color-text-muted)]">
            No legacy city strings found. All cities are standardized!
          </div>
        ) : (
          <div className="min-h-[400px] bg-[var(--color-bg-card)] rounded-xl">
            <Table columns={tableColumns} data={cities} overflowVisible={true} />
          </div>
        )}
      </div>

      {selectedCityForLeads !== null && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in">
          <div className="bg-[var(--color-bg-card)] rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-[var(--color-border-subtle)]">
            <div className="p-5 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-bg-subtle)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                  Leads in "{selectedCityForLeads}"
                </h2>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  {cityLeads.length} leads found
                </p>
              </div>
              <button
                onClick={() => setSelectedCityForLeads(null)}
                className="p-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-hover)] rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {loadingLeads ? (
                <div className="p-8 flex justify-center">
                  <RefreshCw className="animate-spin text-[var(--color-primary)]" size={24} />
                </div>
              ) : cityLeads.length === 0 ? (
                <div className="p-8 text-center text-[var(--color-text-muted)]">
                  No leads found.
                </div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)] sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Name</th>
                      <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Username</th>
                      <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Phone</th>
                      <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Email</th>
                      <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">Status</th>
                      <th className="px-6 py-3 font-medium text-[var(--color-text-muted)]">City</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-subtle)]">
                    {cityLeads.map(lead => (
                      <tr key={lead._id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                        <td className="px-6 py-3 text-[var(--color-text-main)] font-medium">{lead.name || '-'}</td>
                        <td className="px-6 py-3 text-[var(--color-text-muted)]">{lead.username || '-'}</td>
                        <td className="px-6 py-3 text-[var(--color-text-main)]">{lead.phone || '-'}</td>
                        <td className="px-6 py-3 text-[var(--color-text-muted)]">{lead.email || '-'}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-[var(--color-bg-subtle)] text-xs font-medium text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]">
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-[var(--color-text-muted)]">{lead.city || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
