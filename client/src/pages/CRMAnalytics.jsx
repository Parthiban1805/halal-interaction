import {
  AlertCircle,
  BarChart2,
  MessageCircle,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import Button from "../components/ui/Button";
import CustomSelect from "../components/ui/CustomSelect";
import { Skeleton, TableSkeleton } from "../components/ui/Skeleton";
import Table from "../components/ui/Table";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { getLeadStatusColor } from "../utils/statusColors";

export default function CRMAnalytics() {
  const { token, user } = useAuth();
  const [data, setData] = useState(null);
  const [globalData, setGlobalData] = useState(null);
  const [wordCloudData, setWordCloudData] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardPage, setLeaderboardPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const [periodType, setPeriodType] = useState("preset");
  const [period, setPeriod] = useState("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [agents, setAgents] = useState([]);
  const [agentFilter, setAgentFilter] = useState("all");

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch(`${API_URL}/api/leads/agents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setAgents(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    if (token) fetchAgents();
  }, [token]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (periodType === "custom" && (!startDate || !endDate)) return;

      setLoading(true);
      try {
        let baseUrl = `${API_URL}/api/analytics/dashboard?`;
        let leaderboardUrl = `${API_URL}/api/analytics/leaderboard?`;
        if (periodType === "preset") {
          baseUrl += `period=${period}`;
          leaderboardUrl += `period=${period}`;
        } else {
          baseUrl += `startDate=${startDate}&endDate=${endDate}`;
          leaderboardUrl += `startDate=${startDate}&endDate=${endDate}`;
        }

        const actualAgentId = ['admin', 'superadmin'].includes(user?.role) ? agentFilter : user?._id;
        const filteredUrl =
          actualAgentId && actualAgentId !== "all"
            ? `${baseUrl}&agentId=${actualAgentId}`
            : baseUrl;

        const fetches = [
          fetch(filteredUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_URL}/api/analytics/wordcloud`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(leaderboardUrl, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ];
        // When admin filter is active, also fetch global (unfiltered) data for charts/sources
        if (['admin', 'superadmin'].includes(user?.role) && agentFilter && agentFilter !== "all") {
          fetches.push(
            fetch(baseUrl, { headers: { Authorization: `Bearer ${token}` } }),
          );
        }

        const results = await Promise.all(fetches);
        const [res, wordRes, lbRes] = results;

        if (res.ok) {
          const metrics = await res.json();
          setData(metrics);
        }
        // If we fetched global data separately, use it; otherwise global = filtered
        if (['admin', 'superadmin'].includes(user?.role) && agentFilter && agentFilter !== "all" && results[3]) {
          if (results[3].ok) {
            const gMetrics = await results[3].json();
            setGlobalData(gMetrics);
          }
        } else {
          if (res.ok) {
            setGlobalData(null); // null means use `data` directly
          }
        }
        if (wordRes.ok) {
          const words = await wordRes.json();
          setWordCloudData(words);
        }
        if (lbRes.ok) {
          const lb = await lbRes.json();
          setLeaderboard(lb);
          setLeaderboardPage(0); // Reset page on data change
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchMetrics();
    }
  }, [token, periodType, period, startDate, endDate, agentFilter]);

  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">
          Dashboard
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Track your lead pipeline, conversion metrics, and social activity.
        </p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
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
              setPeriod(
                val === "24h" || val === "all" || val === "this_month" || val === "last_month" 
                  ? val 
                  : Number(val)
              );
            }
          }}
          options={[
            { value: "this_month", label: "This Month" },
            { value: "last_month", label: "Last Month" },
            { value: "all", label: "All Time" },
            { value: "24h", label: "Last 24 Hours" },
            { value: 2, label: "Last 2 Days" },
            { value: 7, label: "Last 7 Days" },
            { value: 14, label: "Last 14 Days" },
            { value: 30, label: "Last 30 Days" },
            { value: 60, label: "Last 2 Months" },
            { value: 180, label: "Last 6 Months" },
            { value: 365, label: "Last 1 Year" },
            { value: "custom", label: "Custom Range..." },
          ]}
        />

        {/* Agent Filter */}
        {['admin', 'superadmin'].includes(user?.role) && agents.length > 0 && (
          <CustomSelect searchable={true}
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            options={[
              { value: "all", label: "All Agents" },
              { value: "me", label: "Assigned to Me" },
              { value: "unassigned", label: "Unassigned" },
              ...agents.map((a) => ({ value: a._id, label: `${a.name} (${a.role})` })),
            ]}
          />
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="fade-in space-y-4 pb-20 flex flex-col">
        {renderHeader()}
        
        {/* KPI Cards Skeleton */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <Skeleton variant="text" className="h-4 w-32" />
              </div>
              <Skeleton variant="text" className="h-8 w-16" />
            </div>
          ))}
        </div>

        {/* Middle Row Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 flex flex-col min-w-0">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden p-4">
              <TableSkeleton rows={5} columns={4} />
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-col min-w-0 card-panel p-5 gap-4">
            <Skeleton variant="text" className="h-4 w-40 mb-4" />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton variant="text" className="h-4 w-20" />
                  <Skeleton variant="text" className="h-4 w-12" />
                </div>
                <Skeleton variant="rectangular" className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Row Skeleton */}
        {['admin', 'superadmin'].includes(user?.role) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mt-4">
            <div className="lg:col-span-7 card-panel p-5 h-[360px] flex flex-col">
              <Skeleton variant="text" className="h-4 w-48 mb-6" />
              <Skeleton variant="rectangular" className="flex-1 w-full rounded-lg" />
            </div>
            <div className="lg:col-span-5 card-panel p-5 h-[360px] flex flex-col">
              <Skeleton variant="text" className="h-4 w-32 mb-6" />
              <div className="flex-1 flex justify-center items-center">
                <Skeleton variant="circular" className="h-48 w-48" />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="fade-in space-y-4 pb-20 flex flex-col">
        {renderHeader()}
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          Failed to load analytics dashboard data.
        </div>
      </div>
    );
  }

  const { leads, chartData: filteredChartData } = data;
  // Use global data for charts/sources/social when agent filter is active
  const global = globalData || data;
  const chartData = global.chartData;
  const globalLeads = global.leads;

  // Stage distribution config
  const normalStages = [
    { key: "new", label: "New", color: getLeadStatusColor("New") },
    { key: "notPicking", label: "Not Picking", color: getLeadStatusColor("Not Picking") },
    { key: "sentWhatsApp", label: "Sent WhatsApp", color: getLeadStatusColor("Sent WhatsApp") },
    { key: "callLater", label: "Call Later", color: getLeadStatusColor("Call Later") },
    { key: "spoken", label: "Spoken", color: getLeadStatusColor("Spoken") },
    { key: "pitchedMembership", label: "Pitched Membership", color: getLeadStatusColor("Pitched Membership") },
    { key: "followingUp", label: "Following Up", color: getLeadStatusColor("Following Up") },
    { key: "paymentPending", label: "Payment Pending", color: getLeadStatusColor("Payment Pending") },
    { key: "won", label: "Won", color: getLeadStatusColor("Won") },
    { key: "lost", label: "Lost", color: getLeadStatusColor("Lost") },
  ];

  const specialStages = [
    { key: "onHold", label: "On Hold", color: getLeadStatusColor("On Hold") },
    { key: "wrongNumber", label: "Wrong Number", color: getLeadStatusColor("Wrong Number") },
  ];

  const totalDistribution = Object.values(leads.distribution).reduce(
    (a, b) => a + b,
    0,
  );

  const rankColors = ["#2563eb", "#64748b", "#94a3b8"];

  const tableData = leaderboard.map((agent, idx) => ({
    ...agent,
    rank: idx + 1,
    wonRate: agent.total > 0 ? Math.round((agent.won / agent.total) * 100) : 0,
    lostRate:
      agent.total > 0 ? Math.round((agent.lost / agent.total) * 100) : 0,
  }));

  const leaderboardColumns = [
    {
      label: "#",
      key: "rank",
      sortable: true,
      className: "w-16",
      render: (agent) => (
        <span
          className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
          style={{
            backgroundColor:
              agent.rank <= 3
                ? `${rankColors[agent.rank - 1]}20`
                : "var(--color-bg-active)",
            color:
              agent.rank <= 3
                ? rankColors[agent.rank - 1]
                : "var(--color-text-muted)",
          }}>
          {agent.rank}
        </span>
      ),
    },
    {
      label: "Name",
      key: "name",
      sortable: true,
      render: (agent) => (
        <span className="font-semibold text-[var(--color-text-main)] truncate block min-w-0">
          {agent.name}
        </span>
      ),
    },
    {
      label: "Assigned",
      key: "total",
      sortable: true,
      className: "text-left font-semibold text-[var(--color-text-main)]",
      render: (agent) => agent.total,
    },
    {
      label: "Pitched",
      key: "pitched",
      sortable: true,
      className: "text-left",
      render: (agent) => (
        <div>
          <span className="font-semibold text-pink-500">{agent.pitched || 0}</span>
        </div>
      ),
    },
    {
      label: "Won",
      key: "won",
      sortable: true,
      className: "text-left",
      render: (agent) => (
        <div>
          <span className="font-semibold text-blue-600">{agent.won}</span>
        </div>
      ),
    },
    {
      label: "Lost",
      key: "lost",
      sortable: true,
      className: "text-left",
      render: (agent) => (
        <div>
          <span className="font-semibold text-slate-600">{agent.lost}</span>
        </div>
      ),
    },
    {
      label: "Conv %",
      key: "wonRate",
      sortable: true,
      className: "text-left",
      render: (agent) => (
        <span className="font-semibold text-blue-600">{agent.wonRate}%</span>
      ),
    },
  ];

  return (
    <div className="fade-in space-y-4 pb-20 flex flex-col">
      {/* Header & Filters */}
      {renderHeader()}

      {/* ═══════════════ KPI cards ═══════════════ */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
            {/* Total Interactions */}
            {['admin', 'superadmin'].includes(user?.role) && (!agentFilter || agentFilter === 'all') && (
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Total Interactions
                </span>
                <span
                  title="Total number of leads in the CRM (all priorities)"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.total}
              </h3>
            </div>
            )}

            {/* Hot Leads */}
            {['admin', 'superadmin'].includes(user?.role) && (!agentFilter || agentFilter === 'all') && (
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Hot Leads
                </span>
                <span
                  title="Hot-priority leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                  {leads.hot}
                </h3>
              </div>
            </div>
            )}

            {/* Assigned Leads */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Assigned Leads
                </span>
                <span
                  title="Assigned Pipeline Leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.assigned || 0}
              </h3>
            </div>

            {/* Unassigned Leads */}
            {user?.role !== 'agent' && (
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Unassigned Leads
                </span>
                <span
                  title="Unassigned Pipeline Leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.unassigned || 0}
              </h3>
            </div>
            )}

            {/* Conversion Rate */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Conversion Rate
                </span>
                <span
                  title="Won / Assigned Leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                  {leads.conversionRate}%
                </h3>
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  ({leads.distribution?.won || 0} Won)
                </span>
              </div>
            </div>

            {/* Lost Rate */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Lost Rate
                </span>
                <span
                  title="Lost / Assigned Leads"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                  {leads.lostRate}%
                </h3>
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  ({leads.distribution?.lost || 0} Lost)
                </span>
              </div>
            </div>

            {/* Future City Leads */}
            {user?.role !== 'agent' && (
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Future City Leads
                </span>
                <span
                  title="Leads outside current serviceable areas"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.futureCity || 0}
              </h3>
            </div>
            )}

            {/* Payment Pending Leads */}
            <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">
                  Payment Pending
                </span>
                <span
                  title="Leads that have committed to payment but haven't paid yet"
                  className="flex items-center cursor-help">
                  <AlertCircle
                    size={14}
                    className="text-[var(--color-text-light)]"
                  />
                </span>
              </div>
              <h3 className="text-2xl font-bold text-[var(--color-text-main)] leading-none">
                {leads.distribution?.paymentPending || 0}
              </h3>
            </div>
      </div>

      {/* ═══════════════ MIDDLE ROW: Leaderboard (2/3) + Stage Distribution (1/3) ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT — Leaderboard */}
        <div className="lg:col-span-8 flex flex-col min-w-0">
          <Table
            columns={leaderboardColumns}
            data={tableData}
            itemsPerPage={10}
            currentPage={leaderboardPage + 1}
            onPageChange={(page) => setLeaderboardPage(page - 1)}
          />
        </div>

        {/* RIGHT — Lead Stage Distribution */}
        <div className="lg:col-span-4 flex flex-col min-w-0">
{/* Lead Stage Distribution */}
          <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300 flex flex-col flex-1">
            <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider  mb-4 flex items-center justify-between">
              <span>Lead Stage Distribution</span>
            </h3>

            <div className="flex flex-col gap-4 flex-1">
              {/* Normal Stages */}
              <div className="space-y-4">
                {normalStages.map((stage) => {
                  const count = leads.distribution[stage.key] || 0;
                  const pct =
                    totalDistribution > 0
                      ? (count / totalDistribution) * 100
                      : 0;

                  return (
                    <div key={stage.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-[var(--color-text-main)]">
                          {stage.label}
                        </span>
                        <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                          {count} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[var(--color-bg-active)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: stage.color,
                            }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Special Stages */}
              <div className="space-y-4">
                {specialStages.map((stage) => {
                  const count = leads.distribution[stage.key] || 0;
                  const pct =
                    totalDistribution > 0
                      ? (count / totalDistribution) * 100
                      : 0;

                  return (
                    <div key={stage.key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-[var(--color-text-main)]">
                          {stage.label}
                        </span>
                        <span className="text-sm font-semibold text-[var(--color-text-muted)]">
                          {count} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-[var(--color-bg-active)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: stage.color,
                            }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ ROW 2: Social Activity Volume (left) | Lead Origins (right) ═══════════════ */}
      {['admin', 'superadmin'].includes(user?.role) && (
        <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Social Activity Volume — takes 7 cols to align with leaderboard */}
        <div className="lg:col-span-7 card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300">
          <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider  mb-6 flex items-center gap-1.5">
            Social Activity Volume
          </h3>

          <div className="w-full h-[300px] mt-4 font-sans">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="blueGradientDark"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1">
                    <stop offset="5%" stopColor="#1e40af" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border-subtle)"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--color-text-muted)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--color-text-muted)",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <RechartsTooltip
                  cursor={{
                    stroke: "var(--color-border-focus)",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                  contentStyle={{
                    backgroundColor: "var(--color-bg-card)",
                    borderColor: "var(--color-border-subtle)",
                    borderRadius: "8px",
                    color: "var(--color-text-main)",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  itemStyle={{ fontWeight: 600 }}
                  labelStyle={{
                    fontWeight: 700,
                    color: "var(--color-text-main)",
                    marginBottom: "4px",
                  }}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--color-text-muted)",
                  }}
                  iconType="circle"
                  iconSize={"8px"}
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  name="Direct Messages (DMs)"
                  stroke="#1e40af"
                  strokeWidth={0.5}
                  fillOpacity={1}
                  fill="url(#blueGradientDark)"
                />
                <Area
                  type="monotone"
                  dataKey="comments"
                  name="Comments Feed"
                  stroke="#3b82f6"
                  strokeWidth={0.5}
                  fillOpacity={1}
                  fill="url(#blueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Origins — takes 5 cols to align with right panel */}
        <div className="lg:col-span-5 card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider  mb-4">
              Lead Origins
            </h3>
            <div className="w-full h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: "Direct Messages",
                        value: globalLeads.sources["dm"] || 0,
                        color: "#1e3a8a",
                      },
                      {
                        name: "Post Comments",
                        value: globalLeads.sources["comment"] || 0,
                        color: "#3b82f6",
                      },
                      {
                        name: "Manually Added",
                        value: globalLeads.sources["manual"] || 0,
                        color: "#94a3b8",
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value">
                    {[
                      {
                        name: "Direct Messages",
                        value: globalLeads.sources["dm"] || 0,
                        color: "#1e3a8a",
                      },
                      {
                        name: "Post Comments",
                        value: globalLeads.sources["comment"] || 0,
                        color: "#3b82f6",
                      },
                      {
                        name: "Manually Added",
                        value: globalLeads.sources["manual"] || 0,
                        color: "#94a3b8",
                      },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--color-bg-card)",
                      borderColor: "var(--color-border-subtle)",
                      borderRadius: "8px",
                      color: "var(--color-text-main)",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                    itemStyle={{
                      fontWeight: 600,
                      color: "var(--color-text-main)",
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    iconSize={"8px"}
                    wrapperStyle={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ ROW 3: Lead Generation (full width) ═══════════════ */}
      <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300">
        <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider  mb-6 flex items-center gap-1.5">
          Lead Generation
        </h3>

        <div className="w-full h-[240px] mt-4 font-sans">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border-subtle)"
                strokeOpacity={0.5}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "var(--color-text-muted)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "var(--color-text-muted)",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              />
              <RechartsTooltip
                cursor={{
                  stroke: "var(--color-border-focus)",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                contentStyle={{
                  backgroundColor: "var(--color-bg-card)",
                  borderColor: "var(--color-border-subtle)",
                  borderRadius: "8px",
                  color: "var(--color-text-main)",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                itemStyle={{ fontWeight: 600 }}
                labelStyle={{
                  fontWeight: 700,
                  color: "var(--color-text-main)",
                  marginBottom: "4px",
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                }}
                iconType="circle"
                iconSize={"8px"}
              />
              <Area
                type="monotone"
                dataKey="leads"
                name="Leads Generated"
                stroke="#3b82f6"
                strokeWidth={0.5}
                fillOpacity={1}
                fill="url(#colorLeads)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ═══════════════ ROW 4: Comment Word Cloud (full width) ═══════════════ */}
      <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300 mb-8">
        <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider  mb-6 flex items-center gap-1.5">
          Comment Word Cloud
        </h3>

        <div className="w-full min-h-80 flex items-center justify-center bg-[var(--color-bg-subtle)] rounded-xl overflow-hidden border border-[var(--color-border-subtle)] p-6">
          {wordCloudData.length > 0 ? (
            <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-center align-middle">
              {(() => {
                const maxVal = Math.max(
                  ...wordCloudData.map((w) => w.value),
                  1,
                );
                const minVal = Math.min(
                  ...wordCloudData.map((w) => w.value),
                  0,
                );
                const colors = [
                  "var(--color-primary)",
                  "var(--color-text-main)",
                  "var(--color-text-muted)",
                  "#6b7280",
                  "#3b82f6",
                ];

                const shuffledWords = [...wordCloudData].sort(
                  (a, b) => (a.text.length % 3) - (b.text.length % 3),
                );

                return shuffledWords.map((w, i) => {
                  const size =
                    12 + ((w.value - minVal) / (maxVal - minVal || 1)) * 24;

                  return (
                    <span
                      key={w.text}
                      title={`${w.text} (${w.value} uses)`}
                      className="cursor-default transition-all duration-300 hover:scale-110"
                      style={{
                        fontSize: `${size}px`,
                        color: colors[i % colors.length],
                        fontWeight:
                          size > 24 ? "800" : size > 16 ? "600" : "500",
                        lineHeight: 1.2,
                        opacity: size > 18 ? 1 : 0.75,
                      }}>
                      {w.text}
                    </span>
                  );
                });
              })()}
            </div>
          ) : (
            <div className="text-[var(--color-text-muted)] flex flex-col items-center gap-2">
              <MessageSquare size={32} className="opacity-20" />
              <p className="text-sm">Not enough comment data for analysis</p>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
