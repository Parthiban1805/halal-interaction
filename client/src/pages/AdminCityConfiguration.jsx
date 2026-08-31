import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import CitySelector from '../components/ui/CitySelector';
import Table from '../components/ui/Table';
import { Skeleton } from '../components/ui/Skeleton';
import toast from 'react-hot-toast';
import { Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminCityConfiguration() {
  const { token } = useAuth();
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCity, setNewCity] = useState('');

  const fetchCities = async () => {
    try {
      const res = await fetch(`${API_URL}/api/configured-cities`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCities(data);
      }
    } catch (err) {
      toast.error('Failed to fetch cities');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCities();
  }, [token]);

  const handleAddCity = async (cityName) => {
    if (!cityName) return;
    try {
      const res = await fetch(`${API_URL}/api/configured-cities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name: cityName })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('City configured successfully!');
        setNewCity('');
        fetchCities();
      } else {
        toast.error(data.error || 'Failed to add city');
        setNewCity('');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const handleRemoveCity = async (id) => {
    if (!window.confirm('Are you sure you want to remove this city?')) return;
    try {
      const res = await fetch(`${API_URL}/api/configured-cities/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('City removed');
        fetchCities();
      } else {
        toast.error('Failed to remove city');
      }
    } catch (err) {
      toast.error('Server error');
    }
  };

  const tableColumns = [
    { key: "name", label: "City Name" },
    { 
      key: "addedAt", 
      label: "Added On", 
      render: (row) => new Date(row.createdAt).toLocaleDateString()
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <button
          onClick={() => handleRemoveCity(row._id)}
          className="p-1.5 text-[var(--color-status-danger)] hover:bg-[var(--color-status-danger)] hover:bg-opacity-10 rounded-md transition-colors"
          title="Remove"
        >
          <Trash2 size={16} />
        </button>
      )
    }
  ];

  return (
    <div className="fade-in space-y-6 pb-20 flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">
            City Configuration
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Configure which cities agents can select by default.
          </p>
        </div>
        <Link 
          to="/admin/city-migration" 
          className="btn-secondary flex items-center gap-2"
        >
          Migrate Legacy Cities <ArrowRight size={16} />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl p-6 flex flex-col h-fit">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)] mb-4">Add New City</h2>
          <div className="flex-1 flex flex-col">
            <label className="block text-sm font-medium text-[var(--color-text-muted)] mb-2">Search Global Cities</label>
            <CitySelector
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="E.g., Salem, Tamil Nadu, India"
            />
            <button
              onClick={() => handleAddCity(newCity)}
              disabled={!newCity}
              className="mt-4 w-full bg-[var(--color-primary)] text-white font-medium py-2.5 rounded-xl hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add City
            </button>
            <p className="text-xs text-[var(--color-text-muted)] mt-4 leading-relaxed">
              Selected cities will be available to all agents in the default dropdown. If a required city is missing, agents can still search globally via the "Others..." option.
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-main)] mb-4">Configured Cities ({cities.length})</h2>
          {loading ? (
            <Skeleton className="w-full h-48" />
          ) : (
            <Table 
              columns={tableColumns} 
              data={cities} 
              emptyMessage="No cities configured yet."
            />
          )}
        </div>
      </div>
    </div>
  );
}
