import React, { useEffect, useState } from "react";
import { Edit2, Plus, ShieldAlert, Trash2, Users } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../components/ui/Button";
import Checkbox from "../components/ui/Checkbox";
import CustomSelect from "../components/ui/CustomSelect";
import Modal from "../components/ui/Modal";
import { Skeleton } from "../components/ui/Skeleton";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";
import { API_URL } from "../config";
import { useAuth } from "../context/AuthContext";

export default function AdminTeamConfiguration() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [name, setName] = useState("");
  const [leadId, setLeadId] = useState("");
  const [memberIds, setMemberIds] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null,
    target: null,
  });
  
  const { token, user } = useAuth();

  useEffect(() => {
    if (["admin", "superadmin"].includes(user?.role)) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/api/teams`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/api/auth/crm/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      const teamsData = await teamsRes.json();
      const usersData = await usersRes.json();
      
      if (teamsRes.ok) setTeams(teamsData.data || []);
      if (usersRes.ok) setUsers(usersData || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  if (!["admin", "superadmin"].includes(user?.role)) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center h-full text-[var(--color-text-muted)] fade-in">
        <ShieldAlert size={48} className="mb-4 text-[var(--color-status-error)] opacity-80" />
        <h2 className="text-xl font-bold text-[var(--color-text-main)] mb-2">Access Denied</h2>
        <p className="max-w-md">You do not have permission to access the team configuration dashboard.</p>
      </div>
    );
  }

  const resetForm = () => {
    setName("");
    setLeadId("");
    setMemberIds([]);
    setEditingTeamId(null);
    setError(null);
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (team) => {
    setEditingTeamId(team._id);
    setName(team.name);
    setLeadId(team.lead?._id || "");
    setMemberIds((team.members || []).map(m => m._id));
    setError(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (team) => {
    setConfirmDialog({ isOpen: true, type: "delete", target: team });
  };

  const executeDelete = async () => {
    if (!confirmDialog.target) return;
    
    try {
      const res = await fetch(`${API_URL}/api/teams/${confirmDialog.target._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to delete team");
      
      toast.success("Team deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setConfirmDialog({ isOpen: false, type: null, target: null });
    }
  };

  const handleSubmitClick = (e) => {
    e.preventDefault();
    if (!name || !leadId) {
      setError("Please provide a team name and select a lead.");
      return;
    }
    setConfirmDialog({ isOpen: true, type: "save", target: null });
  };

  const executeSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const url = editingTeamId 
        ? `${API_URL}/api/teams/${editingTeamId}` 
        : `${API_URL}/api/teams`;
      const method = editingTeamId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ name, lead: leadId, members: memberIds })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save team");
      
      toast.success(editingTeamId ? "Team updated" : "Team created");
      resetForm();
      fetchData();
      setConfirmDialog({ isOpen: false, type: null, target: null });
    } catch (err) {
      setError(err.message);
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    } finally {
      setSaving(false);
    }
  };

  const toggleMember = (id) => {
    setMemberIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const potentialLeads = users.filter(u => u.designation === "Manager" || u.designation === "Mentor");
  const potentialMembers = users.filter(u => u._id !== leadId); // Prevent lead from being a member? We can just show all.

  return (
    <div className="fade-in space-y-6 pb-20 flex flex-col">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">
            Team Configuration
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Group users into teams and assign managers or mentors to lead them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openCreateModal} className="text-sm font-semibold" icon={Plus}>
            Create Team
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden flex flex-col h-48">
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4">
                  <Skeleton variant="text" className="h-6 w-32" />
                </div>
                <div className="mb-6 flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
                    <div className="flex flex-col flex-1 gap-2">
                      <Skeleton variant="text" className="h-3 w-20" />
                      <div className="flex items-center gap-2">
                        <Skeleton variant="text" className="h-5 w-32" />
                        <Skeleton variant="rectangular" className="h-4 w-16 rounded-md" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-end mt-auto pt-4 border-t border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circular" className="h-4 w-4 shrink-0" />
                    <Skeleton variant="text" className="h-4 w-24" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton variant="rectangular" className="h-8 w-8 rounded-lg" />
                    <Skeleton variant="rectangular" className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {teams.length === 0 ? (
            <div className="col-span-full bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-12 text-center flex flex-col items-center justify-center">
              <Users className="w-12 h-12 text-[var(--color-text-light)] mb-4" />
              <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2">No teams configured</h3>
              <p className="text-sm text-[var(--color-text-muted)] max-w-sm mb-6">Create your first team to start grouping users together.</p>
              <button
                onClick={openCreateModal}
                className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors"
              >
                Create Team
              </button>
            </div>
          ) : (
            teams.map((team) => (
              <div 
                key={team._id}
                onClick={() => handleEdit(team)}
                className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden cursor-pointer group flex flex-col"
              >
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-lg text-[var(--color-text-main)] truncate pr-4">{team.name}</h3>
                  </div>
                  
                  <div className="mb-6 flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[var(--color-primary)] font-bold text-sm shrink-0 mt-0.5">
                        {team.lead?.name?.charAt(0).toUpperCase() || "L"}
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider mb-0.5">Team Lead</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-bold text-[var(--color-text-main)] truncate">{team.lead?.name || "Unknown"}</span>
                          {team.lead?.designation && (
                            <span className="px-2 py-0.5 rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-[10px] font-bold uppercase tracking-wider">
                              {team.lead.designation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end mt-auto pt-4 border-t border-[var(--color-border-subtle)]">
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-main)]">
                      <Users size={16} className="text-[var(--color-text-light)] shrink-0" />
                      <span className="font-medium text-[var(--color-text-muted)]">{team.members?.length || 0} Members</span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(team);
                        }}
                        className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-[var(--color-text-light)] hover:text-red-500 cursor-pointer"
                        title="Delete Team"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingTeamId ? "Edit Team" : "Create New Team"}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-4 rounded-xl text-sm mb-2 font-medium flex items-start gap-3">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmitClick} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                  Team Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alpha Squad"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                  Team Lead
                </label>
                <CustomSelect
                  value={leadId}
                  onChange={(e) => {
                    setLeadId(e.target.value);
                    if (memberIds.includes(e.target.value)) {
                      setMemberIds(prev => prev.filter(id => id !== e.target.value));
                    }
                  }}
                  options={[
                    { value: "", label: "Select a Manager or Mentor" },
                    ...potentialLeads.map(u => ({
                      value: u._id,
                      label: `${u.name} (${u.designation})`
                    }))
                  ]}
                  className="w-full py-3 rounded-xl"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                Select Team Members
              </label>
              {potentialMembers.length === 0 ? (
                <div className="text-sm text-[var(--color-text-muted)]">No users available.</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 max-h-60 overflow-y-auto gap-2 p-3 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-xl custom-scrollbar">
                  {potentialMembers.map(u => (
                    <div
                      key={u._id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                        memberIds.includes(u._id)
                          ? "bg-[var(--color-primary)]/5 border-[var(--color-primary)]/30"
                          : "bg-[var(--color-bg-card)] border-transparent hover:border-[var(--color-border-subtle)]"
                      }`}
                      onClick={() => toggleMember(u._id)}
                    >
                      <Checkbox
                        checked={memberIds.includes(u._id)}
                        onChange={() => toggleMember(u._id)}
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[var(--color-text-main)]">
                          {u.name}
                        </span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {u.designation || u.role}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-[var(--color-border-subtle)]">
              <Button type="button" variant="secondary" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" loading={saving}>
                {editingTeamId ? "Save Changes" : "Create Team"}
              </Button>
            </div>
          </form>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: null, target: null })}
        onConfirm={confirmDialog.type === "delete" ? executeDelete : executeSave}
        title={confirmDialog.type === "delete" ? "Delete Team" : (editingTeamId ? "Save Changes" : "Create Team")}
        message={
          confirmDialog.type === "delete"
            ? `Are you sure you want to permanently delete the team "${confirmDialog.target?.name}"? This action cannot be undone.`
            : `Are you sure you want to ${editingTeamId ? "save these changes" : "create this team"}?`
        }
        confirmText={confirmDialog.type === "delete" ? "Delete" : "Confirm"}
        isDestructive={confirmDialog.type === "delete"}
        loading={saving}
      />
    </div>
  );
}
