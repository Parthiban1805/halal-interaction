import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import Table from "../components/ui/Table";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";
import { RotateCcw, Search, X } from "lucide-react";
import { getLeadStatusColor, getLeadStatusBg } from "../utils/statusColors";
import { Skeleton } from "../components/ui/Skeleton";

export default function AdminDeletedLeads() {
  const { token } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleLeads, setVisibleLeads] = useState([]);
  
  const [leadToRestore, setLeadToRestore] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    fetchDeletedLeads();
  }, [token]);

  const fetchDeletedLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/leads/deleted`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setLeads(json.data || []);
      } else {
        toast.error("Failed to fetch deleted leads");
      }
    } catch (err) {
      toast.error("Error fetching deleted leads");
    } finally {
      setLoading(false);
    }
  };

  const confirmRestore = async () => {
    if (!leadToRestore) return;
    setRestoring(true);
    try {
      const res = await fetch(`${API_URL}/api/leads/${leadToRestore._id}/restore`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Lead restored successfully");
        setLeads(leads.filter((l) => l._id !== leadToRestore._id));
        setShowRestoreConfirm(false);
        setLeadToRestore(null);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to restore lead");
      }
    } catch (e) {
      toast.error("Error restoring lead");
    } finally {
      setRestoring(false);
    }
  };

  const filteredLeads = leads.filter((lead) => {
    const s = search.toLowerCase();
    return (
      (lead.name || "").toLowerCase().includes(s) ||
      (lead.phone || "").toLowerCase().includes(s) ||
      (lead.username || "").toLowerCase().includes(s)
    );
  });

  const columns = [
    {
      label: 'Name',
      key: 'name',
      sortable: true,
      skeletonRender: () => (
        <div className="flex flex-col gap-1.5">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="text" className="h-3 w-20" />
        </div>
      ),
      render: (lead) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--color-text-main)] text-sm">{lead.name}</span>
          {lead.username && (
            <span className="text-xs text-[var(--color-text-muted)] font-medium">@{lead.username}</span>
          )}
        </div>
      )
    },
    {
      label: 'Contact',
      key: 'phone',
      sortable: true,
      skeletonRender: () => (
        <div className="flex flex-col gap-1.5">
          <Skeleton variant="text" className="h-4 w-24" />
          <Skeleton variant="text" className="h-3 w-32" />
        </div>
      ),
      render: (lead) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[var(--color-text-main)]">{lead.phone || '-'}</span>
          {lead.email && <span className="text-xs text-[var(--color-text-muted)]">{lead.email}</span>}
        </div>
      )
    },
    {
      label: 'Status',
      key: 'status',
      sortable: true,
      skeletonRender: () => <Skeleton variant="rectangular" className="h-4 w-20 rounded-full" />,
      render: (lead) => (
        <span 
          className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: getLeadStatusBg(lead.status), color: getLeadStatusColor(lead.status) }}
        >
          {lead.status}
        </span>
      )
    },
    {
      label: 'Deleted On',
      key: 'updatedAt',
      sortable: true,
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-24" />,
      render: (lead) => (
        <span className="text-sm text-[var(--color-text-muted)]">
          {new Date(lead.updatedAt).toLocaleDateString()}
        </span>
      )
    },
    {
      label: 'Actions',
      key: 'actions',
      className: 'text-left',
      skeletonRender: () => <Skeleton variant="rectangular" className="h-8 w-24 rounded-lg" />,
      render: (lead) => (
        <div className="flex justify-start">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLeadToRestore(lead);
              setShowRestoreConfirm(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 font-medium rounded-lg text-sm transition-colors"
          >
            <RotateCcw size={14} />
            Restore
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 fade-in pb-12">
      {/* Header section matching other pages */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">Deleted Leads</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            View and restore leads that were deleted. These leads will remain here indefinitely.
          </p>
        </div>
      </div>

      {/* Top action bar - matching CustomersList */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] md:max-w-md shrink-0">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Search by name, username, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]" title="Clear search">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table section */}
      <Table 
        columns={columns}
        data={filteredLeads}
        isLoading={loading}
        keyField="_id"
        itemsPerPage={15}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onVisibleDataChange={setVisibleLeads}
      />

      <ConfirmationDialog
        isOpen={showRestoreConfirm}
        onClose={() => setShowRestoreConfirm(false)}
        onConfirm={confirmRestore}
        title="Restore Lead"
        message={`Are you sure you want to restore ${leadToRestore?.name}? They will be placed back into the main pipeline.`}
        confirmText={restoring ? "Restoring..." : "Restore Lead"}
        isLoading={restoring}
        isDestructive={false}
      />
    </div>
  );
}
