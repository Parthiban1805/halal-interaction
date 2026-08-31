import {
  Calendar,
  MapPin,
  MoreHorizontal,
  Plus,
  Store,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import Checkbox from "../components/ui/Checkbox";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton';
import CustomSelect from "../components/ui/CustomSelect";
import Table from "../components/ui/Table";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function AdminEventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [event, setEvent] = useState(null);
  const [activities, setActivities] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("activities"); // 'activities' or 'expenses'

  // Modal states for activities
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [savingActivity, setSavingActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  const [activityFormData, setActivityFormData] = useState({
    type: "Stall Booking",
    title: "",
    description: "",
    date: "",
    amount: 0,
    status: "Pending",
  });

  // Modal states for expenses
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [savingExpense, setSavingExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseFormData, setExpenseFormData] = useState({
    title: "",
    amount: 0,
    category: "Other",
    date: "",
    description: "",
  });

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null); // 'activity', 'expense', 'bulk-activity', or 'bulk-expense'
  const [deleting, setDeleting] = useState(false);

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Selection state
  const [selectedActivities, setSelectedActivities] = useState([]);
  const [visibleActivities, setVisibleActivities] = useState([]);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [visibleExpenses, setVisibleExpenses] = useState([]);

  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const [eventRes, activitiesRes, expensesRes, participantsRes, eligibleRes] =
        await Promise.all([
          fetch(`${API_URL}/api/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/events/${eventId}/activities`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/events/${eventId}/expenses`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/events/${eventId}/participants`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/events/${eventId}/eligible-customers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      if (!eventRes.ok) {
        toast.error("Failed to fetch event");
        navigate("/admin/events");
        return;
      }

      const eventData = await eventRes.json();
      const activitiesData = await activitiesRes.json();
      const expensesData = await expensesRes.json();
      const participantsData = await participantsRes.json();
      const eligibleData = await eligibleRes.json();

      setEvent(eventData);
      setActivities(activitiesData);
      setExpenses(expensesData);
      setParticipants(participantsData);
    } catch (err) {
      toast.error("Error fetching event data");
      navigate("/admin/events");
    } finally {
      setLoading(false);
    }
  };

  // Activity Handlers
  const handleOpenActivityModal = (activity = null) => {
    if (activity) {
      setEditingActivity(activity);
      setActivityFormData({
        type: activity.type,
        title: activity.title,
        description: activity.description || "",
        date: activity.date
          ? new Date(activity.date).toISOString().split("T")[0]
          : "",
        amount: activity.amount || 0,
        status: activity.status,
      });
    } else {
      setEditingActivity(null);
      setActivityFormData({
        type: "Other",
        title: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
        amount: 0,
        status: "Confirmed",
      });
    }
    setIsActivityModalOpen(true);
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    setSavingActivity(true);

    const url = editingActivity
      ? `${API_URL}/api/events/activities/${editingActivity._id}`
      : `${API_URL}/api/events/${eventId}/activities`;

    const method = editingActivity ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...activityFormData,
          amount: Number(activityFormData.amount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          editingActivity ? "Activity updated" : "Activity created",
        );
        fetchEventData();
        setIsActivityModalOpen(false);
      } else {
        toast.error(data.error || "Failed to save activity");
      }
    } catch (err) {
      toast.error("Error saving activity");
    } finally {
      setSavingActivity(false);
    }
  };

  // Expense Handlers
  const handleOpenExpenseModal = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseFormData({
        title: expense.title,
        amount: expense.amount,
        category: expense.category,
        date: expense.date
          ? new Date(expense.date).toISOString().split("T")[0]
          : "",
        description: expense.description || "",
      });
    } else {
      setEditingExpense(null);
      setExpenseFormData({
        title: "",
        amount: 0,
        category: "Other",
        date: new Date().toISOString().split("T")[0],
        description: "",
      });
    }
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    setSavingExpense(true);

    const url = editingExpense
      ? `${API_URL}/api/events/expenses/${editingExpense._id}`
      : `${API_URL}/api/events/${eventId}/expenses`;

    const method = editingExpense ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...expenseFormData,
          amount: Number(expenseFormData.amount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(editingExpense ? "Expense updated" : "Expense logged");
        fetchEventData();
        setIsExpenseModalOpen(false);
      } else {
        toast.error(data.error || "Failed to save expense");
      }
    } catch (err) {
      toast.error("Error saving expense");
    } finally {
      setSavingExpense(false);
    }
  };

  // Delete Handlers
  const handleDeleteClick = (item, type) => {
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);

    let url, method, body;
    if (deleteType === "activity") {
      url = `${API_URL}/api/events/activities/${itemToDelete._id}`;
      method = "DELETE";
    } else if (deleteType === "expense") {
      url = `${API_URL}/api/events/expenses/${itemToDelete._id}`;
      method = "DELETE";
    } else if (deleteType === "bulk-activity") {
      url = `${API_URL}/api/events/activities/bulk-delete`;
      method = "POST";
      body = JSON.stringify({ activityIds: selectedActivities });
    } else if (deleteType === "bulk-expense") {
      url = `${API_URL}/api/events/expenses/bulk-delete`;
      method = "POST";
      body = JSON.stringify({ expenseIds: selectedExpenses });
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body,
      });
      if (res.ok) {
        toast.success(
          deleteType.startsWith("bulk")
            ? "Items deleted successfully"
            : `${deleteType === "activity" ? "Activity" : "Expense"} deleted`,
        );
        fetchEventData();
        if (deleteType === "bulk-activity") setSelectedActivities([]);
        if (deleteType === "bulk-expense") setSelectedExpenses([]);
      } else {
        const data = await res.json();
        toast.error(data.error || `Failed to delete items`);
      }
    } catch (err) {
      toast.error(`Error deleting items`);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      setDeleteType(null);
    }
  };

  const handleCancelEvent = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`${API_URL}/api/events/${eventId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...event,
          status: "Cancelled",
          allowedTiers: event.allowedTiers.map((t) => t._id || t),
        }),
      });
      if (res.ok) {
        toast.success("Event cancelled successfully");
        fetchEventData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel event");
      }
    } catch (err) {
      toast.error("Error cancelling event");
    } finally {
      setCancelling(false);
      setShowCancelConfirm(false);
    }
  };

  if (loading || !event) {
    return (
      <div className="fade-in space-y-4 pb-20 flex flex-col">
        {/* Page Header Skeleton */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <div className="space-y-2">
            <Skeleton variant="text" className="h-6 w-48" />
            <Skeleton variant="text" className="h-4 w-64" />
          </div>
          <Skeleton variant="rectangular" className="h-10 w-32 rounded-lg" />
        </div>

        {/* Top Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-panel p-6 flex flex-col gap-4 relative overflow-hidden h-[200px]">
            <Skeleton variant="text" className="h-6 w-48 mb-2" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton variant="circular" className="h-4 w-4 shrink-0" />
                  <Skeleton variant="text" className="h-4 w-40" />
                </div>
              ))}
            </div>
          </div>
          <div className="card-panel p-6 flex flex-col gap-4 relative overflow-hidden h-[200px]">
            <Skeleton variant="text" className="h-4 w-32 mb-2" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton variant="text" className="h-3 w-20" />
                  <Skeleton variant="text" className="h-6 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Section Skeleton */}
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex gap-2">
            <Skeleton variant="rectangular" className="h-10 w-32 rounded-lg" />
            <Skeleton variant="rectangular" className="h-10 w-32 rounded-lg" />
          </div>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden p-4">
            <div className="flex justify-between items-center mb-4">
              <Skeleton variant="text" className="h-6 w-40" />
              <div className="flex gap-2">
                <Skeleton variant="rectangular" className="h-10 w-32 rounded-lg" />
                <Skeleton variant="rectangular" className="h-10 w-32 rounded-lg" />
              </div>
            </div>
            <TableSkeleton rows={4} columns={5} />
          </div>
        </div>

        {/* Bottom Section Skeleton */}
        <div className="mt-4 flex flex-col gap-4">
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden p-4">
            <div className="mb-4">
              <Skeleton variant="text" className="h-6 w-40" />
            </div>
            <TableSkeleton rows={5} columns={4} />
          </div>
        </div>
      </div>
    );
  }

  // Analytics Calculations
  const totalActivityRevenue = activities
    .filter((a) => ["Confirmed", "Completed"].includes(a.status))
    .reduce((sum, a) => sum + (a.amount || 0), 0);
  const totalParticipantRevenue = participants.reduce(
    (sum, p) => sum + (p.amountPaid || 0),
    0,
  );
  const totalRevenue = totalParticipantRevenue;
  const totalSpending = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenue - totalSpending;
  const explicitlyPaidCount = participants.filter(p => (p.amountPaid || 0) > 0).length;

  const getActivityIcon = (type) => {
    switch (type) {
      case "Stall Booking":
        return <Store className="w-5 h-5 text-blue-500" />;
      case "Meeting":
        return <Users className="w-5 h-5 text-purple-500" />;
      default:
        return <MoreHorizontal className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleToggleSelectAllActivities = () => {
    const visibleIds = visibleActivities.map((a) => a._id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedActivities.includes(id));
    if (allSelected) {
      setSelectedActivities((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedActivities((prev) => {
        const newSelection = [...prev];
        for (const id of visibleIds) {
          if (!newSelection.includes(id)) newSelection.push(id);
        }
        return newSelection;
      });
    }
  };

  const handleToggleSelectActivity = (id) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((aId) => aId !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAllExpenses = () => {
    const visibleIds = visibleExpenses.map((e) => e._id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedExpenses.includes(id));
    if (allSelected) {
      setSelectedExpenses((prev) =>
        prev.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedExpenses((prev) => {
        const newSelection = [...prev];
        for (const id of visibleIds) {
          if (!newSelection.includes(id)) newSelection.push(id);
        }
        return newSelection;
      });
    }
  };

  const handleToggleSelectExpense = (id) => {
    setSelectedExpenses((prev) =>
      prev.includes(id) ? prev.filter((eId) => eId !== id) : [...prev, id],
    );
  };

  const activityColumns = [
    {
      label: (
        <Checkbox
          checked={
            visibleActivities.length > 0 &&
            visibleActivities.every((a) => selectedActivities.includes(a._id))
          }
          onChange={handleToggleSelectAllActivities}
        />
      ),
      key: "select",
      render: (activity) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedActivities.includes(activity._id)}
            onChange={() => handleToggleSelectActivity(activity._id)}
          />
        </div>
      ),
    },
    {
      label: "Title",
      key: "title",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-sm">{row.title}</span>
      ),
    },
    {
      label: "Price",
      key: "amount",
      sortable: true,
      render: (row) => `₹${row.amount?.toLocaleString() || 0}`,
    },
  ];

  const expenseColumns = [
    {
      label: (
        <Checkbox
          checked={
            visibleExpenses.length > 0 &&
            visibleExpenses.every((e) => selectedExpenses.includes(e._id))
          }
          onChange={handleToggleSelectAllExpenses}
        />
      ),
      key: "select",
      render: (expense) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedExpenses.includes(expense._id)}
            onChange={() => handleToggleSelectExpense(expense._id)}
          />
        </div>
      ),
    },
    {
      label: "Title",
      key: "title",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-sm">{row.title}</span>
      ),
    },
    {
      label: "Amount",
      key: "amount",
      sortable: true,
      render: (row) => (
        <span className="font-normal">
          ₹{row.amount?.toLocaleString() || 0}
        </span>
      ),
    },
  ];

  const participantColumns = [
    {
      label: "Customer",
      key: "customer",
      sortable: true,
      render: (p) => (
        <div className="font-semibold text-sm text-[var(--color-text-main)]">
          {p.leadId?.name || p.leadId?.username || "Unknown"}
        </div>
      )
    },
    {
      label: "Contact",
      key: "contact",
      render: (p) => (
        <div className="text-sm text-[var(--color-text-muted)]">
          <div>{p.leadId?.email }</div>
          <div>{p.leadId?.phone}</div>
        </div>
      )
    },
    {
      label: "Activity",
      key: "activity",
      sortable: true,
      render: (p) => (
        <span className="text-sm font-medium text-[var(--color-text-main)]">
          {p.activityId?.title || "Unknown Activity"}
        </span>
      )
    },
    {
      label: "Amount Paid",
      key: "amountPaid",
      sortable: true,
      render: (p) => (
        <div className="text-left text-sm font-semibold text-[var(--color-text-main)] w-full">
          ₹{(p.amountPaid || 0).toLocaleString()}
        </div>
      )
    }
  ];

  const MetricCard = ({ title, value, subtitle, valueColor }) => (
    <div className="card-panel p-4 flex flex-col gap-3 relative overflow-hidden group">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[var(--color-text-muted)]">
          {title}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <h3
          className={`text-2xl font-bold leading-none ${valueColor || "text-[var(--color-text-main)]"}`}>
          {value}
        </h3>
        {subtitle && (
          <span className="text-sm font-medium text-[var(--color-text-muted)]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="fade-in space-y-4 pb-20 flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">Event Details</h1>
          <p className="text-sm text-[var(--color-text-muted)]">View and manage all details for this event.</p>
        </div>
        {event.status !== "Cancelled" && event.status !== "Completed" && (
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors border border-red-200"
          >
            Cancel Event
          </button>
        )}
      </div>

      {/* Top Section: Event Summary and KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Event Details Card */}
        <div className="card-panel p-6 flex flex-col gap-4 relative overflow-hidden h-full">
          <div>
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-xl font-semibold text-[var(--color-accent)]">
                {event.name}
              </h2>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${
                  event.status === "Ongoing"
                    ? "bg-green-500/10 text-green-600"
                    : event.status === "Completed"
                      ? "bg-blue-500/10 text-blue-600"
                      : event.status === "Cancelled"
                        ? "bg-red-500/10 text-red-600"
                        : "bg-yellow-500/10 text-yellow-600"
                }`}>
                {event.status}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">
              {event.description || "No description provided."}
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-auto pt-4 border-t border-[var(--color-border-subtle)]">
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-main)]">
              <Calendar size={16} className="text-[var(--color-text-muted)] shrink-0" />
              <span className="truncate">
                {new Date(event.date).toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </span>
            <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-main)]">
              <MapPin size={16} className="text-[var(--color-text-muted)] shrink-0" />
              <span className="truncate">{event.venue}</span>
            </span>
          </div>
        </div>

        {/* Right Side: KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
          <MetricCard
            title="Total Revenue"
            value={`₹${totalRevenue.toLocaleString()}`}
            subtitle=""
          />
          <MetricCard
            title="Total Spending"
            value={`₹${totalSpending.toLocaleString()}`}
            subtitle=""
          />
          <MetricCard
            title="Net Profit"
            value={`${(netProfit < 0 ? '-' : '') + "₹" + Math.abs(netProfit).toLocaleString()}`}
            valueColor={netProfit >= 0 ? "text-green-600" : "text-red-600"}
          />
          <MetricCard
            title="Registered Attendees"
            value={explicitlyPaidCount.toString()}
            subtitle=""
          />
        </div>
      </div>

      {/* Main Content Area (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities Column */}
        <div className="flex flex-col fade-in overflow-hidden">
          <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                  Activity Modules
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Track revenue-generating tasks.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedActivities.length > 0 && (
                <button
                  onClick={() => handleDeleteClick(null, "bulk-activity")}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 flex items-center gap-2 transition-colors">
                  <Trash2 size={16} /> Delete
                </button>
              )}
              <button
                onClick={() => handleOpenActivityModal()}
                className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary)]/90 flex items-center gap-2 transition-colors">
                <Plus size={16} /> Add Activity
              </button>
            </div>
          </div>

          {activities.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-bg-subtle)] rounded-xl border border-dashed border-[var(--color-border-subtle)]">
              <h3 className="text-base font-bold text-[var(--color-text-main)] mb-1">
                No activities found
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Add stalls, meetings, or other modules to this event.
              </p>
            </div>
          ) : (
            <Table
              columns={activityColumns}
              data={activities}
              keyField="_id"
              itemsPerPage={5}
              onVisibleDataChange={(data) => setVisibleActivities(data)}
              onRowClick={(row) => handleOpenActivityModal(row)}
            />
          )}
        </div>

        {/* Expenses Column */}
        <div className="flex flex-col fade-in overflow-hidden">
          <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text-main)]">
                  Spending Management
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Log and track event-related expenses.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selectedExpenses.length > 0 && (
                <button
                  onClick={() => handleDeleteClick(null, "bulk-expense")}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 flex items-center gap-2 transition-colors">
                  <Trash2 size={16} /> Delete
                </button>
              )}
              <button
                onClick={() => handleOpenExpenseModal()}
                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 flex items-center gap-2 transition-colors">
                <Plus size={16} /> Log Expense
              </button>
            </div>
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-12 bg-[var(--color-bg-subtle)] rounded-xl border border-dashed border-[var(--color-border-subtle)]">
              <h3 className="text-base font-bold text-[var(--color-text-main)] mb-1">
                No expenses tracked
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mb-4">
                Start logging catering, venue, or marketing costs.
              </p>
            </div>
          ) : (
            <Table
              columns={expenseColumns}
              data={expenses}
              keyField="_id"
              itemsPerPage={5}
              onVisibleDataChange={(data) => setVisibleExpenses(data)}
              onRowClick={(row) => handleOpenExpenseModal(row)}
            />
          )}
        </div>
      </div>

      {/* Registered Attendees Section */}
      <div className="mt-8 flex flex-col fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text-main)]">
              Registered Attendees
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              Customers who have explicitly registered and paid for this event.
            </p>
          </div>
        </div>

        <div className="bg-[var(--color-bg-card)] rounded-2xl overflow-hidden">
          {participants.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center">
              <Users
                size={32}
                className="text-[var(--color-text-light)] mb-3"
              />
              <h3 className="font-semibold text-[var(--color-text-main)]">
                No Customers Found
              </h3>
              <p className="text-sm text-[var(--color-text-muted)] mt-1">
                No customers are registered or have access to this event yet.
              </p>
            </div>
          ) : (
            <Table
              columns={participantColumns}
              data={participants}
              keyField="_id"
              itemsPerPage={10}
            />
          )}
        </div>
      </div>

      {/* Activity Modal */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => !savingActivity && setIsActivityModalOpen(false)}
        title={editingActivity ? "Edit Activity" : "Add Activity"}>
        <form onSubmit={handleSaveActivity} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={activityFormData.title}
              onChange={(e) =>
                setActivityFormData((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              placeholder="e.g., Premium Stall"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">
              Price / Revenue <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-[var(--color-text-muted)] font-bold">
                ₹
              </span>
              <input
                type="number"
                required
                min="0"
                value={activityFormData.amount}
                onChange={(e) =>
                  setActivityFormData((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] pl-8 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">
              Description
            </label>
            <textarea
              value={activityFormData.description}
              onChange={(e) =>
                setActivityFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={3}
              className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
              placeholder="Enter activity details..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsActivityModalOpen(false)}
              className="px-6 py-2.5 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingActivity}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
              {savingActivity && <Spinner size={14} />}
              {editingActivity ? "Save Changes" : "Create Activity"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Expense Modal */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => !savingExpense && setIsExpenseModalOpen(false)}
        title={editingExpense ? "Edit Expense" : "Log Expense"}>
        <form onSubmit={handleSaveExpense} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={expenseFormData.title}
              onChange={(e) =>
                setExpenseFormData((prev) => ({
                  ...prev,
                  title: e.target.value,
                }))
              }
              className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              placeholder="e.g., Venue Deposit"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">
              Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-red-500 font-bold">
                ₹
              </span>
              <input
                type="number"
                required
                min="0"
                value={expenseFormData.amount}
                onChange={(e) =>
                  setExpenseFormData((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] pl-8 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">
              Description
            </label>
            <textarea
              value={expenseFormData.description}
              onChange={(e) =>
                setExpenseFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              rows={2}
              className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
              placeholder="Enter optional details..."
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-6 py-2.5 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingExpense}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
              {savingExpense && <Spinner size={14} />}
              {editingExpense ? "Save Changes" : "Log Expense"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteType === "activity" ? "Activity" : "Expense"}`}
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
        confirmText={deleting ? "Deleting" : "Delete"}
        isLoading={deleting}
        isDestructive={true}
      />

      <ConfirmationDialog
        isOpen={showCancelConfirm}
        onClose={() => !cancelling && setShowCancelConfirm(false)}
        onConfirm={handleCancelEvent}
        title="Cancel Event"
        message="Are you sure you want to cancel this event? This action cannot be undone."
        confirmText={cancelling ? "Cancelling" : "Cancel Event"}
        isLoading={cancelling}
        isDestructive={true}
      />
    </div>
  );
}
