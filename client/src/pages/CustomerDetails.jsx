import { Clipboard, Flame, Plus, Sparkles, User, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import PI from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
const PhoneInput = PI.default || PI;
import { useNavigate, useParams } from "react-router-dom";
import Toggle from "../components/settings/Toggle";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";
import CustomSelect from "../components/ui/CustomSelect";
import ConfiguredCitySelector from "../components/ui/ConfiguredCitySelector";
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton';
import Spinner from "../components/ui/Spinner";
import EditTransactionModal from "../components/leads/EditTransactionModal";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";
import { getLeadStatusBg, getLeadStatusColor } from "../utils/statusColors";

export default function CustomerDetails() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [lead, setLead] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  
  // Convert Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [convertEventId, setConvertEventId] = useState("");
  const [convertActivityId, setConvertActivityId] = useState("");
  const [convertAmount, setConvertAmount] = useState("");
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);

  // Convert Member Modal State
  const [isConvertMemberModalOpen, setIsConvertMemberModalOpen] = useState(false);
  const [convertMemberTier, setConvertMemberTier] = useState("");
  const [convertMemberStart, setConvertMemberStart] = useState("");
  const [convertMemberEnd, setConvertMemberEnd] = useState("");
  const [convertMemberAmount, setConvertMemberAmount] = useState("");
  const [showConvertMemberConfirm, setShowConvertMemberConfirm] = useState(false);

  // Edit/Delete Transaction State
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [showDeleteTransactionConfirm, setShowDeleteTransactionConfirm] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState(false);
  
  const [transactionToEdit, setTransactionToEdit] = useState(null);
  const [isEditTransactionModalOpen, setIsEditTransactionModalOpen] = useState(false);

  // Edit Details state
  const [savingDetails, setSavingDetails] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [agents, setAgents] = useState([]);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    username: "",
    phone: "",
    email: "",
    platform: "other",
    tags: [],
    status: "",
    priority: "normal",
    assignedTo: "",
  });

  // Form state
  const [selectedTier, setSelectedTier] = useState("");
  const [subscriptionAmount, setSubscriptionAmount] = useState("");
  const [showTransactionConfirm, setShowTransactionConfirm] = useState(false);
  const [savingTransaction, setSavingTransaction] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [transactionType, setTransactionType] = useState("renewal"); // 'initial', 'renewal', 'upgrade', 'downgrade', 'cancellation'
  const [offerApplied, setOfferApplied] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState("");
  const [cancellationDate, setCancellationDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [refundAmount, setRefundAmount] = useState("");

  // Event toggles and state
  const [includeMembership, setIncludeMembership] = useState(true);
  const [includeEvent, setIncludeEvent] = useState(false);

  const [events, setEvents] = useState([]);
  const [eventActivities, setEventActivities] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedActivity, setSelectedActivity] = useState("");
  const [eventAmountPaid, setEventAmountPaid] = useState("");
  const [eventOfferApplied, setEventOfferApplied] = useState(false);
  const [eventDiscountPercentage, setEventDiscountPercentage] = useState("");

  useEffect(() => {
    fetchData();
  }, [token, leadId]);

  // Handle endDate auto-population based on transactionType
  useEffect(() => {
    if (!transactions) return;

    const activeMembership = transactions.find((t) => t.type === "membership");
    if (activeMembership && activeMembership.tierId && !selectedTier) {
      setSelectedTier(activeMembership.tierId._id || activeMembership.tierId);
    }

    if (transactionType === "upgrade" || transactionType === "downgrade") {
      if (activeMembership && activeMembership.endDate) {
        setEndDate(
          new Date(activeMembership.endDate).toISOString().split("T")[0],
        );
      }
    } else if (transactionType === "renewal" || transactionType === "initial") {
      const isTrial = selectedTier && tiers.find(t => t._id === selectedTier)?.name?.toLowerCase().includes("trial");
      const d = startDate ? new Date(startDate) : new Date();
      if (isTrial) {
        d.setMonth(d.getMonth() + 1);
      } else {
        d.setFullYear(d.getFullYear() + 1);
      }
      setEndDate(d.toISOString().split("T")[0]);
    } else if (transactionType === "cancellation") {
      if (activeMembership && activeMembership.tierId) {
        setSelectedTier(activeMembership.tierId._id || activeMembership.tierId);
      }
    }
  }, [transactionType, transactions, selectedTier, startDate, tiers]);

  // Fetch activities when an event is selected
  useEffect(() => {
    const eventToFetch = selectedEvent || convertEventId;
    if (token && eventToFetch) {
      fetch(`${API_URL}/api/events/${eventToFetch}/activities`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setEventActivities(data);
          } else if (data && data.success && Array.isArray(data.data)) {
            setEventActivities(data.data);
          }
        })
        .catch((err) => console.error("Failed to fetch activities:", err));
    } else {
      setEventActivities([]);
    }
  }, [token, selectedEvent, convertEventId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [leadRes, transRes, tiersRes, agentsRes, eventsRes] =
        await Promise.all([
          fetch(`${API_URL}/api/leads/${leadId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/leads/${leadId}/transactions`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/membership-tiers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/leads/agents`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/events?activeOnly=true`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      const leadData = await leadRes.json();
      const transData = await transRes.json();
      const tiersData = await tiersRes.json();
      const agentsData = await agentsRes.json();
      const eventsData = await eventsRes.json();

      setLead(leadData);
      setAgents(agentsData);
      setEditForm({
        name: leadData.name || "",
        username: leadData.username || "",
        phone: leadData.phone || "",
        email: leadData.email || "",
        city: leadData.city || "",
        tags: leadData.tags || [],
        priority: leadData.priority || "normal",
        assignedTo: leadData.assignedTo?._id || leadData.assignedTo || "",
      });
      if (transData.success) setTransactions(transData.data);
      if (tiersData.success) setTiers(tiersData.data.filter((t) => t.isActive));

      if (Array.isArray(eventsData)) {
        setEvents(eventsData);
      } else if (
        eventsData &&
        eventsData.success &&
        Array.isArray(eventsData.data)
      ) {
        setEvents(eventsData.data);
      }
    } catch (err) {
      toast.error("Failed to load membership data");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDetails = async () => {
    setSavingDetails(true);
    try {
      const res = await fetch(`${API_URL}/api/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          username: editForm.username,
          phone: editForm.phone,
          email: editForm.email,
          city: editForm.city,
          tags: editForm.tags,
          priority: editForm.priority,
          assignedTo: editForm.assignedTo || null,
        }),
      });
      if (res.ok) {
        toast.success("Customer details updated!");
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update details");
      }
    } catch (err) {
      toast.error("Error updating details");
    } finally {
      setSavingDetails(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText || !newNoteText.trim()) {
      toast.error("Note text is required.");
      return;
    }
    setAddingNote(true);
    try {
      const res = await fetch(`${API_URL}/api/leads/${leadId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newNote: newNoteText }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLead(data.data); // Update lead data which includes the new note
        setNewNoteText("");
        toast.success("Note added successfully!");
      } else {
        toast.error(data.error || "Failed to add note");
      }
    } catch (err) {
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleTierChange = (val) => {
    setSelectedTier(val);
    const tier = tiers.find((t) => t._id === val);
    if (tier) setSubscriptionAmount(tier.defaultSubscriptionAmount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (includeMembership) {
      if (transactionType === "cancellation") {
        if (!selectedTier || !cancellationDate || refundAmount === "") {
          toast.error("Tier, Cancellation Date, and Refund Amount are required for cancellation");
          return;
        }
      } else {
        if (
          !selectedTier ||
          subscriptionAmount === "" ||
          !startDate ||
          !endDate
        ) {
          toast.error("All membership fields are required");
          return;
        }
        if (offerApplied && discountPercentage === "") {
          toast.error("Discount percentage is required if offer is applied");
          return;
        }
      }
    }

    if (includeEvent) {
      if (!selectedEvent || !selectedActivity || eventAmountPaid === "") {
        toast.error("All event fields are required");
        return;
      }
      if (eventOfferApplied && eventDiscountPercentage === "") {
        toast.error(
          "Discount percentage is required if event offer is applied",
        );
        return;
      }
    }

    if (!includeMembership && !includeEvent) {
      toast.error("Please include at least a membership or an event");
      return;
    }

    setShowTransactionConfirm(true);
  };

  const confirmTransactionSave = async () => {
    setSavingTransaction(true);
    try {
      const payload = {
        includeMembership,
        includeEvent,
      };

      if (includeMembership) {
        payload.membershipTierId = selectedTier;
        if (transactionType === "cancellation") {
          payload.isCancellation = true;
          payload.cancellationDate = cancellationDate;
          payload.amountPaid = -Math.abs(Number(refundAmount));
        } else {
          payload.subscriptionAmount = Number(subscriptionAmount);
          payload.amountPaid =
            offerApplied && discountPercentage
              ? Number(subscriptionAmount) -
                (Number(subscriptionAmount) * Number(discountPercentage)) / 100
              : Number(subscriptionAmount);
          payload.startDate = startDate;
          payload.endDate = endDate;
          payload.isRenewal = transactionType === "renewal";
          payload.isUpgrade = transactionType === "upgrade";
          payload.isDowngrade = transactionType === "downgrade";
          payload.offerApplied = offerApplied;
          payload.discountPercentage = offerApplied
            ? Number(discountPercentage)
            : 0;
        }
      }

      if (includeEvent) {
        payload.eventId = selectedEvent;
        payload.activityId = selectedActivity;
        payload.eventAmountPaid = Number(eventAmountPaid);
        payload.eventOfferApplied = eventOfferApplied;
        payload.eventDiscountPercentage = eventOfferApplied
          ? Number(eventDiscountPercentage)
          : 0;
      }

      const res = await fetch(`${API_URL}/api/leads/${leadId}/transactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Transactions added successfully");
        setIsModalOpen(false);
        setIsCancelModalOpen(false);
        setShowTransactionConfirm(false);
        resetForm();
        fetchData(); // refresh list
      } else {
        toast.error(data.error || "Failed to record transaction");
      }
    } catch (err) {
      toast.error("Error saving transaction");
    } finally {
      setSavingTransaction(false);
      setShowTransactionConfirm(false);
    }
  };

  const resetForm = () => {
    setSelectedTier("");
    setSubscriptionAmount("");
    setStartDate(new Date().toISOString().split("T")[0]);
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setEndDate(d.toISOString().split("T")[0]);
    setTransactionType("renewal");
    setOfferApplied(false);
    setDiscountPercentage("");
    setCancellationDate(new Date().toISOString().split("T")[0]);
    setRefundAmount("");

    setIncludeMembership(true);
    setIncludeEvent(false);
    setSelectedEvent("");
    setSelectedActivity("");
    setEventAmountPaid("");
    setEventOfferApplied(false);
    setEventDiscountPercentage("");
  };

  const handleConvertSubmit = async (e) => {
    e.preventDefault();
    if (!convertEventId || !convertActivityId || convertAmount === "") {
      toast.error("Event, Action, and Amount are required");
      return;
    }
    setShowConvertConfirm(true);
  };

  const confirmConvertSave = async () => {
    setSavingTransaction(true);
    try {
      const res = await fetch(`${API_URL}/api/leads/${leadId}/convert-to-event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          eventId: convertEventId,
          activityId: convertActivityId,
          amountPaid: Number(convertAmount)
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Lead successfully converted to Event Registrant");
        setIsConvertModalOpen(false);
        setShowConvertConfirm(false);
        fetchData(); // refresh list
      } else {
        toast.error(data.error || "Failed to convert lead");
      }
    } catch (err) {
      toast.error("Error converting lead");
    } finally {
      setSavingTransaction(false);
      setShowConvertConfirm(false);
    }
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;
    setDeletingTransaction(true);
    try {
      const { _id, type } = transactionToDelete;
      const endpoint = type === 'membership' 
        ? `${API_URL}/api/leads/${leadId}/transactions/membership/${_id}`
        : `${API_URL}/api/leads/${leadId}/transactions/event/${_id}`;
        
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Transaction deleted successfully");
        setShowDeleteTransactionConfirm(false);
        setTransactionToDelete(null);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete transaction");
      }
    } catch (e) {
      toast.error("Error deleting transaction");
    } finally {
      setDeletingTransaction(false);
    }
  };

  const openEditModal = (tx) => {
    setTransactionToEdit(tx);
    setIsEditTransactionModalOpen(true);
  };

  const handleConvertMemberSubmit = async (e) => {
    e.preventDefault();
    if (!convertMemberTier || !convertMemberStart || !convertMemberEnd || convertMemberAmount === "") {
      toast.error("All fields (Tier, Start Date, End Date, Amount) are required");
      return;
    }
    setShowConvertMemberConfirm(true);
  };

  const confirmConvertMemberSave = async () => {
    setSavingTransaction(true);
    try {
      const res = await fetch(`${API_URL}/api/leads/${leadId}/convert-to-member`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tierId: convertMemberTier,
          startDate: convertMemberStart,
          endDate: convertMemberEnd,
          amountPaid: Number(convertMemberAmount)
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Lead successfully converted to Member");
        setIsConvertMemberModalOpen(false);
        setShowConvertMemberConfirm(false);
        fetchData();
      } else {
        toast.error(data.error || "Failed to convert lead");
      }
    } catch (err) {
      toast.error("Error converting lead");
    } finally {
      setSavingTransaction(false);
      setShowConvertMemberConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="fade-in space-y-6 flex flex-col pb-20">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton variant="text" className="h-6 w-48" />
            <Skeleton variant="text" className="h-4 w-64" />
          </div>
          <div className="flex flex-wrap items-center gap-3 justify-start sm:justify-end">
            <Skeleton variant="rectangular" className="h-10 w-32 rounded-lg" />
            <Skeleton variant="rectangular" className="h-10 w-32 rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6">
              <Skeleton variant="text" className="h-4 w-32 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton variant="text" className="h-3 w-16" />
                    <Skeleton variant="rectangular" className="h-10 w-full rounded-lg" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-4">
                <Skeleton variant="rectangular" className="h-10 w-24 rounded-lg" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton variant="rectangular" className="h-10 w-32 rounded-xl" />
              <Skeleton variant="rectangular" className="h-10 w-32 rounded-xl" />
            </div>
            <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden p-4">
              <TableSkeleton rows={4} columns={4} />
            </div>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6">
              <Skeleton variant="text" className="h-4 w-40 mb-6" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <Skeleton variant="text" className="h-4 w-24" />
                    <Skeleton variant="text" className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (!lead) return <div className="p-10 text-center">Lead not found.</div>;

  const latestMembership = transactions.find((t) => t.type === "membership");


  return (
    <div className="fade-in space-y-6 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 w-full">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">
            Customer Details
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1 truncate">
            Managing membership for <strong>{lead.name}</strong> (@
            {lead.username})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-start sm:justify-end">
          {latestMembership && !latestMembership.isCancellation && (
            <button
              onClick={() => {
                setTransactionType("cancellation");
                setIncludeMembership(true);
                setIncludeEvent(false);
                const activeMembership = transactions.find((t) => t.type === "membership");
                if (activeMembership && activeMembership.tierId) {
                  setSelectedTier(activeMembership.tierId._id || activeMembership.tierId);
                }
                setIsCancelModalOpen(true);
              }}
              className="text-red-600 bg-red-50 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-100 flex items-center gap-2 transition-colors shrink-0 border border-red-200">
              Cancel Membership
            </button>
          )}
          <button
            onClick={() => {
              setTransactionType("renewal");
              setIsModalOpen(true);
            }}
            className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary)]/90 flex items-center gap-2 transition-colors shrink-0">
            <Plus size={16} /> New Transaction
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6">
            <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
              Customer Details
            </h3>

            <div className="space-y-4 fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Phone
                  </label>
                  <PhoneInput
                    country={'in'}
                    enableSearch={true}
                    value={editForm.phone}
                    onChange={(value) =>
                      setEditForm((prev) => ({
                        ...prev,
                        phone: value ? (value.startsWith('+') ? value : '+' + value) : '',
                      }))
                    }
                    inputClass="!w-full !bg-[var(--color-bg-subtle)] !border !border-[var(--color-border-subtle)] !text-[var(--color-text-main)] !px-12 !py-2 !rounded-lg !text-sm focus:!outline-none focus:!border-[var(--color-primary)] !h-auto"
                    buttonClass="!bg-transparent !border-0 !border-r !border-[var(--color-border-subtle)] !rounded-l-lg !pl-2 hover:!bg-[var(--color-bg-subtle)]"
                    containerClass="!w-full"
                    dropdownClass="!bg-[var(--color-bg-card)] !text-[var(--color-text-main)] !border-[var(--color-border-subtle)]"
                    searchClass="!bg-[var(--color-bg-subtle)] !text-[var(--color-text-main)] !border-[var(--color-border-subtle)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    City
                  </label>
                  <ConfiguredCitySelector
                    value={editForm.city}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        city: e.target.value,
                      }))
                    }
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Priority
                  </label>
                  <CustomSelect
                    value={editForm.priority}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                    options={[
                      {
                        value: "normal",
                        label: (
                          <span className="flex items-center gap-1.5">
                            <User
                              size={14}
                              className="text-[var(--color-text-muted)]"
                            />{" "}
                            Normal
                          </span>
                        ),
                      },
                      {
                        value: "hot",
                        label: (
                          <span className="flex items-center gap-1.5">
                            <Flame
                              size={14}
                              className="text-[var(--color-status-error)]"
                            />{" "}
                            Hot
                          </span>
                        ),
                      },
                      {
                        value: "super",
                        label: (
                          <span className="flex items-center gap-1.5">
                            <Sparkles size={14} className="text-purple-600" />{" "}
                            Super
                          </span>
                        ),
                      },
                    ]}
                    className="w-full"
                  />
                </div>
                {user?.role !== 'agent' && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                      Assigned To
                    </label>
                    <CustomSelect
                      value={editForm.assignedTo}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          assignedTo: e.target.value,
                        }))
                      }
                      options={[
                        { value: "", label: "Unassigned" },
                        ...agents.map((a) => ({
                          value: a._id,
                          label: `${a.name} (${a.role})`,
                        })),
                      ]}
                      className="w-full"
                    />
                  </div>
                )}
                <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={editForm.tags.join(", ")}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      }))
                    }
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4 mt-2 justify-end">
                <button
                  onClick={() => setShowSaveConfirm(true)}
                  disabled={savingDetails}
                  className="px-6 bg-[var(--color-primary)] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary)]/90 disabled:opacity-50 transition-colors">
                  {savingDetails ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden flex flex-col">
            <div className="w-full overflow-x-auto overflow-y-auto max-h-[400px] custom-scrollbar">
              <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)]">
                  <tr>
                    <th className="p-4 font-semibold text-[var(--color-text-muted)]">
                      Date
                    </th>
                    <th className="p-4 font-semibold text-[var(--color-text-muted)]">
                      Product / Details
                    </th>
                    <th className="p-4 font-semibold text-[var(--color-text-muted)]">
                      Offer
                    </th>
                    <th className="p-4 font-semibold text-[var(--color-text-muted)]">
                      Type
                    </th>
                    <th className="p-4 font-semibold text-[var(--color-text-muted)]">
                      Amount Paid
                    </th>
                    <th className="p-4 font-semibold text-[var(--color-text-muted)]">
                      Start Date
                    </th>
                    <th className="p-4 font-semibold text-[var(--color-text-muted)] text-right">
                      End Date
                    </th>
                    <th className="p-4 font-semibold text-[var(--color-text-muted)]">
                      Created By
                    </th>
                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                      <th className="p-4 font-semibold text-[var(--color-text-muted)] text-right">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {transactions.length === 0 ? (
                    <tr>
                      <td
                        colSpan="8"
                        className="p-8 text-center text-[var(--color-text-muted)]">
                        No transactions found for this lead.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr
                        key={tx._id}
                        className="hover:bg-[var(--color-bg-subtle)]/50 transition-colors">
                        <td className="p-4 text-[var(--color-text-main)]">
                          {new Date(tx.transactionDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          {tx.type === "membership" ? (
                            <span className="font-semibold text-[var(--color-text-main)]">
                              {tx.tierId?.name}
                            </span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-semibold text-[var(--color-text-main)]">
                                {tx.eventId?.name || <span className="text-[var(--color-text-light)] italic">[Deleted Event]</span>}
                              </span>
                              <span className="text-xs text-[var(--color-text-muted)]">
                                {tx.activityId?.title || <span className="italic">[Unknown Action]</span>}
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="p-4">
                          {tx.offerApplied ? (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)]">
                              YES
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-[var(--color-text-light)]">
                              NO
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {tx.type === "membership" ? (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                tx.isCancellation
                                  ? "bg-red-500/10 text-red-600"
                                  : tx.isUpgrade
                                    ? "bg-blue-500/10 text-blue-600"
                                    : tx.isDowngrade
                                      ? "bg-orange-500/10 text-orange-600"
                                      : tx.isRenewal
                                        ? "bg-green-500/10 text-green-600"
                                        : "bg-gray-500/10 text-gray-600"
                              }`}>
                              {tx.isCancellation
                                ? "Cancellation"
                                : tx.isUpgrade
                                  ? "Upgrade"
                                  : tx.isDowngrade
                                    ? "Downgrade"
                                    : tx.isRenewal
                                      ? "Renewal"
                                      : "Initial"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600">
                              Event
                            </span>
                          )}
                        </td>
                        <td className={`p-4 font-semibold ${tx.amountPaid < 0 ? 'text-red-500' : 'text-[var(--color-text-main)]'}`}>
                          {tx.amountPaid < 0 ? `-₹${Math.abs(tx.amountPaid).toLocaleString()}` : `₹${tx.amountPaid.toLocaleString()}`}
                        </td>
                        <td className="p-4 text-sm text-[var(--color-text-muted)]">
                          {tx.type === "membership"
                            ? new Date(tx.startDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-4 text-right text-sm font-semibold text-[var(--color-text-main)]">
                          {tx.type === "membership"
                            ? new Date(tx.endDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-4 text-sm font-medium text-[var(--color-text-main)]">
                          {tx.createdBy?.name ? (
                            tx.createdBy.name
                          ) : (
                            <span className="text-[var(--color-text-muted)] text-xs italic">Unknown</span>
                          )}
                        </td>
                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => openEditModal(tx)}
                                className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                                title="Edit Transaction"
                              >
                                <Pencil size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  setTransactionToDelete(tx);
                                  setShowDeleteTransactionConfirm(true);
                                }}
                                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                                title="Delete Transaction"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {latestMembership && !latestMembership.isCancellation ? (
            <>
              <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6">
                <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  Active Tier
                </h3>
                <div className="text-xl font-medium text-[var(--color-accent)]">
                  {latestMembership.tierId?.name}
                </div>
              </div>

              <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6">
                <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  Expiry Date
                </h3>
                <div className="text-base font-medium text-[var(--color-text-main)]">
                  {new Date(latestMembership.endDate).toLocaleDateString(
                    undefined,
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </div>
                {new Date(latestMembership.endDate) < new Date() && (
                  <div className="text-xs font-bold text-red-500 mt-2 bg-red-500/10 px-2 py-1 rounded inline-block">
                    EXPIRED
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6">
              <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider mb-4">
                Current Status
              </h3>
              <div className="text-sm text-[var(--color-text-muted)] italic">
                {latestMembership?.isCancellation ? "Membership cancelled." : "No active membership."}
              </div>
            </div>
          )}

          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-6 sticky top-6">
            <h3 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Clipboard size={14} /> Notes & Interaction History
            </h3>

            {/* Notes Input */}
            <div className="space-y-1.5 mb-6">
              <textarea
                placeholder="Type interaction notes..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none min-h-[80px]"
              />
              <div className="flex justify-end pt-1">
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !newNoteText.trim()}
                  className="bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--color-primary)]/90 transition-colors disabled:opacity-50 flex items-center gap-2">
                  {addingNote ? <Spinner size={12} /> : "Save Note"}
                </button>
              </div>
            </div>

            {/* Notes History */}
            <div className="space-y-3">
              {!lead?.notes || lead.notes.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] italic text-center py-4">
                  No notes recorded.
                </p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {[...lead.notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((note, idx) => (
                    <div
                      key={idx}
                      className="bg-[var(--color-bg-subtle)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                      <div className="flex justify-between items-start mb-1.5 gap-2">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded truncate shrink-0 border"
                          style={{
                            backgroundColor: getLeadStatusBg(
                              note.status || "Unknown",
                            ),
                            color: getLeadStatusColor(note.status || "Unknown"),
                            borderColor: getLeadStatusBg(
                              note.status || "Unknown",
                            ),
                          }}>
                          {note.status || "Unknown"}
                        </span>
                        <span className="text-[10px] font-semibold text-[var(--color-text-muted)] whitespace-nowrap">
                          {new Date(note.createdAt).toLocaleDateString()}{" "}
                          {new Date(note.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-main)] whitespace-pre-wrap">
                        {note.text}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in"
            onClick={() => setIsModalOpen(false)}>
            <div
              className="bg-[var(--color-bg-card)] rounded-xl w-full max-w-md shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-4">
                Add Transaction
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4 mb-4 mt-2">
                  <div className="flex items-center gap-2">
                    <Toggle
                      enabled={includeMembership}
                      onChange={setIncludeMembership}
                    />
                    <label
                      className="text-sm font-semibold text-[var(--color-text-main)] cursor-pointer"
                      onClick={() => setIncludeMembership(!includeMembership)}>
                      Membership
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Toggle enabled={includeEvent} onChange={setIncludeEvent} />
                    <label
                      className="text-sm font-semibold text-[var(--color-text-main)] cursor-pointer"
                      onClick={() => setIncludeEvent(!includeEvent)}>
                      Events
                    </label>
                  </div>
                </div>

                {includeMembership && (
                  <div className="space-y-3 mb-6 p-4 border border-green-500/20 rounded-xl bg-white/50 dark:bg-[var(--color-bg-card)]/50">
                    <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider border-b border-green-500/20 pb-2">
                      Membership Details
                    </h4>

                    <div className="flex items-center gap-2 mb-3 p-2 rounded-xl border border-green-500/20 bg-green-500/5 overflow-x-auto">
                      {["new", "renewal", "upgrade", "downgrade"].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setTransactionType(type)}
                          className={`flex-1 py-1.5 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                            transactionType === type
                              ? "bg-green-500 text-white"
                              : "text-[var(--color-text-main)] hover:bg-green-500/10"
                          }`}>
                          {type}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                        Membership Tier *
                      </label>
                      <CustomSelect
                        value={selectedTier}
                        onChange={(e) => handleTierChange(e.target.value)}
                        disabled={transactionType === "cancellation"}
                        options={[
                          { value: "", label: "Select a Tier" },
                          ...tiers.map((t) => ({
                            value: t._id,
                            label: t.name,
                          })),
                        ]}
                        className="w-full bg-white dark:bg-[var(--color-bg-subtle)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-green-500/30 rounded-xl px-3 py-2 focus:outline-none focus:border-green-500 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                          End Date *
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-green-500/30 rounded-xl px-3 py-2 focus:outline-none focus:border-green-500 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-4 p-3.5 rounded-xl border border-green-500/20 bg-green-500/5">
                      <label
                        className="text-sm font-semibold text-[var(--color-text-main)] cursor-pointer"
                        onClick={() => setOfferApplied(!offerApplied)}>
                        Discount Applied
                      </label>
                      <Toggle
                        enabled={offerApplied}
                        onChange={setOfferApplied}
                      />
                    </div>

                    {offerApplied && (
                      <div className="space-y-1.5 mt-3">
                        <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                          Discount Percentage (%) *
                        </label>
                        <input
                          type="number"
                          value={discountPercentage}
                          onChange={(e) =>
                            setDiscountPercentage(e.target.value)
                          }
                          placeholder="e.g. 10"
                          className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-green-500/30 rounded-xl px-4 py-2 focus:outline-none focus:border-green-500 text-sm"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-green-500/20 mt-3">
                      <label className="block text-xs font-bold text-[var(--color-status-success)] uppercase tracking-wider flex items-center gap-1">
                        {transactionType === 'downgrade' ? 'Refund Amount (₹) *' : 'Subscription Amount (₹) *'}
                      </label>
                      <input
                        type="number"
                        placeholder="Enter subscription amount..."
                        value={subscriptionAmount}
                        onChange={(e) => setSubscriptionAmount(e.target.value)}
                        className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-green-500/30 rounded-xl px-4 py-2 focus:outline-none focus:border-green-500 text-sm"
                      />
                    </div>
                  </div>
                )}

                {includeEvent && (
                  <div className="space-y-3 p-4 border border-blue-500/20 rounded-xl bg-white/50 dark:bg-[var(--color-bg-card)]/50">
                    <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider border-b border-blue-500/20 pb-2">
                      Event Details
                    </h4>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                        Select Event *
                      </label>
                      <CustomSelect
                        value={selectedEvent}
                        onChange={(e) => {
                          setSelectedEvent(e.target.value);
                          setSelectedActivity("");
                          setEventAmountPaid("");
                        }}
                        options={[
                          { value: "", label: "Select an Event" },
                          ...events.map((e) => ({
                            value: e._id,
                            label: e.name,
                          })),
                        ]}
                        className="w-full bg-white dark:bg-[var(--color-bg-subtle)]"
                      />
                    </div>

                    {selectedEvent && (
                      <div className="space-y-1.5 mt-3">
                        <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                          Select Event Action *
                        </label>
                        <CustomSelect
                          value={selectedActivity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedActivity(val);
                            const activity = eventActivities.find(
                              (a) => a._id === val,
                            );
                            if (activity) setEventAmountPaid(activity.amount);
                          }}
                          options={[
                            { value: "", label: "Select an Action" },
                            ...eventActivities.map((a) => ({
                              value: a._id,
                              label: a.title,
                            })),
                          ]}
                          className="w-full bg-white dark:bg-[var(--color-bg-subtle)]"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-4 p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5">
                      <label
                        className="text-sm font-semibold text-[var(--color-text-main)] cursor-pointer"
                        onClick={() =>
                          setEventOfferApplied(!eventOfferApplied)
                        }>
                        Discount Applied
                      </label>
                      <Toggle
                        enabled={eventOfferApplied}
                        onChange={setEventOfferApplied}
                      />
                    </div>

                    {eventOfferApplied && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                          Discount Percentage (%) *
                        </label>
                        <input
                          type="number"
                          value={eventDiscountPercentage}
                          onChange={(e) =>
                            setEventDiscountPercentage(e.target.value)
                          }
                          placeholder="e.g. 10"
                          className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-blue-500/30 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 text-sm"
                        />
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-blue-500/20 mt-3">
                      <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                        Amount Paid (₹) *
                      </label>
                      <input
                        type="number"
                        placeholder="Enter amount paid today..."
                        value={eventAmountPaid}
                        onChange={(e) => setEventAmountPaid(e.target.value)}
                        className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-blue-500/30 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-bg-subtle)] rounded-lg hover:brightness-95 transition-all">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/90 transition-all ">
                    Save Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {isCancelModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in"
            onClick={() => setIsCancelModalOpen(false)}>
            <div
              className="bg-[var(--color-bg-card)] rounded-xl w-full max-w-md shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-red-600">
                  Cancel Membership
                </h2>
                <button
                  onClick={() => setIsCancelModalOpen(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Cancellation Date *
                  </label>
                  <input
                    type="date"
                    value={cancellationDate}
                    onChange={(e) => setCancellationDate(e.target.value)}
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Refund Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="Enter 0 if no refund"
                    className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-[var(--color-primary)]"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 mt-6 border-t border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-bg-subtle)] rounded-lg hover:brightness-95 transition-all">
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all ">
                    Confirm Cancellation
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
      <ConfirmationDialog
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={() => {
          setShowSaveConfirm(false);
          handleSaveDetails();
        }}
        title="Save Customer Details"
        message="Are you sure you want to save these changes to the customer profile?"
        confirmText={savingDetails ? "Saving" : "Save Changes"}
        isLoading={savingDetails}
        isDestructive={false}
      />

      <ConfirmationDialog
        isOpen={showTransactionConfirm}
        onClose={() => setShowTransactionConfirm(false)}
        onConfirm={confirmTransactionSave}
        title="Record New Transaction"
        message="Are you sure you want to record this transaction? This action cannot be undone."
        confirmText={savingTransaction ? "Saving" : "Confirm"}
        isLoading={savingTransaction}
        isDestructive={false}
      />

      {isConvertModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in"
            onClick={() => setIsConvertModalOpen(false)}>
            <div
              className="bg-[var(--color-bg-card)] rounded-xl w-full max-w-md shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-4">
                Convert to Event Registrant
              </h2>
              <form onSubmit={handleConvertSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Select Event *
                  </label>
                  <CustomSelect
                    value={convertEventId}
                    onChange={(e) => {
                      setConvertEventId(e.target.value);
                      setConvertActivityId("");
                    }}
                    options={[
                      { value: "", label: "Select an Event" },
                      ...events.map((e) => ({
                        value: e._id,
                        label: e.name,
                      })),
                    ]}
                    className="w-full bg-white dark:bg-[var(--color-bg-subtle)]"
                  />
                </div>

                {convertEventId && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                      Select Event Action *
                    </label>
                    <CustomSelect
                      value={convertActivityId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConvertActivityId(val);
                        const activity = eventActivities.find((a) => a._id === val);
                        if (activity && (!convertAmount || convertAmount === "0")) {
                           setConvertAmount(activity.amount);
                        }
                      }}
                      options={[
                        { value: "", label: "Select an Action" },
                        ...eventActivities.map((a) => ({
                          value: a._id,
                          label: a.title,
                        })),
                      ]}
                      className="w-full bg-white dark:bg-[var(--color-bg-subtle)]"
                    />
                  </div>
                )}



                <div className="space-y-1.5 pt-2 border-t border-purple-500/20 mt-3">
                  <label className="block text-xs font-bold text-[var(--color-status-success)] uppercase tracking-wider flex items-center gap-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="Enter amount paid..."
                    value={convertAmount}
                    onChange={(e) => setConvertAmount(e.target.value)}
                    className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-purple-500/30 rounded-xl px-4 py-2 focus:outline-none focus:border-purple-500 text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsConvertModalOpen(false)}
                    className="flex-1 px-4 py-2 text-[var(--color-text-main)] bg-[var(--color-bg-subtle)] rounded-lg text-sm font-semibold hover:bg-[var(--color-border-subtle)] transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white bg-purple-600 rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors">
                    Convert Lead
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmationDialog
        isOpen={showConvertConfirm}
        onClose={() => setShowConvertConfirm(false)}
        onConfirm={confirmConvertSave}
        title="Convert Lead"
        message="Are you sure you want to convert this lead to an Event Registrant? This action will set the legacy amount paid to 0 and record a proper Event transaction instead."
        confirmText={savingTransaction ? "Converting..." : "Confirm"}
        isLoading={savingTransaction}
        isDestructive={false}
      />

      {isConvertMemberModalOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in"
            onClick={() => setIsConvertMemberModalOpen(false)}>
            <div
              className="bg-[var(--color-bg-card)] rounded-xl w-full max-w-md shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-4">
                Choose the Tier
              </h2>
              <form onSubmit={handleConvertMemberSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Membership Tier *
                  </label>
                  <CustomSelect
                    value={convertMemberTier}
                    onChange={(e) => setConvertMemberTier(e.target.value)}
                    options={[
                      { value: "", label: "Select a Tier" },
                      ...tiers.map((t) => ({
                        value: t._id,
                        label: t.name,
                      })),
                    ]}
                    className="w-full bg-white dark:bg-[var(--color-bg-subtle)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={convertMemberStart}
                      onChange={(e) => setConvertMemberStart(e.target.value)}
                      className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-emerald-500/30 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={convertMemberEnd}
                      onChange={(e) => setConvertMemberEnd(e.target.value)}
                      className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-emerald-500/30 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-emerald-500/20 mt-3">
                  <label className="block text-xs font-bold text-[var(--color-status-success)] uppercase tracking-wider flex items-center gap-1">
                    Amount Paid (₹) *
                  </label>
                  <input
                    type="number"
                    placeholder="Enter amount paid..."
                    value={convertMemberAmount}
                    onChange={(e) => setConvertMemberAmount(e.target.value)}
                    className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-emerald-500/30 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
                  <button
                    type="button"
                    onClick={() => setIsConvertMemberModalOpen(false)}
                    className="flex-1 px-4 py-2 text-[var(--color-text-main)] bg-[var(--color-bg-subtle)] rounded-lg text-sm font-semibold hover:bg-[var(--color-border-subtle)] transition-colors">
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 text-white bg-emerald-600 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors">
                    Confirm Tier
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      <ConfirmationDialog
        isOpen={showConvertMemberConfirm}
        onClose={() => setShowConvertMemberConfirm(false)}
        onConfirm={confirmConvertMemberSave}
        title="Choose Tier"
        message="Are you sure you want to assign this tier? This action will set the legacy amount paid to 0 and record a proper Membership transaction."
        confirmText={savingTransaction ? "Saving..." : "Confirm"}
        isLoading={savingTransaction}
        isDestructive={false}
      />

      <ConfirmationDialog
        isOpen={showDeleteTransactionConfirm}
        onClose={() => setShowDeleteTransactionConfirm(false)}
        onConfirm={confirmDeleteTransaction}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This action cannot be undone."
        confirmText={deletingTransaction ? "Deleting..." : "Delete"}
        isLoading={deletingTransaction}
        isDestructive={true}
      />

      <EditTransactionModal
        isOpen={isEditTransactionModalOpen}
        onClose={() => setIsEditTransactionModalOpen(false)}
        transaction={transactionToEdit}
        leadId={leadId}
        token={token}
        onSuccess={fetchData}
        tiers={tiers}
        events={events}
        allEventActivities={eventActivities}
      />
    </div>
  );
}
