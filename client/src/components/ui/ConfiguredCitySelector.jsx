import React, { useState, useEffect } from 'react';
import CustomSelect from './CustomSelect';
import CitySelector from './CitySelector';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';

let cachedCities = null;
let fetchPromise = null;

export default function ConfiguredCitySelector({
  value,
  onChange,
  className = "",
  disabled = false,
  placeholder = "Select City"
}) {
  const { token } = useAuth();
  const [cities, setCities] = useState(cachedCities || []);
  const [loading, setLoading] = useState(!cachedCities);
  const [useGlobalSearch, setUseGlobalSearch] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchConfiguredCities = async () => {
      if (cachedCities) {
        setCities(cachedCities);
        setLoading(false);
        return;
      }
      
      if (!fetchPromise) {
        fetchPromise = fetch(`${API_URL}/api/configured-cities`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json());
      }

      try {
        const data = await fetchPromise;
        if (isMounted) {
          cachedCities = data;
          setCities(data);
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch configured cities", err);
        if (isMounted) setLoading(false);
      }
    };

    fetchConfiguredCities();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Check if current value exists in configured cities. If not, fallback to global search
  useEffect(() => {
    if (!loading && value && cities.length > 0) {
      if (value === "All India") return;
      const isConfigured = cities.some(c => c.name === value);
      if (!isConfigured) {
        setUseGlobalSearch(true);
      }
    }
  }, [value, cities, loading]);

  const handleCustomSelectChange = (e) => {
    const selected = e.target.value;
    if (selected === "OTHERS_FALLBACK") {
      setUseGlobalSearch(true);
      // Don't trigger onChange yet, wait for them to search in the CitySelector
    } else {
      onChange({ target: { value: selected } });
    }
  };

  if (useGlobalSearch) {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        <CitySelector
          value={value}
          onChange={onChange}
          className={className}
          disabled={disabled}
          placeholder="Search all cities..."
        />
        <button
          onClick={(e) => {
            e.preventDefault();
            setUseGlobalSearch(false);
            if (value !== "All India" && !cities.some(c => c.name === value)) {
               onChange({ target: { value: "" } });
            }
          }}
          className="text-xs text-[var(--color-primary)] hover:underline self-end px-1"
        >
          Cancel global search
        </button>
      </div>
    );
  }

  const options = [
    { value: "All India", label: "All India" },
    ...cities.map(c => ({ value: c.name, label: c.name })),
    { value: "OTHERS_FALLBACK", label: "Others (Search Global)..." }
  ];

  return (
    <CustomSelect
      searchable={true}
      value={value}
      onChange={handleCustomSelectChange}
      options={options}
      className={className}
      disabled={disabled || loading}
      placeholder={loading ? "Loading..." : placeholder}
    />
  );
}
