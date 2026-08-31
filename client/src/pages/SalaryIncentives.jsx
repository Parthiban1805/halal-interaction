import { AlertCircle, Lock, Search, X, Edit2, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TableSkeleton, Skeleton } from '../components/ui/Skeleton';
import SalaryConfigModal from '../components/salary/SalaryConfigModal';
import Button from '../components/ui/Button';
import CustomMonthPicker from '../components/ui/CustomMonthPicker';
import Modal from '../components/ui/Modal';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function SalaryIncentives() {
  const { token, user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Date picker state (defaults to current month)
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedBreakdownAgent, setSelectedBreakdownAgent] = useState(null);
  
  // Confirmation Dialog
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, [token, selectedMonth]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/salary?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAgents(data.data);
      } else {
        setError(data.error || 'Failed to fetch configs');
      }
    } catch (err) {
      setError('An error occurred while fetching.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (configData) => {
    try {
      const res = await fetch(`${API_URL}/api/salary/${selectedAgent._id}?month=${selectedMonth}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(configData)
      });
      const data = await res.json();
      if (data.success) {
        // Refetch to get updated calculated values
        fetchConfigs();
        setIsModalOpen(false);
      } else {
        alert(data.error || 'Failed to save config');
      }
    } catch (err) {
      alert('An error occurred while saving.');
    }
  };

  const openConfigModal = (agent) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    agent.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAgents.length / itemsPerPage);
  const paginatedAgents = filteredAgents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const currentStatus = agents.length > 0 ? (agents[0]?.status || 'Draft') : 'Draft';

  const initiateFinalize = () => {
    setIsConfirmOpen(true);
  };

  const handleFinalize = async () => {
    setIsConfirmOpen(false);
    setFinalizing(true);
    try {
      const res = await fetch(`${API_URL}/api/salary/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ month: selectedMonth })
      });
      const data = await res.json();
      if (data.success) {
        // We could use a toast here ideally, but stick to alert for now or just fetchConfigs
        fetchConfigs();
      } else {
        alert(data.error || 'Failed to finalize');
      }
    } catch (err) {
      alert('An error occurred during finalization.');
    } finally {
      setFinalizing(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="fade-in space-y-6 flex flex-col pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">Salary & Incentives</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Configure base salaries, track performance, and finalize monthly payouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentStatus === 'Finalized' && (
            <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-green-100 text-green-700 flex items-center gap-1.5">
              <Lock size={14} /> Finalized Snapshot
            </span>
          )}
          <Button 
            onClick={initiateFinalize} 
            loading={finalizing}
            disabled={loading}
            className={currentStatus === 'Finalized' ? "!bg-amber-600 hover:!bg-amber-700 !text-white" : ""}
          >
            {currentStatus === 'Finalized' ? "Re-calculate & Finalize" : "Finalize Month"}
          </Button>
        </div>
      </div>
      
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]" title="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <CustomMonthPicker
            value={selectedMonth}
            onChange={(val) => setSelectedMonth(val)}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Main Card */}
      <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden flex flex-col">

        {/* Table */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)]">
              <tr>
                <th className="p-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">Name</th>
                <th className="p-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">Role</th>
                <th className="p-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">Designation</th>
                <th className="p-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">Revenue</th>
                <th className="p-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">Base Salary</th>
                <th className="p-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">Est. Incentive</th>
                <th className="p-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">Total Payout</th>
                <th className="p-4 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider whitespace-nowrap">Breakdown</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {loading ? (
                Array.from({ length: 5 }).map((_, rIdx) => (
                  <tr key={`sk-${rIdx}`}>
                    {/* Name & Avatar */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Skeleton variant="circular" className="h-8 w-8 shrink-0" />
                        <div className="flex flex-col gap-2">
                          <Skeleton variant="text" className="h-3 w-32" />
                          <Skeleton variant="text" className="h-2 w-24" />
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="p-4 whitespace-nowrap">
                      <Skeleton variant="text" className="h-6 w-16" />
                    </td>
                    {/* Designation */}
                    <td className="p-4 whitespace-nowrap">
                      <Skeleton variant="text" className="h-4 w-24" />
                    </td>
                    {/* Revenue */}
                    <td className="p-4 whitespace-nowrap">
                      <Skeleton variant="text" className="h-4 w-20" />
                    </td>
                    {/* Base Salary */}
                    <td className="p-4 whitespace-nowrap">
                      <Skeleton variant="text" className="h-4 w-20" />
                    </td>
                    {/* Est. Incentive */}
                    <td className="p-4 whitespace-nowrap">
                      <Skeleton variant="text" className="h-4 w-20" />
                    </td>
                    {/* Total Payout */}
                    <td className="p-4 whitespace-nowrap">
                      <Skeleton variant="text" className="h-5 w-24" />
                    </td>
                    {/* Breakdown */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Skeleton variant="text" className="h-6 w-20" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : paginatedAgents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-[var(--color-text-muted)]">No agents found</td>
                </tr>
              ) : (
                  paginatedAgents.map(agent => (
                    <tr 
                      key={agent._id} 
                      className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors cursor-pointer"
                      onClick={() => openConfigModal(agent)}
                      title="Click to edit configuration"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--color-bg-app)] border border-[var(--color-border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--color-text-main)] shrink-0">
                            {agent.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-[var(--color-text-main)]">{agent.name}</span>
                            {agent.email && (
                              <span className="text-xs text-[var(--color-text-muted)] mt-0.5 opacity-80">
                                {agent.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            ["admin", "superadmin"].includes(agent.role)
                              ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                              : "bg-[var(--color-bg-app)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]"
                          }`}>
                          {agent.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-medium text-[var(--color-text-main)]">
                          {agent.designation || '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-[var(--color-text-muted)]">
                          ₹{Number(agent.revenueGenerated || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-[var(--color-text-main)]">
                          ₹{Number(agent.baseSalary || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-[var(--color-text-main)]">
                          + ₹{Number(agent.calculatedIncentive || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-blue-600 dark:text-blue-400 text-base">
                          ₹{Number(agent.totalPayout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setSelectedBreakdownAgent(agent);
                            setIsBreakdownModalOpen(true);
                          }}
                          className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] cursor-pointer"
                          title="View Breakdown"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]">
            <span className="text-sm text-[var(--color-text-muted)]">
              Showing <span className="font-medium text-[var(--color-text-main)]">{((currentPage - 1) * itemsPerPage) + 1}</span> to <span className="font-medium text-[var(--color-text-main)]">{Math.min(currentPage * itemsPerPage, filteredAgents.length)}</span> of <span className="font-medium text-[var(--color-text-main)]">{filteredAgents.length}</span> entries
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <SalaryConfigModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        agent={selectedAgent}
        onSave={handleSaveConfig}
        period={selectedMonth}
      />

      <Modal 
        isOpen={isBreakdownModalOpen} 
        onClose={() => setIsBreakdownModalOpen(false)} 
        title="Payout Breakdown"
      >
        {selectedBreakdownAgent && (
          <div className="p-6 bg-[var(--color-bg-card)] text-[var(--color-text-main)] font-mono text-sm max-w-md mx-auto">
            <div className="text-center mb-6 border-b-2 border-dashed border-[var(--color-border-subtle)] pb-4">
              <h2 className="text-xl font-bold uppercase">{selectedBreakdownAgent.name}</h2>
              <p className="text-[var(--color-text-muted)]">{selectedBreakdownAgent.role} {selectedBreakdownAgent.designation ? `(${selectedBreakdownAgent.designation})` : ''}</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1 opacity-70">Period: {selectedMonth}</p>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between font-semibold">
                <span>Revenue (exc. GST)</span>
                <span>₹{Number(selectedBreakdownAgent.revenueGenerated || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            <div className="border-t border-dashed border-[var(--color-border-subtle)] py-4 space-y-3">
              <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Earnings Breakdown</div>
              {selectedBreakdownAgent.breakdown && selectedBreakdownAgent.breakdown.length > 0 ? (
                selectedBreakdownAgent.breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate pr-4" title={item.description}>{item.description}</span>
                    <span>₹{Number(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))
              ) : (
                <div className="text-[var(--color-text-muted)] text-center py-2">No breakdown available.</div>
              )}
            </div>
            
            <div className="border-t-2 border-dashed border-[var(--color-text-main)] dark:border-gray-500 pt-4 mt-2">
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL PAYOUT</span>
                <span>₹{Number(selectedBreakdownAgent.totalPayout || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-[var(--color-text-muted)] opacity-70">
              <p>Generated automatically based on performance.</p>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleFinalize}
        title="Finalize Payouts"
        message={`Are you sure you want to finalize payouts for ${selectedMonth}? This will permanently lock the salary snapshot for this month and it cannot be edited further.`}
        confirmText="Finalize"
      />
    </div>
  );
}
