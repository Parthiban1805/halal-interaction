import { formatDistanceToNow } from "date-fns";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../components/ui/Button";
import CustomSelect from "../components/ui/CustomSelect";
import Table from "../components/ui/Table";
import { Skeleton } from "../components/ui/Skeleton";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { getLeadStatusBg, getLeadStatusColor } from "../utils/statusColors";

export default function ActivityFeed() {
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [agentFilter, setAgentFilter] = useState("");

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/leads/activity-feed`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setActivities(data.data);
      } else {
        setError(data.error || "Failed to fetch activity feed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();

    // Auto-refresh every minute
    const interval = setInterval(fetchActivities, 60000);
    return () => clearInterval(interval);
  }, [token]);

  const uniqueAgents = Array.from(
    new Set(
      activities
        .map((a) => a.changedBy?._id || a.changedBy?.id)
        .filter(Boolean),
    ),
  ).map(
    (id) =>
      activities.find((a) => (a.changedBy?._id || a.changedBy?.id) === id)
        .changedBy,
  );

  const filteredActivities = activities.filter((activity) => {
    if (agentFilter) {
      const agentId = activity.changedBy?._id || activity.changedBy?.id;
      return agentId === agentFilter;
    }
    return true;
  });

  const columns = [
    {
      label: "Agent",
      key: "changedBy.name",
      sortable: false,
      render: (activity) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold shrink-0 border border-[var(--color-primary)]/20 text-xs">
            {activity.changedBy?.name?.charAt(0)?.toUpperCase() || "S"}
          </div>
          <span className="font-semibold text-[var(--color-text-main)]">
            {activity.changedBy?.name || "System"}
          </span>
        </div>
      ),
      skeletonRender: () => (
        <div className="flex items-center gap-3">
          <Skeleton variant="circular" className="h-8 w-8 shrink-0" />
          <Skeleton variant="text" className="h-4 w-24" />
        </div>
      )
    },
    {
      label: "Lead",
      key: "leadId.username",
      sortable: false,
      render: (activity) => (
        <span className="font-medium text-[var(--color-text-main)]">
          {activity.leadId?.username || activity.leadId?.name || "Unknown Lead"}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-32" />
    },
    {
      label: "Previous Status",
      key: "oldStage",
      sortable: false,
      render: (activity) => (
        <span
          className="px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap"
          style={{
            backgroundColor: getLeadStatusBg(activity.oldStage),
            color: getLeadStatusColor(activity.oldStage),
            borderColor: getLeadStatusBg(activity.oldStage),
          }}>
          {activity.oldStage}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="rectangular" className="h-6 w-20 rounded-full" />
    },
    {
      label: "New Status",
      key: "newStage",
      sortable: false,
      render: (activity) => (
        <span
          className="px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap"
          style={{
            backgroundColor: getLeadStatusBg(activity.newStage),
            color: getLeadStatusColor(activity.newStage),
            borderColor: getLeadStatusBg(activity.newStage),
          }}>
          {activity.newStage}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="rectangular" className="h-6 w-20 rounded-full" />
    },
    {
      label: "Time",
      key: "createdAt",
      sortable: false,
      className: "text-left",
      render: (activity) => (
        <span className="text-[var(--color-text-muted)] text-sm whitespace-nowrap font-medium">
          {formatDistanceToNow(new Date(activity.createdAt), {
            addSuffix: true,
          })}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-24" />
    },
  ];

  return (
    <div className="fade-in space-y-6 flex flex-col h-full">
      {/* HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">
            Activity Feed
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Track recent lead status changes across all agents.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CustomSelect searchable={true}
            value={agentFilter}
            onChange={(e) => {
              setAgentFilter(e.target.value);
              setPage(0);
            }}
            options={[
              { value: "", label: "All Agents" },
              { value: "system", label: "System" },
              ...uniqueAgents.map((a) => ({
                value: a._id || a.id,
                label: a.name,
              })),
            ]}
          />
          <Button
            variant="outline"
            onClick={fetchActivities}
            disabled={loading}
            icon={RefreshCw}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-500/20 flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-medium">{error}</span>
        </div>
      )}

      {/* DATA TABLE */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col pb-6">
        <Table
          columns={columns}
          data={filteredActivities}
          isLoading={loading && activities.length === 0}
          itemsPerPage={10}
          currentPage={page + 1}
          onPageChange={(p) => setPage(p - 1)}
          keyField="_id"
          className="h-full"
        />
      </div>
    </div>
  );
}
