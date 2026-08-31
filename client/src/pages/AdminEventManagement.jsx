import React, { useState, useEffect } from "react";
import { Plus, Search, Calendar, MapPin, Edit2, Trash2, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";
import toast from "react-hot-toast";
import Spinner from "../components/ui/Spinner";
import { Skeleton, TableSkeleton } from '../components/ui/Skeleton';
import ConfirmationDialog from "../components/ui/ConfirmationDialog";
import { useNavigate } from "react-router-dom";
import Modal from "../components/ui/Modal";
import CustomSelect from "../components/ui/CustomSelect";
import Toggle from "../components/settings/Toggle";

export default function AdminEventManagement() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // Save confirmation state
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    venue: "",
    description: "",
    status: "Upcoming",
    displayInList: true,
    allowedTiers: []
  });

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/membership-tiers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTiers(data.data.filter(t => t.isActive));
      }
    } catch (err) {
      console.error("Error fetching tiers", err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/events`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setEvents(data);
      } else {
        toast.error(data.error || "Failed to fetch events");
      }
    } catch (err) {
      toast.error("Error fetching events");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        name: event.name,
        date: new Date(event.date).toISOString().split('T')[0],
        venue: event.venue,
        description: event.description || "",
        status: event.status,
        displayInList: event.displayInList !== false,
        allowedTiers: event.allowedTiers ? event.allowedTiers.map(t => t._id || t) : []
      });
    } else {
      setEditingEvent(null);
      setFormData({
        name: "",
        date: "",
        venue: "",
        description: "",
        status: "Upcoming",
        displayInList: true,
        allowedTiers: []
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setShowSaveConfirm(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    
    const url = editingEvent 
      ? `${API_URL}/api/events/${editingEvent._id}`
      : `${API_URL}/api/events`;
      
    const method = editingEvent ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (res.ok) {
        toast.success(editingEvent ? "Event updated" : "Event created");
        fetchEvents();
        setIsModalOpen(false);
        setShowSaveConfirm(false);
      } else {
        toast.error(data.error || "Failed to save event");
      }
    } catch (err) {
      toast.error("Error saving event");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (event, e) => {
    e.stopPropagation();
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/events/${eventToDelete._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Event deleted");
        fetchEvents();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete event");
      }
    } catch (err) {
      toast.error("Error deleting event");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="fade-in space-y-8 pb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton variant="text" className="h-6 w-48" />
            <Skeleton variant="text" className="h-4 w-64" />
          </div>
          <Skeleton variant="rectangular" className="h-10 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden flex flex-col h-48">
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <Skeleton variant="text" className="h-6 w-32" />
                  <Skeleton variant="rectangular" className="h-5 w-16 rounded-full" />
                </div>
                <div className="space-y-2 mb-6 flex-1">
                  <Skeleton variant="text" className="h-4 w-full" />
                  <Skeleton variant="text" className="h-4 w-3/4" />
                </div>
                <div className="flex justify-between items-end mt-auto">
                  <div className="space-y-2 w-1/2">
                    <Skeleton variant="text" className="h-4 w-full" />
                    <Skeleton variant="text" className="h-4 w-3/4" />
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
        <div className="mt-8 space-y-4">
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden p-4">
            <TableSkeleton rows={4} columns={8} />
          </div>
        </div>
      </div>
    );
  }


  const upcomingEvents = events.filter(e => e.status === 'Upcoming');
  const pastEvents = events.filter(e => e.status === 'Completed' || e.status === 'Cancelled');

  return (
    <div className="fade-in space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">Event Management</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage events and related activities</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-[var(--color-primary)] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[var(--color-primary)]/90 flex items-center justify-center gap-2 transition-colors shrink-0"
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {upcomingEvents.length === 0 ? (
          <div className="col-span-full bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-12 text-center flex flex-col items-center justify-center">
            <Calendar className="w-12 h-12 text-[var(--color-text-light)] mb-4" />
            <h3 className="text-lg font-bold text-[var(--color-text-main)] mb-2">No upcoming events</h3>
            <p className="text-sm text-[var(--color-text-muted)] max-w-sm mb-6">Create your first upcoming event to start managing activities.</p>
            <button
              onClick={() => handleOpenModal()}
              className="bg-[var(--color-primary)] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[var(--color-primary)]/90 transition-colors"
            >
              Create Event
            </button>
          </div>
        ) : (
          upcomingEvents.map((event) => (
            <div 
              key={event._id} 
              onClick={() => navigate(`/admin/events/${event._id}`)}
              className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden cursor-pointer group flex flex-col"
            >
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-semibold text-lg text-[var(--color-text-main)] truncate pr-4">{event.name}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 bg-yellow-500/10 text-yellow-600`}>
                    {event.status}
                  </span>
                </div>
                
                <p className="text-sm text-[var(--color-text-muted)] line-clamp-2 mb-6 flex-1">
                  {event.description || "No description provided."}
                </p>
                
                <div className="flex justify-between items-end mt-auto">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-main)]">
                      <Calendar size={14} className="text-[var(--color-text-light)] shrink-0" />
                      <span className="truncate">{new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-[var(--color-text-main)]">
                      <MapPin size={14} className="text-[var(--color-text-light)] shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenModal(event);
                      }}
                      className="p-1.5 rounded-lg transition-colors hover:bg-gray-50 text-[var(--color-text-light)] hover:text-[var(--color-primary)] cursor-pointer"
                      title="Edit Event"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(event, e)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-[var(--color-text-light)] hover:text-red-500"
                      title="Delete Event"
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

      {/* Past Events Table */}
      {pastEvents.length > 0 && (
        <div className="mt-8 space-y-4">
          <div className="bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)] text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold">
                    <th className="px-6 py-4">Event Name</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Venue</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Revenue</th>
                    <th className="px-6 py-4 text-right">Spending</th>
                    <th className="px-6 py-4 text-right">Net Profit</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-subtle)]">
                  {pastEvents.map((event) => (
                    <tr 
                      key={event._id}
                      onClick={() => navigate(`/admin/events/${event._id}`)}
                      className="hover:bg-[var(--color-bg-subtle)]/50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-semibold text-sm text-[var(--color-text-main)]">{event.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[var(--color-text-muted)]">
                          {new Date(event.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-[var(--color-text-muted)]">{event.venue}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${
                          event.status === 'Completed' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-red-500/10 text-red-600'
                        }`}>
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-medium text-sm text-[var(--color-text-main)]">₹{(event.totalRevenue || 0).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="font-medium text-sm text-red-600">₹{(event.totalSpending || 0).toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className={`font-medium text-sm ${(event.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ₹{(event.netProfit || 0).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenModal(event);
                            }}
                            className="p-1.5 rounded-lg transition-colors hover:bg-gray-50 text-[var(--color-text-light)] hover:text-[var(--color-primary)] cursor-pointer"
                            title="Edit Event"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(event, e)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-[var(--color-text-light)] hover:text-red-500 cursor-pointer"
                            title="Delete Event"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title={editingEvent ? "Edit Event" : "Create New Event"}
      >
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">Event Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
              className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              placeholder="e.g., Annual Summit 2026"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData(prev => ({...prev, date: e.target.value}))}
              className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">Venue <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.venue}
              onChange={(e) => setFormData(prev => ({...prev, venue: e.target.value}))}
              className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              placeholder="e.g., Grand Hotel, NYC"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
              rows={3}
              className="w-full bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors resize-none"
              placeholder="Enter event details..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-[var(--color-text-main)]">Allowed Membership Tiers</label>
            <CustomSelect
              isMulti={true}
              options={tiers.map(tier => ({ value: tier._id, label: tier.name }))}
              value={formData.allowedTiers}
              onChange={(e) => setFormData(prev => ({ ...prev, allowedTiers: e.target.value }))}
              placeholder="Select Membership Tiers"
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Toggle 
              enabled={formData.displayInList} 
              onChange={(val) => setFormData(prev => ({...prev, displayInList: val}))} 
            />
            <div>
              <label className="block text-sm font-bold text-[var(--color-text-main)] cursor-pointer" onClick={() => setFormData(prev => ({...prev, displayInList: !prev.displayInList}))}>
                Display in Dropdowns
              </label>
              <p className="text-xs text-[var(--color-text-muted)]">Show this event in transaction and lead modals.</p>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 text-sm font-semibold text-[var(--color-text-main)] hover:bg-[var(--color-bg-subtle)] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/90 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Spinner size={14} />}
              {editingEvent ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Event"
        message={`Are you sure you want to delete "${eventToDelete?.name}"? All associated activities will also be deleted. This action cannot be undone.`}
        confirmText={deleting ? "Deleting" : "Delete Event"}
        isDestructive={true}
        isLoading={deleting}
      />

      <ConfirmationDialog
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onConfirm={confirmSave}
        title={editingEvent ? "Save Event Changes" : "Create Event"}
        message={editingEvent ? "Are you sure you want to save these changes to the event?" : "Are you sure you want to create this new event?"}
        confirmText={saving ? "Saving" : "Confirm"}
        isDestructive={false}
        isLoading={saving}
      />
    </div>
  );
}
