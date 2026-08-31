import { Edit2, Plus, ShieldAlert, Trash2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Checkbox from "../components/ui/Checkbox";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";
import CustomSelect from "../components/ui/CustomSelect";
import Modal from "../components/ui/Modal";
import Spinner from "../components/ui/Spinner";
import Table from "../components/ui/Table";
import Toggle from "../components/settings/Toggle";
import { Skeleton } from "../components/ui/Skeleton";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function AdminAccountCreation() {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Bulk Selection
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [visibleUsers, setVisibleUsers] = useState([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [isActive, setIsActive] = useState(true);
  const [designation, setDesignation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null,
    target: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { token, user } = useAuth();

  useEffect(() => {
    if (["admin", "superadmin"].includes(user?.role)) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/crm/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
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
          You do not have permission to access the account creation dashboard.
          This area is restricted to System Administrators only.
        </p>
      </div>
    );
  }

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setRole("agent");
    setIsActive(true);
    setDesignation("");
    setEditingUserId(null);
    setError(null);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (u) => {
    setEditingUserId(u._id);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setIsActive(u.isActive !== undefined ? u.isActive : true);
    setDesignation(u.designation || "");
    setPassword("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let res;
      let data;

      if (editingUserId) {
        // UPDATE MODE
        const body = { name, email, role, isActive, designation: designation || null };
        if (password) body.password = password;

        res = await fetch(`${API_URL}/api/auth/crm/users/${editingUserId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        });
      } else {
        // CREATE MODE
        res = await fetch(`${API_URL}/api/auth/crm/create-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, email, password, role, designation: designation || null }),
        });
      }

      data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            (editingUserId
              ? "Failed to update account"
              : "Failed to create account"),
        );
      }

      resetForm();
      fetchUsers();
      toast.success(editingUserId ? "Account updated" : "Account created");
    } catch (err) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (u) => {
    if (u._id === user._id) {
      toast.error("You cannot delete your own active account.");
      return;
    }
    setConfirmDialog({ isOpen: true, type: "single", target: u });
  };

  const executeDelete = async () => {
    if (!confirmDialog.target) return;
    setIsDeleting(true);
    try {
      const res = await fetch(
        `${API_URL}/api/auth/crm/users/${confirmDialog.target._id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");

      if (editingUserId === confirmDialog.target._id) resetForm();
      fetchUsers();
      toast.success("User deleted");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setConfirmDialog({ isOpen: false, type: null, target: null });
    }
  };

  const handleBulkDelete = () => {
    if (selectedUsers.includes(user._id)) {
      toast.error("You cannot delete your own account. Deselect it first.");
      return;
    }
    setConfirmDialog({ isOpen: true, type: "bulk", target: null });
  };

  const executeBulkDelete = async () => {
    setIsDeletingBulk(true);
    try {
      // API doesn't have a bulk-delete endpoint for users, so we'll do it sequentially
      // Note: Ideally, this should be a bulk API endpoint, but we loop here for demonstration
      for (const id of selectedUsers) {
        await fetch(`${API_URL}/api/auth/crm/users/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setSelectedUsers([]);
      fetchUsers();
      toast.success(`${selectedUsers.length} users deleted`);
    } catch (err) {
      toast.error("Error deleting users");
    } finally {
      setIsDeletingBulk(false);
      setConfirmDialog({ isOpen: false, type: null, target: null });
    }
  };

  const handleToggleSelectAll = () => {
    const visibleIds = visibleUsers.map((u) => u._id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedUsers.includes(id));

    if (allSelected) {
      setSelectedUsers((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedUsers((prev) => {
        const newSelection = [...prev];
        for (const id of visibleIds) {
          if (!newSelection.includes(id)) newSelection.push(id);
        }
        return newSelection;
      });
    }
  };

  const handleToggleSelectUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((uId) => uId !== id) : [...prev, id],
    );
  };

  const tableColumns = [
    {
      label: (
        <Checkbox
          checked={
            visibleUsers.length > 0 &&
            visibleUsers.every((u) => selectedUsers.includes(u._id))
          }
          onChange={handleToggleSelectAll}
        />
      ),
      skeletonRender: () => <Skeleton variant="circular" className="h-4 w-4 rounded-sm" />,
      className: "w-10 text-center",
      render: (u) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedUsers.includes(u._id)}
            onChange={() => handleToggleSelectUser(u._id)}
          />
        </div>
      ),
    },
    {
      label: "Name",
      sortable: true,
      key: "name",
      skeletonRender: () => (
        <div className="flex flex-col gap-1.5">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="text" className="h-3 w-48" />
        </div>
      ),
      render: (u) => (
        <div>
          <div className="font-semibold text-[var(--color-text-main)]">
            {u.name}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {u.email}
          </div>
        </div>
      ),
    },
    {
      label: "Role",
      sortable: true,
      key: "role",
      skeletonRender: () => <Skeleton variant="rectangular" className="h-5 w-16 rounded-md" />,
      render: (u) => (
        <span
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
            ["admin", "superadmin"].includes(u.role)
              ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
              : "bg-[var(--color-bg-app)] text-[var(--color-text-muted)] border border-[var(--color-border-subtle)]"
          }`}>
          {u.role}
        </span>
      ),
    },
    {
      label: "Designation",
      sortable: true,
      key: "designation",
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-24" />,
      render: (u) => (
        <span className="text-sm font-semibold text-[var(--color-text-main)]">
          {u.designation || "-"}
        </span>
      ),
    },
    {
      label: "Status",
      sortable: true,
      key: "isActive",
      skeletonRender: () => <Skeleton variant="rectangular" className="h-5 w-16 rounded-full" />,
      render: (u) => (
        <span
          className={`px-2.5 py-1 text-[10px] uppercase tracking-wider rounded-full font-bold ${u.isActive !== false ? "bg-[var(--color-status-success-bg)] text-[var(--color-status-success)] border border-[var(--color-status-success)]/20" : "bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] border border-[var(--color-status-error)]/20"}`}>
          {u.isActive !== false ? "Active" : "Disabled"}
        </span>
      ),
    },
    {
      label: "Actions",
      className: "text-left",
      skeletonRender: () => (
        <div className="flex items-center justify-left gap-2">
          <Skeleton variant="circular" className="h-7 w-7 rounded-md" />
          <Skeleton variant="circular" className="h-7 w-7 rounded-md" />
        </div>
      ),
      render: (u) => (
        <div className="flex items-center justify-left gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(u);
            }}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-bg-app)] rounded-md transition-colors"
            title="Edit User">
            <Edit2 size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(u);
            }}
            disabled={u._id === user._id}
            className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-status-error)] hover:bg-[var(--color-status-error-bg)] rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={
              u._id === user._id ? "You cannot delete yourself" : "Delete User"
            }>
            <Trash2 size={16} />
          </button>
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
            Account Management
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Provision and manage accounts for sales agents and system
            administrators.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 transition-opacity duration-200 ${selectedUsers.length > 0 ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <Button
              onClick={handleBulkDelete}
              variant="danger"
              className="text-sm font-semibold py-2 px-3 flex items-center gap-1.5"
              icon={Trash2}
              loading={isDeletingBulk}>
              Delete ({selectedUsers.length})
            </Button>
          </div>
          <Button
            onClick={openCreateModal}
            className="text-sm font-semibold"
            icon={Plus}>
            Add User
          </Button>
        </div>
      </div>

      {/* User Directory Table */}

      <Table
        columns={tableColumns}
        data={users}
        keyField="_id"
        itemsPerPage={10}
        isLoading={loadingUsers}
        onVisibleDataChange={setVisibleUsers}
        onRowClick={(u) => handleToggleSelectUser(u._id)}
      />

      {/* Unified Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingUserId ? "Edit Account" : "Create New Account"}
        maxWidth="max-w-md">
        <div className="space-y-4">
          {error && (
            <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-4 rounded-xl text-sm mb-2 font-medium flex items-start gap-3">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                placeholder="e.g. Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. jane@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                {editingUserId ? "New Password (Optional)" : "Initial Password"}
              </label>
              <input
                type="text"
                placeholder={
                  editingUserId
                    ? "Leave blank to keep current"
                    : "Provide a secure password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium placeholder-[var(--color-text-light)]"
                required={!editingUserId}
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Workspace Role
              </label>
              <CustomSelect
                value={role}
                onChange={(e) => setRole(e.target.value)}
                options={[
                  { value: "agent", label: "Sales Agent" },
                  { value: "admin", label: "System Admin" },
                  { value: "superadmin", label: "Super Admin" },
                ]}
                className="w-full py-3 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Designation
              </label>
              <CustomSelect
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                options={[
                  { value: "", label: "None" },
                  { value: "Manager", label: "Manager" },
                  { value: "Mentor", label: "Mentor" },
                ]}
                className="w-full py-3 rounded-xl"
              />
            </div>

            {editingUserId && (
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                  Account Status
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <Toggle 
                    enabled={isActive} 
                    onChange={setIsActive} 
                    disabled={editingUserId === user._id} 
                  />
                  <label
                    className={`text-sm font-bold cursor-pointer select-none ${editingUserId === user._id ? "opacity-50 cursor-not-allowed" : ""}`}
                    onClick={() => { if (editingUserId !== user._id) setIsActive(!isActive); }}
                  >
                    {isActive
                      ? "Active (Can login)"
                      : "Disabled (Cannot login)"}
                  </label>
                </div>
                {editingUserId === user._id && (
                  <p className="text-[10px] text-[var(--color-text-light)] italic mt-2">
                    You cannot disable your own account.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-border-subtle)]">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm font-medium text-[var(--color-text-main)] bg-[var(--color-bg-subtle)] rounded-lg hover:brightness-95 transition-all">
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm font-semibold text-white bg-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/90 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50">
                {loading ? (
                  <Spinner size={16} />
                ) : editingUserId ? (
                  "Save Changes"
                ) : (
                  "Create Account"
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
          confirmDialog.type === "single" ? executeDelete : executeBulkDelete
        }
        title={
          confirmDialog.type === "single"
            ? "Delete Account"
            : "Bulk Delete Accounts"
        }
        message={
          confirmDialog.type === "single"
            ? `Are you sure you want to permanently delete the account for ${confirmDialog.target?.name}? This action cannot be undone.`
            : `Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`
        }
        confirmText="Delete"
        isLoading={isDeleting || isDeletingBulk}
      />
    </div>
  );
}
