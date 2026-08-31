import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import toast from "react-hot-toast";
import Spinner from "../components/ui/Spinner";
import Modal from "../components/ui/Modal";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";
import Table from "../components/ui/Table";
import Checkbox from "../components/ui/Checkbox";
import { Skeleton } from "../components/ui/Skeleton";
import Button from "../components/ui/Button";
import Toggle from "../components/settings/Toggle";
import { ShieldAlert, Edit2, Plus, Trash2 } from "lucide-react";

export default function AdminMembershipTiers() {
  const { token, user } = useAuth();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null,
    target: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Selection
  const [selectedTiers, setSelectedTiers] = useState([]);
  const [visibleTiers, setVisibleTiers] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [defaultSubscriptionAmount, setDefaultSubscriptionAmount] =
    useState("");
  const [level, setLevel] = useState("1");
  const [isActive, setIsActive] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (["admin", "superadmin"].includes(user?.role)) {
      fetchTiers();
    }
  }, [user, token]);

  const fetchTiers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/membership-tiers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTiers(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !defaultSubscriptionAmount || !level) {
      setError("Name, Amount and Level are required");
      return;
    }
    setConfirmDialog({ isOpen: true, type: "save", target: null });
  };

  const confirmSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const url = editingTier
        ? `${API_URL}/api/membership-tiers/${editingTier._id}`
        : `${API_URL}/api/membership-tiers`;

      const method = editingTier ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          defaultSubscriptionAmount: Number(defaultSubscriptionAmount),
          level: Number(level),
          isActive,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(
          `Tier ${editingTier ? "updated" : "created"} successfully`,
        );
        resetForm();
        fetchTiers();
      } else {
        setError(data.error || "Failed to save tier");
      }
    } catch (err) {
      setError("Failed to save tier");
    } finally {
      setSaving(false);
      setConfirmDialog({ isOpen: false, type: null, target: null });
    }
  };

  const handleEdit = (tier) => {
    setEditingTier(tier);
    setName(tier.name);
    setDefaultSubscriptionAmount(tier.defaultSubscriptionAmount);
    setLevel(tier.level || "1");
    setIsActive(tier.isActive);
    setError(null);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingTier(null);
    setName("");
    setDefaultSubscriptionAmount("");
    setLevel("1");
    setIsActive(true);
    setError(null);
    setIsModalOpen(false);
  };

  const handleBulkDelete = () => {
    setConfirmDialog({ isOpen: true, type: "bulk", target: null });
  };

  const executeBulkDelete = async () => {
    setIsDeletingBulk(true);
    try {
      for (const id of selectedTiers) {
        await fetch(`${API_URL}/api/membership-tiers/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setSelectedTiers([]);
      fetchTiers();
      toast.success(`${selectedTiers.length} tiers deleted`);
    } catch (err) {
      toast.error("Error deleting tiers");
    } finally {
      setIsDeletingBulk(false);
      setConfirmDialog({ isOpen: false, type: null, target: null });
    }
  };

  const handleDelete = (tier) => {
    setConfirmDialog({ isOpen: true, type: "single", target: tier });
  };

  const executeDelete = async () => {
    if (!confirmDialog.target) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/membership-tiers/${confirmDialog.target._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (data.success || res.ok) {
        if (editingTier?._id === confirmDialog.target._id) resetForm();
        fetchTiers();
        toast.success("Tier deleted");
      } else {
        throw new Error(data.error || "Failed to delete tier");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setConfirmDialog({ isOpen: false, type: null, target: null });
    }
  };

  const handleToggleSelectAll = () => {
    const visibleIds = visibleTiers.map((t) => t._id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedTiers.includes(id));

    if (allSelected) {
      setSelectedTiers((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedTiers((prev) => {
        const newSelection = [...prev];
        for (const id of visibleIds) {
          if (!newSelection.includes(id)) newSelection.push(id);
        }
        return newSelection;
      });
    }
  };

  const handleToggleSelectTier = (id) => {
    setSelectedTiers((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id],
    );
  };

  if (!["admin", "superadmin"].includes(user?.role)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center h-full text-[var(--color-text-muted)] fade-in">
        <ShieldAlert
          size={48}
          className="mb-4 text-[var(--color-status-error)] opacity-80"
        />
        <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-2">
          Access Denied
        </h2>
        <p className="max-w-md">
          You do not have permission to access membership tiers. This area is
          restricted.
        </p>
      </div>
    );
  }

  const tableColumns = [
    {
      label: (
        <Checkbox
          checked={
            visibleTiers.length > 0 &&
            visibleTiers.every((t) => selectedTiers.includes(t._id))
          }
          onChange={handleToggleSelectAll}
        />
      ),
      className: "w-10 text-center",
      render: (t) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedTiers.includes(t._id)}
            onChange={() => handleToggleSelectTier(t._id)}
          />
        </div>
      ),
      skeletonRender: () => (
        <div className="flex justify-center">
          <Skeleton variant="rectangular" className="h-4 w-4 rounded" />
        </div>
      ),
    },
    {
      label: "Level",
      sortable: true,
      key: "level",
      className: "w-20",
      render: (t) => (
        <span className="font-bold text-[var(--color-text-main)] bg-[var(--color-bg-subtle)] px-2 py-1 rounded-md">
          {t.level || 1}
        </span>
      ),
      skeletonRender: () => (
        <Skeleton variant="rectangular" className="h-6 w-8 rounded-md" />
      ),
    },
    {
      label: "Tier Name",
      sortable: true,
      key: "name",
      render: (t) => (
        <span className="font-medium text-[var(--color-text-main)]">
          {t.name}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-32" />,
    },
    {
      label: "Default Amount",
      sortable: true,
      key: "defaultSubscriptionAmount",
      render: (t) => (
        <span className="text-[var(--color-text-muted)] font-medium">
          ₹{t.defaultSubscriptionAmount.toLocaleString()}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-20" />,
    },
    {
      label: "Status",
      sortable: true,
      key: "isActive",
      render: (t) => (
        <span
          className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full font-bold ${t.isActive ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success)] border border-[var(--color-status-success)]/20" : "bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] border border-[var(--color-status-error)]/20"}`}
        >
          {t.isActive ? "Active" : "Inactive"}
        </span>
      ),
      skeletonRender: () => (
        <Skeleton variant="rectangular" className="h-5 w-16 rounded-full" />
      ),
    },
    {
      label: "Actions",
      className: "text-left",
      render: (t) => (
        <div className="flex items-center justify-left gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(t);
            }}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-app)] rounded-md transition-colors"
            title="Edit Tier"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(t);
            }}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-status-error-bg)] rounded-md transition-colors"
            title="Delete Tier"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      skeletonRender: () => (
        <div className="flex items-center justify-left gap-2">
          <Skeleton variant="rectangular" className="h-8 w-8 rounded-md" />
          <Skeleton variant="rectangular" className="h-8 w-8 rounded-md" />
        </div>
      ),
    },
  ];

  return (
    <div className="fade-in space-y-6 pb-20 flex flex-col">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">
            Membership Tiers
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Configure the membership tiers available for lead conversion.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 transition-opacity duration-200 ${selectedTiers.length > 0 ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <Button
              onClick={handleBulkDelete}
              variant="danger"
              className="text-sm font-semibold py-2 px-3 flex items-center gap-1.5"
              icon={Trash2}
              loading={isDeletingBulk}
            >
              Delete ({selectedTiers.length})
            </Button>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="text-sm font-semibold"
            icon={Plus}
          >
            Add Tier
          </Button>
        </div>
      </div>

      {/* List Area */}
      <Table
        columns={tableColumns}
        data={tiers}
        keyField="_id"
        itemsPerPage={10}
        isLoading={loading}
        onVisibleDataChange={setVisibleTiers}
        onRowClick={(t) => handleToggleSelectTier(t._id)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingTier ? "Edit Membership Tier" : "Create New Tier"}
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-4 rounded-xl text-sm mb-2 font-medium flex items-start gap-3">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form id="tierForm" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Tier Name
              </label>
              <input
                type="text"
                placeholder="e.g. Gold Membership"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Default Subscription Amount (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 5000"
                value={defaultSubscriptionAmount}
                onChange={(e) => setDefaultSubscriptionAmount(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Rank / Level
              </label>
              <input
                type="number"
                placeholder="e.g. 1"
                min="1"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Toggle enabled={isActive} onChange={setIsActive} />
              <label
                className="text-sm font-bold text-[var(--color-text-main)] cursor-pointer select-none"
                onClick={() => setIsActive(!isActive)}
              >
                Active (Available for selection)
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-bg-subtle)] rounded-lg hover:brightness-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Spinner size={16} />
                ) : editingTier ? (
                  "Update Tier"
                ) : (
                  "Create Tier"
                )}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, type: null, target: null })
        }
        onConfirm={
          confirmDialog.type === "single"
            ? executeDelete
            : confirmDialog.type === "bulk"
              ? executeBulkDelete
              : confirmSave
        }
        title={
          confirmDialog.type === "single"
            ? "Delete Tier"
            : confirmDialog.type === "bulk"
              ? "Bulk Delete Tiers"
              : editingTier
                ? "Save Tier Changes"
                : "Create New Tier"
        }
        message={
          confirmDialog.type === "single"
            ? `Are you sure you want to permanently delete the tier "${confirmDialog.target?.name}"? This action cannot be undone.`
            : confirmDialog.type === "bulk"
              ? `Are you sure you want to delete ${selectedTiers.length} tiers? This action cannot be undone.`
              : editingTier
                ? "Are you sure you want to save changes to this membership tier?"
                : "Are you sure you want to create this new membership tier?"
        }
        confirmText={
          confirmDialog.type === "save"
            ? saving
              ? "Saving"
              : "Confirm"
            : "Delete"
        }
        isLoading={isDeleting || isDeletingBulk || saving}
        isDestructive={confirmDialog.type !== "save"}
      />
    </div>
  );
}
