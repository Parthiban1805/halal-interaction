import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Eye,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Receipt,
} from "lucide-react";
import Table from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import Spinner from "../components/ui/Spinner";
import Button from "../components/ui/Button";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import CustomSelect from "../components/ui/CustomSelect";

export default function TransactionHistory() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [periodType, setPeriodType] = useState("preset");
  const [period, setPeriod] = useState("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchTransactions = async () => {
    if (periodType === "custom" && (!startDate || !endDate)) return;
    setLoading(true);
    try {
      let url = `${API_URL}/api/analytics/transactions?`;
      if (periodType === "preset") {
        url += `period=${period}`;
      } else {
        url += `startDate=${startDate}&endDate=${endDate}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.transactions || []);
        setAgents(json.agents || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTransactions();
  }, [token, periodType, period, startDate, endDate]);

  const filteredTransactions = transactions.filter((tx) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = tx.leadName && tx.leadName.toLowerCase().includes(q);
      const matchesUsername =
        tx.leadUsername && tx.leadUsername.toLowerCase().includes(q);
      const matchesPhone =
        tx.leadPhone && tx.leadPhone.toLowerCase().includes(q);
      if (!matchesName && !matchesUsername && !matchesPhone) return false;
    }
    if (agentFilter && tx.agentName !== agentFilter) return false;
    if (typeFilter && tx.type !== typeFilter) return false;
    return true;
  });

  const uniqueTypes = [
    ...new Set(transactions.map((t) => t.type).filter(Boolean)),
  ].sort();

  const getTypeBadgeStyle = (type) => {
    switch (type) {
      case "New Membership":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Cancellation":
        return "bg-red-50 text-red-700 border-red-200";
      case "Membership Renewal":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Membership Upgrade":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "Membership Downgrade":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "Event Registration":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Legacy Membership":
        return "bg-gray-50 text-gray-600 border-gray-200";
      default:
        return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="fade-in space-y-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">
            Transaction History
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Complete history of all revenue transactions across the CRM.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchTransactions}
            disabled={loading}
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            placeholder="Search by lead name or username..."
            className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search
            className="absolute left-3.5 top-3 text-[var(--color-text-muted)]"
            size={18}
          />
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {periodType === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="bg-white border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-sm font-medium rounded-xl focus:ring-[var(--color-border-focus)] focus:border-transparent px-3 py-2.5"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="text-[var(--color-text-light)] text-sm">to</span>
              <input
                type="date"
                className="bg-white border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-sm font-medium rounded-xl focus:ring-[var(--color-border-focus)] focus:border-transparent px-3 py-2.5"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          )}

          <CustomSelect
            value={periodType === "custom" ? "custom" : period}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "custom") {
                setPeriodType("custom");
              } else {
                setPeriodType("preset");
                setPeriod(val);
              }
            }}
            options={[
              { value: "this_month", label: "This Month" },
              { value: "today", label: "Today" },
              { value: "yesterday", label: "Yesterday" },
              { value: "this_week", label: "This Week" },
              { value: "last_week", label: "Last Week" },
              { value: "last_month", label: "Last Month" },
              { value: "this_year", label: "This Year" },
              { value: "all_time", label: "All Time" },
              { value: "custom", label: "Custom Date Range" },
            ]}
          />
          <CustomSelect searchable={true}
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            options={[
              { value: "", label: "All Agents" },
              ...agents.map((name) => ({ value: name, label: name })),
            ]}
            placeholder="All Agents"
          />

          <CustomSelect
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            options={[
              { value: "", label: "All Types" },
              ...uniqueTypes.map((t) => ({ value: t, label: t })),
            ]}
            placeholder="All Types"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col pb-6">
        <Table
          isLoading={loading && transactions.length === 0}
          columns={[
            {
              label: "Date",
              key: "date",
              sortable: true,
              render: (row) => (
                <div className="flex flex-col">
                  <span className="text-sm text-[var(--color-text-main)] whitespace-nowrap font-medium">
                    {new Date(row.date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap mt-0.5">
                    {new Date(row.date).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              ),
              skeletonRender: () => (
                <div className="flex flex-col gap-1">
                  <Skeleton variant="text" className="h-4 w-24" />
                  <Skeleton variant="text" className="h-3 w-16" />
                </div>
              ),
            },
            {
              label: "Lead",
              key: "leadName",
              sortable: true,
              render: (row) => (
                <div className="flex flex-col">
                  <span className="text-[var(--color-text-main)] font-semibold text-sm whitespace-nowrap">
                    {row.leadName || (
                      <span className="text-[var(--color-text-light)] italic">
                        Unknown
                      </span>
                    )}
                  </span>
                  {row.leadUsername && (
                    <span className="text-[var(--color-text-muted)] text-xs mt-0.5 opacity-75 whitespace-nowrap">
                      @{row.leadUsername}
                    </span>
                  )}
                </div>
              ),
              skeletonRender: () => (
                <div className="flex flex-col gap-1">
                  <Skeleton variant="text" className="h-4 w-32" />
                  <Skeleton variant="text" className="h-3 w-20" />
                </div>
              ),
            },
            {
              label: "Agent",
              key: "agentName",
              sortable: true,
              render: (row) => (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold shrink-0 border border-[var(--color-primary)]/20 text-xs">
                    {row.agentName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <span className="text-sm font-medium text-[var(--color-text-main)] whitespace-nowrap">
                    {row.agentName || "Unassigned"}
                  </span>
                </div>
              ),
              skeletonRender: () => (
                <div className="flex items-center gap-2">
                  <Skeleton variant="circular" className="h-7 w-7 shrink-0" />
                  <Skeleton variant="text" className="h-4 w-24" />
                </div>
              ),
            },
            {
              label: "Type",
              key: "type",
              sortable: true,
              render: (row) => (
                <span
                  className={`px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${getTypeBadgeStyle(row.type)}`}
                >
                  {row.type}
                </span>
              ),
              skeletonRender: () => (
                <Skeleton
                  variant="rectangular"
                  className="h-6 w-24 rounded-full"
                />
              ),
            },
            {
              label: "Details",
              key: "tierName",
              render: (row) => (
                <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
                  {row.tierName || row.eventName || "—"}
                  {row.offerApplied && (
                    <span className="ml-1.5 text-amber-600 font-medium">
                      ({row.discountPercentage}% off)
                    </span>
                  )}
                </span>
              ),
              skeletonRender: () => (
                <Skeleton variant="text" className="h-4 w-32" />
              ),
            },
            {
              label: "Amount",
              key: "amount",
              sortable: true,
              render: (row) => (
                <span className="font-semibold text-sm text-emerald-600 whitespace-nowrap">
                  ₹{(row.amount || 0).toLocaleString("en-IN")}
                </span>
              ),
              skeletonRender: () => (
                <Skeleton variant="text" className="h-4 w-16" />
              ),
            },
            {
              label: "Action",
              key: "action",
              render: (row) => (
                <button
                  onClick={() => navigate(`/customers/${row.leadId}`)}
                  className="p-1.5 rounded cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
                  title="View Customer"
                >
                  <Eye size={18} />
                </button>
              ),
              skeletonRender: () => (
                <Skeleton variant="rectangular" className="h-7 w-7 rounded" />
              ),
            },
          ]}
          data={filteredTransactions}
          itemsPerPage={10}
        />
      </div>
    </div>
  );
}
