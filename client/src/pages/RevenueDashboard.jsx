import { Eye, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import CustomSelect from "../components/ui/CustomSelect";
import Modal from "../components/ui/Modal";
import { Skeleton, TableSkeleton } from "../components/ui/Skeleton";
import Table from "../components/ui/Table";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function RevenueDashboard() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [periodType, setPeriodType] = useState("preset");
  const [period, setPeriod] = useState("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [selectedAgentForModal, setSelectedAgentForModal] = useState(null);
  const [agentTransactions, setAgentTransactions] = useState([]);
  const [agentTransactionsLoading, setAgentTransactionsLoading] =
    useState(false);
  const [transactionSearchQuery, setTransactionSearchQuery] = useState("");
  const [transactionTypeFilter, setTransactionTypeFilter] = useState("");

  useEffect(() => {
    const fetchRevenue = async () => {
      if (periodType === "custom" && (!startDate || !endDate)) return;
      setLoading(true);
      try {
        let url = `${API_URL}/api/analytics/revenue?`;
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
          setData(json);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchRevenue();
  }, [token, periodType, period, startDate, endDate]);

  const COLORS = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"];

  const MetricCard = ({ title, value, subtitle, valueColor }) => (
    <div className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden group">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          {title}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h3
          className={`text-2xl font-bold leading-none ${valueColor || "text-[var(--color-text-main)]"}`}>
          ₹
          {Number(value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </h3>
        {subtitle && (
          <span className="text-xs font-medium text-[var(--color-text-muted)]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  const fetchAgentTransactions = async (agent) => {
    setSelectedAgentForModal(agent);
    setAgentTransactionsLoading(true);
    setAgentTransactions([]);
    setTransactionSearchQuery("");
    setTransactionTypeFilter("");
    try {
      let url = `${API_URL}/api/analytics/revenue/agent/${agent.agentId || "unassigned"}?`;
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
        setAgentTransactions(json.transactions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAgentTransactionsLoading(false);
    }
  };

  const filteredAgentTransactions = agentTransactions.filter((tx) => {
    if (transactionTypeFilter && tx.type !== transactionTypeFilter)
      return false;
    if (!transactionSearchQuery) return true;
    const q = transactionSearchQuery.toLowerCase();
    return (
      (tx.leadName && tx.leadName.toLowerCase().includes(q)) ||
      (tx.leadUsername && tx.leadUsername.toLowerCase().includes(q))
    );
  });

  const uniqueTransactionTypes = [
    ...new Set(agentTransactions.map((t) => t.type).filter(Boolean)),
  ].sort();

  return (
    <div className="fade-in space-y-4 pb-20 flex flex-col">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-main)]">
            Revenue Dashboard
          </h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Track GST-inclusive and exclusive revenue metrics.
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
              { value: "custom", label: "Custom Range" },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* TOP: Metrics Grid Skeleton */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="card-panel p-5 flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <Skeleton variant="text" className="h-4 w-32" />
                </div>
                <div className="flex flex-col gap-2">
                  <Skeleton variant="text" className="h-8 w-24" />
                  <Skeleton variant="text" className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>

          {/* MIDDLE: Charts Skeleton */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
            <div className="lg:col-span-2 card-panel p-5 flex flex-col h-[320px]">
              <Skeleton variant="text" className="h-4 w-32 mb-6" />
              <Skeleton
                variant="rectangular"
                className="flex-1 w-full rounded-lg"
              />
            </div>
            <div className="lg:col-span-1 card-panel p-5 flex flex-col h-[320px]">
              <Skeleton variant="text" className="h-4 w-40 mb-6" />
              <div className="flex-1 border border-[var(--color-border-subtle)] rounded-lg overflow-hidden">
                <TableSkeleton rows={4} columns={4} />
              </div>
            </div>
          </div>

          {/* BOTTOM: Table Skeleton */}
          <div className="lg:col-span-12 flex flex-col gap-4 min-w-0 mt-2">
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden p-4">
              <TableSkeleton rows={5} columns={8} />
            </div>
          </div>
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-[var(--color-text-muted)]">
          Failed to load revenue data.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* TOP: Metrics Grid */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-w-0">
            {/* ROW 1: Inclusive GST */}
            <MetricCard
              title="Total Revenue (Inc. GST)"
              value={data.totalRevenueInclusive}
              subtitle=""
            />
            <MetricCard
              title="Membership Rev. (Inc. GST)"
              value={data.membershipRevenueInclusive}
              subtitle=""
            />
            <MetricCard
              title="Renewal Rev. (Inc. GST)"
              value={data.renewalRevenueInclusive}
              subtitle=""
            />
            <MetricCard
              title="Event Rev. (Inc. GST)"
              value={data.eventRevenueInclusive}
              subtitle=""
            />

            {/* ROW 2: Exclusive GST */}
            <MetricCard
              title="Total Revenue (Exc. GST)"
              value={data.totalRevenueExclusive}
              subtitle="(18% tax deducted)"
              valueColor="text-blue-600 dark:text-blue-500"
            />
            <MetricCard
              title="Membership Rev. (Exc. GST)"
              value={data.membershipRevenueExclusive}
              subtitle="(18% tax deducted)"
            />
            <MetricCard
              title="Renewal Rev. (Exc. GST)"
              value={data.renewalRevenueExclusive}
              subtitle="(18% tax deducted)"
            />
            <MetricCard
              title="Event Rev. (Exc. GST)"
              value={data.eventRevenueExclusive}
              subtitle="(18% tax deducted)"
            />
          </div>

          {/* MIDDLE: Charts */}
          <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-3 gap-4 min-w-0">
            {/* Revenue Trend Chart */}
            <div className="lg:col-span-2 card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300 flex flex-col flex-1">
              <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-6 flex items-center gap-1.5">
                Revenue Trend
              </h3>
              <div className="flex-1 min-h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={data.chartData || []}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="#2563eb"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="var(--color-border-subtle)"
                    />
                    <XAxis
                      dataKey="fullDate"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                      dy={10}
                      tickFormatter={(value) => {
                        const match = (data.chartData || []).find(
                          (d) => d.fullDate === value,
                        );
                        return match ? match.day : value;
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "var(--color-text-muted)", fontSize: 12 }}
                      tickFormatter={(value) =>
                        `₹${value >= 1000 ? (value / 1000).toFixed(1) + "k" : value}`
                      }
                      width={60}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--color-bg-card)",
                        borderColor: "var(--color-border-subtle)",
                        borderRadius: "0.75rem",
                        color: "var(--color-text-main)",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      itemStyle={{ color: "var(--color-text-main)" }}
                      formatter={(value) => [
                        `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        "Revenue",
                      ]}
                      labelStyle={{
                        color: "var(--color-text-muted)",
                        marginBottom: "0.25rem",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#2563eb"
                      strokeWidth={0.5}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tier-wise Revenue Pie Chart */}
            <div className="flex-1 min-h-[250px] w-full flex items-center justify-center">
              {data.tierRevenueData && data.tierRevenueData.length > 0 ? (
                <div className="w-full h-full overflow-y-auto">
                  <Table
                    columns={[
                      {
                        label: "Tier Name",
                        key: "name",
                        render: (item) => (
                          <span className="font-semibold text-[var(--color-text-main)]">
                            {item.name}
                          </span>
                        ),
                      },
                      {
                        label: "New",
                        key: "newCount",
                        className: "text-center",
                        render: (item) => (
                          <span className="font-semibold text-[var(--color-text-main)]">
                            {item.newCount || 0}
                          </span>
                        ),
                      },
                      {
                        label: "Renewals",
                        key: "renewalCount",
                        className: "text-center",
                        render: (item) => (
                          <span className="font-semibold text-[var(--color-text-main)]">
                            {item.renewalCount || 0}
                          </span>
                        ),
                      },
                      {
                        label: "Revenue",
                        key: "value",
                        className: "text-left",
                        render: (item) => (
                          <span className="font-semibold text-[var(--color-text-muted)]">
                            ₹
                            {Number(item.value || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        ),
                      },
                    ]}
                    data={data.tierRevenueData}
                  />
                </div>
              ) : (
                <div className="text-[var(--color-text-muted)] text-sm">
                  No membership revenue data.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-12 flex flex-col gap-4 min-w-0 mt-2">
            {/* Table: Revenue By Salesperson */}
            <Table
              columns={[
                { label: "Agent", key: "agentName", sortable: true },
                { label: "Deals Won", key: "dealsWon", sortable: true },
                { label: "New", key: "newMemberships", sortable: true },
                { label: "Renewal", key: "renewals", sortable: true },
                { label: "Upgrade", key: "upgrades", sortable: true },
                { label: "Event", key: "events", sortable: true },
                {
                  label: "Revenue (Inc. GST)",
                  key: "totalInclusive",
                  sortable: true,
                  render: (row) => (
                    <span className="font-semibold text-[var(--color-text-muted)]">
                      ₹
                      {Number(row.totalInclusive || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ),
                },
                {
                  label: "Revenue (Exc. GST)",
                  key: "totalExclusive",
                  sortable: true,
                  render: (row) => (
                    <span className="font-semibold text-blue-600">
                      ₹
                      {Number(row.totalExclusive || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ),
                },
              ]}
              data={data.revenueByAgent || []}
              onRowClick={fetchAgentTransactions}
            />
          </div>
        </div>
      )}

      {/* Agent Transactions Modal */}
      {selectedAgentForModal && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedAgentForModal(null)}
          title={`${selectedAgentForModal.agentName} - Revenue Transactions`}
          maxWidth="max-w-4xl">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full sm:max-w-md">
                <input
                  type="text"
                  placeholder="Search by lead name or username..."
                  className="w-full bg-white border border-[var(--color-border-subtle)] text-[var(--color-text-main)] text-sm rounded-xl focus:ring-[var(--color-border-focus)] focus:border-transparent pl-10 pr-4 py-2.5"
                  value={transactionSearchQuery}
                  onChange={(e) => setTransactionSearchQuery(e.target.value)}
                />
                <Search
                  className="absolute left-3.5 top-3 text-[var(--color-text-muted)]"
                  size={18}
                />
              </div>

              <div className="w-full sm:w-48">
                <CustomSelect
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value)}
                  options={[
                    { value: "", label: "All Types" },
                    ...uniqueTransactionTypes.map((t) => ({
                      value: t,
                      label: t,
                    })),
                  ]}
                />
              </div>
            </div>
            <Table
              isLoading={agentTransactionsLoading}
              columns={[
                {
                  label: "Date",
                  key: "date",
                  render: (row) =>
                    new Date(row.date).toLocaleDateString("en-IN"),
                },
                {
                  label: "Lead Name",
                  key: "leadName",
                  render: (row) => (
                    <div className="flex flex-col">
                      <span className="text-[var(--color-text-main)] font-semibold text-sm whitespace-nowrap">
                        {row.leadName || (
                          <span className="text-[var(--color-text-light)] italic">
                            Unknown
                          </span>
                        )}
                      </span>
                      <span className="text-[var(--color-text-muted)] text-xs mt-0.5 opacity-75 whitespace-nowrap">
                        {row.leadUsername ? `@${row.leadUsername}` : ""}
                      </span>
                    </div>
                  ),
                },
                { label: "Type", key: "type" },
                {
                  label: "Amount",
                  key: "amount",
                  render: (row) =>
                    `₹${Number(row.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
                {
                  label: "Action",
                  key: "action",
                  render: (row) => (
                    <button
                      onClick={() => navigate(`/customers/${row.leadId}`)}
                      className="p-1.5 rounded cursor-pointer text-[var(--color-text-muted)]"
                      title="View Customer">
                      <Eye size={18} />
                    </button>
                  ),
                },
              ]}
              data={filteredAgentTransactions}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}
