import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import CustomSelect from "../ui/CustomSelect";
import { API_URL } from "../../config";

export default function EditTransactionModal({
  isOpen,
  onClose,
  transaction,
  leadId,
  token,
  onSuccess,
  tiers = [],
  events = []
}) {
  const [saving, setSaving] = useState(false);
  
  // Membership Fields
  const [tierId, setTierId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [transactionType, setTransactionType] = useState("initial"); // initial, renewal, upgrade, downgrade, cancellation

  // Event Fields
  const [eventId, setEventId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [eventActivities, setEventActivities] = useState([]);

  // Audit Fields
  const [createdBy, setCreatedBy] = useState("");
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    if (isOpen && transaction) {
      if (transaction.type === "membership") {
        setTierId(transaction.tierId?._id || transaction.tierId || "");
        setStartDate(transaction.startDate ? new Date(transaction.startDate).toISOString().split("T")[0] : "");
        setEndDate(transaction.endDate ? new Date(transaction.endDate).toISOString().split("T")[0] : "");
        setAmountPaid(transaction.amountPaid !== undefined ? transaction.amountPaid : "");
        
        let tType = "initial";
        if (transaction.isCancellation) tType = "cancellation";
        else if (transaction.isUpgrade) tType = "upgrade";
        else if (transaction.isDowngrade) tType = "downgrade";
        else if (transaction.isRenewal) tType = "renewal";
        setTransactionType(tType);
      } else {
        setEventId(transaction.eventId?._id || transaction.eventId || "");
        setActivityId(transaction.activityId?._id || transaction.activityId || "");
        setAmountPaid(transaction.amountPaid !== undefined ? transaction.amountPaid : "");
      }
      setCreatedBy(transaction.createdBy?._id || transaction.createdBy || "");
    }
  }, [isOpen, transaction]);

  // Fetch agents for the Created By dropdown
  useEffect(() => {
    if (isOpen && agents.length === 0) {
      fetch(`${API_URL}/api/leads/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setAgents(data);
          } else if (data && data.success && Array.isArray(data.data)) {
            setAgents(data.data);
          }
        })
        .catch(err => console.error("Failed to fetch agents", err));
    }
  }, [isOpen, token, agents.length]);

  // Handle Event Activities fetching for edit modal
  useEffect(() => {
    if (isOpen && transaction?.type === "event" && eventId) {
      fetch(`${API_URL}/api/events/${eventId}/activities`, {
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
    }
  }, [eventId, token, isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const endpoint = transaction.type === "membership" 
        ? `${API_URL}/api/leads/${leadId}/transactions/membership/${transaction._id}`
        : `${API_URL}/api/leads/${leadId}/transactions/event/${transaction._id}`;
      
      let payload = {};
      if (transaction.type === "membership") {
        payload = {
          tierId,
          startDate,
          endDate,
          amountPaid: transactionType === "cancellation" ? -Math.abs(Number(amountPaid)) : Number(amountPaid),
          isRenewal: transactionType === "renewal",
          isUpgrade: transactionType === "upgrade",
          isDowngrade: transactionType === "downgrade",
          isCancellation: transactionType === "cancellation",
          createdBy: createdBy || ""
        };
      } else {
        payload = {
          eventId,
          activityId,
          amountPaid: Number(amountPaid),
          createdBy: createdBy || ""
        };
      }

      const res = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success("Transaction updated successfully!");
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to update transaction");
      }
    } catch (err) {
      toast.error("Error saving changes");
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 fade-in"
      onClick={onClose}>
      <div
        className="bg-[var(--color-bg-card)] rounded-xl w-full max-w-md shadow-2xl p-6 relative overflow-y-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-4">
          Edit {transaction.type === "membership" ? "Membership" : "Event"} Transaction
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {transaction.type === "membership" && (
            <>
              <div className="flex items-center gap-2 mb-3 p-2 rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-x-auto">
                {["initial", "renewal", "upgrade", "downgrade", "cancellation"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTransactionType(type)}
                    className={`flex-1 py-1.5 px-3 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                      transactionType === type
                        ? "bg-blue-500 text-white"
                        : "text-[var(--color-text-main)] hover:bg-blue-500/10"
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
                  value={tierId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTierId(val);
                    const tier = tiers.find(t => t._id === val);
                    if (tier) {
                      const isTrial = tier.name.toLowerCase().includes("trial");
                      const d = new Date(startDate || new Date());
                      if (isTrial) {
                        d.setMonth(d.getMonth() + 1);
                      } else {
                        d.setFullYear(d.getFullYear() + 1);
                      }
                      setEndDate(d.toISOString().split("T")[0]);
                    }
                  }}
                  options={[
                    { value: "", label: "Select a Tier" },
                    ...tiers.map((t) => ({ value: t._id, label: t.name }))
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setStartDate(val);
                      const tier = tiers.find(t => t._id === tierId);
                      if (val) {
                        const isTrial = tier && tier.name.toLowerCase().includes("trial");
                        const d = new Date(val);
                        if (isTrial) {
                          d.setMonth(d.getMonth() + 1);
                        } else {
                          d.setFullYear(d.getFullYear() + 1);
                        }
                        setEndDate(d.toISOString().split("T")[0]);
                      }
                    }}
                    className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-3 py-2 text-sm"
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
                    className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5 mt-3">
                <label className="block text-xs font-bold text-[var(--color-status-success)] uppercase tracking-wider">
                  Amount Paid (₹) *
                </label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2 text-sm"
                />
              </div>
            </>
          )}

          {transaction.type === "event" && (
            <>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                  Select Event *
                </label>
                <CustomSelect
                  value={eventId}
                  onChange={(e) => {
                    setEventId(e.target.value);
                    setActivityId("");
                  }}
                  options={[
                    { value: "", label: "Select an Event" },
                    ...events.map((e) => ({ value: e._id, label: e.name }))
                  ]}
                  className="w-full bg-white dark:bg-[var(--color-bg-subtle)]"
                />
              </div>

              {eventId && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                    Select Event Action *
                  </label>
                  <CustomSelect
                    value={activityId}
                    onChange={(e) => setActivityId(e.target.value)}
                    options={[
                      { value: "", label: "Select an Action" },
                      ...eventActivities.map((a) => ({ value: a._id, label: a.title }))
                    ]}
                    className="w-full bg-white dark:bg-[var(--color-bg-subtle)]"
                  />
                </div>
              )}

              <div className="space-y-1.5 pt-2 border-t border-[var(--color-border-subtle)] mt-3">
                <label className="block text-xs font-bold text-[var(--color-status-success)] uppercase tracking-wider flex items-center gap-1">
                  Amount Paid (₹) *
                </label>
                <input
                  type="number"
                  placeholder="Enter amount paid..."
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full bg-white dark:bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2 text-sm"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5 pt-2 border-t border-[var(--color-border-subtle)] mt-3">
            <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
              Created By (Agent)
            </label>
            <CustomSelect
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              options={[
                { value: "", label: "Unknown / No Agent" },
                ...agents.map((a) => ({ value: a._id, label: a.name }))
              ]}
              className="w-full bg-white dark:bg-[var(--color-bg-subtle)]"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-[var(--color-text-main)] bg-[var(--color-bg-subtle)] rounded-lg text-sm font-semibold hover:bg-[var(--color-border-subtle)] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
