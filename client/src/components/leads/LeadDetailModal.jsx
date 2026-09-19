import {
  Clipboard,
  Eye,
  FileText,
  Flame,
  MessageCircle,
  MessageSquare,
  Sparkles,
  Tag,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Unlock,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import PI from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
const PhoneInput = PI.default || PI;
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { API_URL } from "../../config";
import { useAuth } from "../../context/AuthContext";
import { getLeadStatusBg, getLeadStatusColor } from "../../utils/statusColors";
import Toggle from "../settings/Toggle";
import { Skeleton } from "../ui/Skeleton";
import ConfirmationDialog from "../ui/ConfirmationDialog";
import CustomSelect from "../ui/CustomSelect";
import ConfiguredCitySelector from "../ui/ConfiguredCitySelector";
import Spinner from "../ui/Spinner";

export default function LeadDetailModal({ leadId, onClose, onNext, onPrev }) {
  const { token, user } = useAuth();

  // Data State
  const [lead, setLead] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);

  // Message fields
  const [replyText, setReplyText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [showTemplatesPopover, setShowTemplatesPopover] = useState(false);
  const timelineEndRef = React.useRef(null);

  // Edit fields
  const [status, setStatus] = useState("New");
  const [priority, setPriority] = useState("normal");
  const [assignedTo, setAssignedTo] = useState("");
  const [newNoteText, setNewNoteText] = useState("");
  const [statusNoteText, setStatusNoteText] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [age, setAge] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [platform, setPlatform] = useState("other");
  const [otherPlatform, setOtherPlatform] = useState("");
  const [username, setUsername] = useState("");
  const [isRenewal, setIsRenewal] = useState(false);

  // Won logic toggles
  const [includeMembership, setIncludeMembership] = useState(true);
  const [includeEvent, setIncludeEvent] = useState(false);

  // Membership fields
  const [membershipTiers, setMembershipTiers] = useState([]);
  const [selectedTier, setSelectedTier] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split("T")[0];
  });
  const [offerApplied, setOfferApplied] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState("");

  // Event fields
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [eventActivities, setEventActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState("");
  const [eventAmountPaid, setEventAmountPaid] = useState("");
  const [eventOfferApplied, setEventOfferApplied] = useState(false);
  const [eventDiscountPercentage, setEventDiscountPercentage] = useState("");

  const [saveError, setSaveError] = useState(null);
  const [duplicateLeadId, setDuplicateLeadId] = useState(null);

  const scrollToBottom = () => {
    timelineEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (status === "Won") {
      setIncludeMembership(true);
      setIncludeEvent(false);
      if (startDate && lead?.status !== "Won") {
        const d = new Date(startDate);
        d.setFullYear(d.getFullYear() + 1);
        setEndDate(d.toISOString().split("T")[0]);
      }
    }
  }, [status, startDate, lead?.status, membershipTiers]);

  useEffect(() => {
    scrollToBottom();
  }, [timeline]);

  useEffect(() => {
    if (token) {
      fetch(`${API_URL}/api/rules-templates/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setTemplates(data);
          }
        })
        .catch((err) => console.error("Failed to fetch templates:", err));
    }
  }, [token]);

  useEffect(() => {
    if (
      token &&
      status === "Won" &&
      lead?.status !== "Won" &&
      membershipTiers.length === 0
    ) {
      fetch(`${API_URL}/api/membership-tiers`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            // filter active tiers
            const activeTiers = data.data.filter((t) => t.isActive);
            setMembershipTiers(activeTiers);
          }
        })
        .catch((err) => console.error("Failed to fetch tiers:", err));
    }
  }, [token, status, lead?.status]);

  // Fetch events for Won status
  useEffect(() => {
    if (
      token &&
      status === "Won" &&
      lead?.status !== "Won" &&
      events.length === 0
    ) {
      fetch(`${API_URL}/api/events?activeOnly=true`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setEvents(data);
          } else if (data && data.success && Array.isArray(data.data)) {
            setEvents(data.data);
          } else if (data && data.message) {
            console.error("API returned error:", data.message);
            toast.error(
              "Could not load events: " +
                data.message +
                ". Did you restart the backend?",
            );
          }
        })
        .catch((err) => {
          console.error("Failed to fetch events:", err);
          toast.error("Network error while fetching events");
        });
    }
  }, [token, status, lead?.status]);

  // Fetch activities when an event is selected
  useEffect(() => {
    if (token && selectedEvent) {
      fetch(`${API_URL}/api/events/${selectedEvent}/activities`, {
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
  }, [token, selectedEvent]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch single lead details
        const leadRes = await fetch(`${API_URL}/api/leads/${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const leadData = await leadRes.json();

        // Fetch timeline details
        const timelineRes = await fetch(
          `${API_URL}/api/leads/${leadId}/timeline`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const timelineData = await timelineRes.json();

        // Fetch agents
        const agentsRes = await fetch(`${API_URL}/api/leads/agents`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const agentsData = await agentsRes.json();

        if (leadRes.ok) {
          setLead(leadData);
          setStatus(leadData.status);
          setPriority(leadData.priority || "normal");
          setAssignedTo(leadData.assignedTo?._id || leadData.assignedTo || "");
          setNewNoteText(""); // reset note input
          setTags(leadData.tags || []);
          setName(leadData.name || "");
          setEmail(leadData.email || "");
          setPhone(leadData.phone || "");
          setCity(leadData.city || "");
          setAge(leadData.age !== undefined && leadData.age !== null ? leadData.age : "");
          setDob(leadData.dob ? new Date(leadData.dob).toISOString().split("T")[0] : "");
          setGender(leadData.gender || "");
          setMaritalStatus(leadData.maritalStatus || "");
          setAmountPaid(leadData.amountPaid !== undefined && leadData.amountPaid !== null ? leadData.amountPaid : "");
          setEventAmountPaid(leadData.amountPaid !== undefined && leadData.amountPaid !== null ? leadData.amountPaid : "");
          setIsRenewal(leadData.isRenewal || false);
          const p = leadData.platform || "other";
          if (
            ["instagram", "facebook", "youtube", "linkedin", "whatsapp", "other"].includes(
              p,
            )
          ) {
            setPlatform(p);
            setOtherPlatform("");
          } else {
            setPlatform("other");
            setOtherPlatform(p);
          }
          setUsername(leadData.username || "");
        }

        if (timelineRes.ok) {
          setTimeline(timelineData.timeline);
        }

        if (agentsRes.ok) {
          setAgents(agentsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (token && leadId) {
      fetchData();
    }
  }, [token, leadId]);

  // Validate before saving
  const handleSaveAttempt = () => {
    const initialAssignedTo = lead?.assignedTo?._id || lead?.assignedTo || "";
    if (assignedTo && assignedTo !== initialAssignedTo) {
      if (!phone || phone.replace(/\D/g, '').length < 8) {
        toast.error("Phone number is mandatory when assigning the lead to an agent.");
        return;
      }
      if (!city || city.trim() === '') {
        toast.error("City is mandatory when assigning the lead to an agent.");
        return;
      }
    }

    if (status !== lead.status) {
      if (!statusNoteText.trim()) {
        toast.error("A note is mandatory when changing the lead status.");
        return;
      }

      if (status === "Won") {
        if (!includeMembership && !includeEvent) {
          toast.error(
            "You must include either a Membership or an Event when converting a lead.",
          );
          return;
        }
        if (includeMembership) {
          if (!selectedTier || amountPaid === "" || !startDate || !endDate) {
            toast.error(
              "Membership details (Tier, Start Date, End Date, Amount Paid) are mandatory.",
            );
            return;
          }

        }
        if (includeEvent) {
          if (!selectedEvent || !selectedActivity || eventAmountPaid === "") {
            toast.error(
              "Event details (Event, Activity, Amount Paid) are mandatory.",
            );
            return;
          }

        }
      }
    } else if (status === "Won") {
      if (
        includeMembership &&
        (amountPaid === "" || amountPaid === null || amountPaid === undefined || String(amountPaid).trim() === "")
      ) {
        toast.error("Amount Paid is mandatory.");
        return;
      }
      if (
        includeEvent &&
        (eventAmountPaid === "" || eventAmountPaid === null || eventAmountPaid === undefined || String(eventAmountPaid).trim() === "")
      ) {
        toast.error("Event Amount Paid is mandatory.");
        return;
      }
    }
    setShowSaveConfirmation(true);
  };

  // Handle saving details
  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      const payload = {
        status,
        priority,
        assignedTo: assignedTo || null,
        newNote: status !== lead?.status ? statusNoteText : newNoteText,
        tags,
        name,
        email,
        phone,
        city,
        age: age !== "" ? Number(age) : null,
        dob: dob ? dob : null,
        gender: gender || null,
        maritalStatus: maritalStatus || null,
        platform: platform === "other" ? otherPlatform.trim() : platform,
        username,
      };

      if (status === "Won") {
        payload.includeMembership = includeMembership;
        payload.includeEvent = includeEvent;

        if (includeMembership) {
          payload.membershipTierId = selectedTier;
          payload.subscriptionAmount = Number(amountPaid);
          payload.amountPaid = Number(amountPaid);
          payload.startDate = startDate;
          payload.endDate = endDate;
          payload.offerApplied = offerApplied;
          payload.discountPercentage = offerApplied
            ? Number(discountPercentage)
            : 0;
          payload.isRenewal = isRenewal;
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
      } else {
        payload.amountPaid = undefined;
        payload.isRenewal = undefined;
      }

      const res = await fetch(`${API_URL}/api/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setHasChanged(true);
        setStatusNoteText("");
        const updatedLeadRes = await fetch(`${API_URL}/api/leads/${leadId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (updatedLeadRes.ok) setLead(await updatedLeadRes.json());

        const timelineRes = await fetch(
          `${API_URL}/api/leads/${leadId}/timeline`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (timelineRes.ok) {
          const timelineData = await timelineRes.json();
          setTimeline(timelineData.timeline);
        }

        toast.success("Lead details saved successfully!");
      } else {
        const data = await res.json();
        setSaveError(data.error || 'Failed to update lead');
        if (res.status === 409 && data.existingLeadId) {
          setDuplicateLeadId(data.existingLeadId);
          toast.error(data.error || 'Phone number already exists on another lead.');
        } else {
          toast.error(data.error || 'Failed to update lead');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('An unexpected error occurred');
    } finally {
      setSaving(false);
      setShowSaveConfirmation(false);
    }
  };

  // Handle adding just a note
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
        setHasChanged(true);
        setLead(data.data); // Update lead data which includes the new note
        setNewNoteText("");
        toast.success("Note added successfully!");
      } else {
        toast.error(data.error || "Failed to add note");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  // Tag helpers
  const handleAddTag = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Message helpers
  const handleSendMessage = async () => {
    if (!replyText.trim() || !lead?.platformUserId) return;
    setSendingMessage(true);
    try {
      const res = await fetch(`${API_URL}/api/messages/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientId: lead.platformUserId,
          text: replyText,
        }),
      });
      if (res.ok) {
        setHasChanged(true);
        setReplyText("");
        // fetch timeline again to update UI
        const timelineRes = await fetch(
          `${API_URL}/api/leads/${leadId}/timeline`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (timelineRes.ok) {
          const timelineData = await timelineRes.json();
          setTimeline(timelineData.timeline);
        }
      } else {
        const data = await res.json();
        toast.error(`Failed to send message: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return createPortal(
      <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 fade-in">
        <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] w-full max-w-[1200px] h-full max-h-[90vh] flex flex-col rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-bg-subtle)] shrink-0">
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
              <div className="space-y-2">
                <Skeleton variant="text" className="h-4 w-32" />
                <Skeleton variant="text" className="h-3 w-20" />
              </div>
            </div>
            <Skeleton variant="rectangular" className="h-8 w-24 rounded-lg" />
          </div>
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
            <div className="w-full md:w-[350px] p-6 border-b md:border-b-0 md:border-r border-[var(--color-border-subtle)] flex flex-col gap-5 shrink-0 bg-[var(--color-bg-card)]">
              <Skeleton variant="text" className="h-4 w-32 mb-2" />
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton variant="text" className="h-3 w-20" />
                  <Skeleton variant="rectangular" className="h-10 w-full rounded-xl" />
                </div>
              ))}
            </div>
            <div className="flex-1 flex flex-col p-6 space-y-6 bg-[var(--color-bg-subtle)]">
              <Skeleton variant="text" className="h-4 w-40" />
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton variant="circular" className="h-8 w-8 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="h-4 w-32" />
                      <Skeleton variant="rectangular" className="h-16 w-full rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  const isClosed = lead?.status === "Won" || lead?.status === "Lost";

  return createPortal(
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 fade-in"
      onClick={() => onClose(hasChanged)}>
      {/* Container */}
      <div
        className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] w-full max-w-[1200px] h-full max-h-[90vh] flex flex-col rounded-xl overflow-hidden relative slide-up"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-bg-subtle)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden">
              {lead?.profilePicUrl ? (
                <img
                  src={lead.profilePicUrl}
                  alt={lead.username || lead.name || "Unknown"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-sm text-[var(--color-text-muted)]">
                  {(lead?.username || lead?.name || "??")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--color-text-main)] flex items-center gap-2">
                @{lead?.username}
                {priority === "super" ? (
                  <Sparkles
                    size={16}
                    className="text-purple-600 fill-purple-600"
                  />
                ) : priority === "hot" ? (
                  <Flame
                    size={16}
                    className="text-[var(--color-status-error)] fill-[var(--color-status-error)]"
                  />
                ) : null}
              </h3>
              <p className="text-xs text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">
                Source: {lead?.source}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isClosed && (
              <span className="text-xs font-bold text-[var(--color-status-error)] bg-[var(--color-status-error)]/10 px-2.5 py-1 rounded-md border border-[var(--color-status-error)]/20">
                Closed Lead
              </span>
            )}
            <button
              onClick={handleSaveAttempt}
              disabled={saving}
              className="btn-primary py-1.5 px-4 text-sm font-semibold shrink-0 rounded-lg flex items-center gap-2">
              {saving ? <Spinner size={16} /> : "Save Details"}
            </button>
            
            {(onPrev || onNext) && (
              <div className="flex items-center gap-0.5 border border-[var(--color-border-subtle)] rounded-lg p-0.5 bg-[var(--color-bg-app)]">
                <button
                  onClick={() => onPrev && onPrev(hasChanged)}
                  disabled={!onPrev}
                  className="p-1 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-main)] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Previous Lead"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="w-px h-4 bg-[var(--color-border-subtle)]"></div>
                <button
                  onClick={() => onNext && onNext(hasChanged)}
                  disabled={!onNext}
                  className="p-1 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)] hover:text-[var(--color-text-main)] disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                  title="Next Lead"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}

            <div className="w-px h-6 bg-[var(--color-border-subtle)] mx-1"></div>
            <button
              onClick={() => onClose(hasChanged)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Modal content body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
          {/* Left panel: Info Form */}
          <div className="w-full md:w-[350px] p-6 border-b md:border-b-0 md:border-r border-[var(--color-border-subtle)] flex flex-col gap-5 overflow-y-auto shrink-0 bg-[var(--color-bg-card)]">
            <h4 className="font-bold text-sm text-[var(--color-text-main)]  uppercase tracking-wide">
              Lead Information
            </h4>
            
            {saveError && (
              <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-3 rounded-lg text-sm font-medium flex flex-col gap-2">
                <span>{saveError}</span>
              </div>
            )}

            {/* Priority toggle */}
            {priority !== "hot" && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5">
                  <Sparkles
                    size={16}
                    className={
                      priority === "super"
                        ? "text-purple-600 fill-purple-600"
                        : ""
                    }
                  />
                  Super Lead
                </span>
                <Toggle
                  enabled={priority === "super"}
                  onChange={(val) => setPriority(val ? "super" : "normal")}
                />
              </div>
            )}

            {/* Basic Info Fields */}
            <div className="space-y-3 pt-2 border-t border-[var(--color-border-subtle)]">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Phone
                </label>
                <PhoneInput
                  country={'in'}
                  enableSearch={true}
                  value={phone}
                  onChange={(value) => setPhone(value ? (value.startsWith('+') ? value : '+' + value) : '')}
                  inputClass="!w-full !bg-[var(--color-bg-subtle)] !text-[var(--color-text-main)] !border !border-[var(--color-border-subtle)] !rounded-xl !px-12 !py-2.5 !text-sm focus:!outline-none focus:!border-[var(--color-primary)] !transition-colors !h-auto"
                  buttonClass="!bg-transparent !border-0 !border-r !border-[var(--color-border-subtle)] !rounded-l-xl !pl-2 hover:!bg-[var(--color-bg-subtle)]"
                  containerClass="!w-full"
                  dropdownClass="!bg-[var(--color-bg-card)] !text-[var(--color-text-main)] !border-[var(--color-border-subtle)]"
                  searchClass="!bg-[var(--color-bg-subtle)] !text-[var(--color-text-main)] !border-[var(--color-border-subtle)]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  City
                </label>
                <ConfiguredCitySelector
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    Age
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 28"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    DOB (Optional)
                  </label>
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    Gender
                  </label>
                  <CustomSelect
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    options={[
                      { value: "", label: "Select Gender" },
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" },
                      { value: "Other", label: "Other" },
                    ]}
                    className="w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    Marital Status
                  </label>
                  <CustomSelect
                    value={maritalStatus}
                    onChange={(e) => setMaritalStatus(e.target.value)}
                    options={[
                      { value: "", label: "Select Status" },
                      { value: "Single", label: "Single" },
                      { value: "Divorced", label: "Divorced" },
                      { value: "Annulled", label: "Annulled" },
                      { value: "Widowed", label: "Widowed" },
                    ]}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Platform
                </label>
                <CustomSelect
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  options={[
                    { value: "instagram", label: "Instagram" },
                    { value: "whatsapp", label: "WhatsApp" },
                    { value: "facebook", label: "Facebook" },
                    { value: "youtube", label: "YouTube" },
                    { value: "linkedin", label: "LinkedIn" },
                    { value: "other", label: "Other" },
                  ]}
                  className="w-full"
                />
              </div>
            </div>

            {/* Tags input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
                <Tag size={13} /> Tags (Press Enter)
              </label>
              <input
                type="text"
                placeholder="Add tags..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm"
              />
              <div className="flex flex-wrap gap-1 mt-1">
                {tags.map((t, i) => (
                  <span
                    key={i}
                    className="text-xs bg-[var(--color-bg-active)] text-[var(--color-text-main)] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium border border-[var(--color-border-subtle)]">
                    {t}
                    <X
                      size={12}
                      className="cursor-pointer text-[var(--color-text-muted)] hover:text-black"
                      onClick={() => handleRemoveTag(t)}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right panel: Timeline & Tasks */}
          <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden bg-[var(--color-bg-subtle)]">
            {/* Timeline area */}
            <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[var(--color-border-subtle)] min-h-[400px] md:min-h-0">
              <div className="p-4 bg-[var(--color-bg-card)] font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider flex items-center justify-between shrink-0">
                <span>Unified Interaction History</span>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-bg-card)]">
                {timeline.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)]">
                    <MessageSquare size={36} className="opacity-40 mb-2" />
                    <p className="text-xs font-medium">
                      No recorded conversations.
                    </p>
                  </div>
                ) : (
                  timeline.map((item, idx) => {
                    const currentItemDateStr = new Date(
                      item.timestamp,
                    ).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    });
                    let showDateSeparator = false;
                    if (idx === 0) {
                      showDateSeparator = true;
                    } else {
                      const prevItemDateStr = new Date(
                        timeline[idx - 1].timestamp,
                      ).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                      if (currentItemDateStr !== prevItemDateStr) {
                        showDateSeparator = true;
                      }
                    }

                    const renderDateSeparator = () => {
                      if (!showDateSeparator) return null;
                      const dateObj = new Date(item.timestamp);
                      const today = new Date();
                      const isToday =
                        dateObj.toDateString() === today.toDateString();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const isYesterday =
                        dateObj.toDateString() === yesterday.toDateString();

                      let dateText = currentItemDateStr;
                      if (isToday) dateText = "Today";
                      else if (isYesterday) dateText = "Yesterday";

                      return (
                        <div className="flex justify-center my-4 select-none fade-in w-full">
                          <span className="text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg">
                            {dateText}
                          </span>
                        </div>
                      );
                    };

                    if (item.type === "status_change") {
                      return (
                        <React.Fragment key={idx}>
                          {renderDateSeparator()}
                          <div className="flex justify-center my-2.5 select-none fade-in">
                            <span
                              className="text-xs font-medium px-3.5 py-1 rounded-full border text-center max-w-[90%] flex items-center gap-1.5 -xs"
                              style={{
                                backgroundColor: getLeadStatusBg(
                                  item.newStatus ||
                                    item.text.replace("Moved to ", ""),
                                ),
                                color: getLeadStatusColor(
                                  item.newStatus ||
                                    item.text.replace("Moved to ", ""),
                                ),
                                borderColor: getLeadStatusBg(
                                  item.newStatus ||
                                    item.text.replace("Moved to ", ""),
                                ),
                              }}>
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                  backgroundColor: getLeadStatusColor(
                                    item.newStatus ||
                                      item.text.replace("Moved to ", ""),
                                  ),
                                }}></span>
                              {item.text} •{" "}
                              {new Date(item.timestamp).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}{" "}
                              {new Date(item.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </React.Fragment>
                      );
                    }

                    const isBot = item.sender === "BOT";
                    const isAgent = item.sender === "AGENT";
                    const isOutgoing = isBot || isAgent;
                    return (
                      <React.Fragment key={idx}>
                        {renderDateSeparator()}
                        <div
                          className={`flex flex-col ${isOutgoing ? "items-end" : "items-start"}`}>
                          {/* Bubble label */}
                          <span className="text-xs text-[var(--color-text-light)] mb-1 font-semibold flex items-center gap-1 px-1.5">
                            {item.type === "comment" ? (
                              <MessageSquare
                                size={10}
                                className="text-purple-400"
                              />
                            ) : (
                              <MessageCircle
                                size={10}
                                className="text-blue-400"
                              />
                            )}
                            {isBot
                              ? item.type === "comment"
                                ? "BOT Comment Reply"
                                : "BOT DM Reply"
                              : isAgent
                                ? "Agent Reply"
                                : `@${lead?.username}`}{" "}
                            •{" "}
                            {new Date(item.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>

                          {/* Text bubble */}
                          <div
                            className={`text-base leading-tight rounded-2xl max-w-[85%] md:max-w-[400px] w-fit flex flex-col overflow-hidden ${
                              isOutgoing
                                ? "bg-[var(--color-msg-outgoing)] text-[var(--color-msg-outgoing-text)] rounded-tr-none px-3.5 py-2.5"
                                : "bg-[var(--color-msg-incoming)] text-[var(--color-msg-incoming-text)] rounded-tl-none"
                            }`}>
                            {/* WhatsApp Style Post Context Header for Incoming Comments */}
                            {item.type === "comment" &&
                              !isOutgoing &&
                              (item.postThumbnail || item.postCaption) && (
                                <div className="bg-black/5 flex items-start gap-2 p-2 border-b border-black/10">
                                  {item.postThumbnail && (
                                    <div className="w-10 h-10 shrink-0 rounded bg-black/10 overflow-hidden flex items-center justify-center">
                                      <img
                                        src={item.postThumbnail}
                                        alt="Post"
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}
                                  {item.postCaption && (
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] uppercase font-bold text-black/40 mb-0.5 tracking-wider">
                                        Instagram Post
                                      </p>
                                      <p className="text-xs text-black/70 line-clamp-2 break-words whitespace-normal">
                                        {item.postCaption}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}

                            <div className={!isOutgoing ? "px-3.5 py-2.5" : ""}>
                              {(item.replyToId || item.replyToCommentId) &&
                                (() => {
                                  const repliedToId =
                                    item.replyToId || item.replyToCommentId;
                                  const originalMsg = timeline.find(
                                    (t) => t.id === repliedToId,
                                  );
                                  if (!originalMsg) return null;
                                  return (
                                    <div className="mb-2 pl-2 border-l-2 border-current opacity-70 text-xs overflow-hidden text-ellipsis line-clamp-2">
                                      <span className="font-semibold">
                                        {originalMsg.sender === "BOT"
                                          ? "BOT"
                                          : originalMsg.sender === "AGENT"
                                            ? "Agent"
                                            : `@${lead?.username}`}
                                      </span>
                                      <br />
                                      {originalMsg.text || "Attached media"}
                                    </div>
                                  );
                                })()}

                              {item.mediaUrl && item.type !== "comment" && (
                                <div
                                  className={`mb-2 rounded-lg overflow-hidden max-w-[120px] border border-[var(--color-border-subtle)] bg-black/5 relative group ${item.postUrl || item.permalink ? "cursor-pointer" : ""}`}>
                                  <div className="absolute top-1 right-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-sm z-10">
                                    Media
                                  </div>
                                  {item.mediaType === "VIDEO" ? (
                                    <video
                                      src={item.mediaUrl}
                                      className="w-full object-cover aspect-square"
                                    />
                                  ) : (
                                    <img
                                      src={item.mediaUrl}
                                      alt="post thumbnail"
                                      className="w-full object-cover aspect-square"
                                    />
                                  )}
                                  {(item.postUrl || item.permalink) && (
                                    <a
                                      href={item.postUrl || item.permalink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20"
                                      title="View on Instagram">
                                      <Eye
                                        size={24}
                                        className="text-white drop-shadow-md"
                                      />
                                    </a>
                                  )}
                                </div>
                              )}
                              {item.text}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={timelineEndRef} />
              </div>

              {/* Message Input */}
              {lead?.platformUserId && (lead?.platform === 'whatsapp' || lead?.platform === 'instagram') && (
                <div className="p-4 bg-[var(--color-bg-card)] border-t border-[var(--color-border-subtle)] shrink-0">
                  <div className="flex gap-3 border border-[var(--color-border-subtle)] rounded-full px-4 py-2 bg-[var(--color-bg-card)] items-center transition-colors duration-300">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSendMessage()
                      }
                      placeholder="Message..."
                      className="flex-1 bg-transparent border-none text-base focus:outline-none transition-all text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]"
                    />

                    {/* Canned Templates Insertion */}
                    <div className="relative flex items-center shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setShowTemplatesPopover(!showTemplatesPopover)
                        }
                        className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
                        title="Insert Reply Template">
                        <FileText size={18} />
                      </button>

                      {showTemplatesPopover && (
                        <div className="absolute bottom-10 right-0 w-64 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 flex flex-col max-h-48 overflow-y-auto fade-in">
                          <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider bg-[var(--color-bg-subtle)] flex items-center justify-between shrink-0">
                            <span>Reply Templates</span>
                            <button
                              onClick={() => setShowTemplatesPopover(false)}
                              className="text-[var(--color-text-light)] hover:text-black">
                              <X size={12} />
                            </button>
                          </div>
                          {templates.length === 0 ? (
                            <div className="p-3 text-xs text-[var(--color-text-light)] italic text-center">
                              No templates saved.
                            </div>
                          ) : (
                            templates.map((t) => (
                              <button
                                key={t._id}
                                type="button"
                                onClick={() => {
                                  setReplyText((prev) => prev + t.body);
                                  setShowTemplatesPopover(false);
                                }}
                                className="w-full text-left px-3 py-2.5 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-active)] border-b border-[var(--color-border-subtle)]/50 last:border-0 truncate font-semibold cursor-pointer"
                                title={t.body}>
                                {t.title}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !replyText.trim()}
                      className="text-[var(--color-primary)] font-semibold text-base hover:text-[var(--color-text-main)] transition-colors disabled:opacity-50 disabled:hover:text-[var(--color-primary)]">
                      {sendingMessage ? <Spinner size={16} /> : "Send"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Column 3: Lead Actions & Notes History */}
            <div className="w-full md:w-[350px] flex flex-col min-h-[400px] md:min-h-0 bg-[var(--color-bg-card)] border-t md:border-t-0 md:border-l border-[var(--color-border-subtle)]">
              <div className="p-4 bg-[var(--color-bg-card)] font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider flex items-center justify-between shrink-0">
                <span>Management & Notes</span>
              </div>

              <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
                {/* Assigned to agent select */}
                {["admin", "superadmin"].includes(user?.role) && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                      Assigned Agent
                    </label>
                    <CustomSelect
                      searchable={true}
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                      options={[
                        { value: "", label: "Unassigned" },
                        ...(user
                          ? [
                              {
                                value: user.id || user._id,
                                label: "Assign to Me",
                              },
                            ]
                          : []),
                        ...agents
                          .filter(
                            (a) =>
                              String(a._id) !== String(user?.id || user?._id),
                          )
                          .map((a) => ({
                            value: a._id,
                            label: `${a.name} (${a.role})`,
                          })),
                      ]}
                      className="w-full"
                    />
                  </div>
                )}

                {/* Status select */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                    Pipeline Stage
                  </label>
                  {(() => {
                    const pipelineOrder = {
                      New: 1,
                      "Not Picking": 2,
                      "Sent WhatsApp": 3,
                      "Call Later": 4,
                      Spoken: 5,
                      "Pitched Membership": 6,
                      "Following Up": 7,
                      "Payment Pending": 8,
                      Won: 9,
                      Lost: 10,
                      "On Hold": 11,
                      "Wrong Number": 12,
                    };
                    const currentStatusIndex = pipelineOrder[lead?.status] || 0;

                    const allStatusOptions = [
                      { value: "New", label: "New" },
                      { value: "Not Picking", label: "Not Picking" },
                      { value: "Sent WhatsApp", label: "Sent WhatsApp" },
                      { value: "Call Later", label: "Call Later" },
                      { value: "Spoken", label: "Spoken" },
                      {
                        value: "Pitched Membership",
                        label: "Pitched Membership",
                      },
                      { value: "Following Up", label: "Following Up" },
                      { value: "Payment Pending", label: "Payment Pending" },
                      { value: "Won", label: "Won" },
                      { value: "Lost", label: "Lost" },
                      { value: "On Hold", label: "On Hold" },
                      { value: "Wrong Number", label: "Wrong Number" },
                    ];

                    const specialStatuses = [
                      "On Hold",
                      "Wrong Number",
                    ];
                    const isFromSpecial =
                      lead && specialStatuses.includes(lead.status);

                    let validOptions = allStatusOptions.filter((opt) => {
                      if (opt.value === lead?.status) return true;
                      if (isFromSpecial) return opt.value !== "New";

                      const optIndex = pipelineOrder[opt.value] || 0;
                      if (optIndex === 0) return true;
                      if (!lead) return true;
                      if (currentStatusIndex === 0) return optIndex >= 2;
                      return optIndex >= currentStatusIndex;
                    });

                    if (
                      lead?.status &&
                      !validOptions.find((o) => o.value === lead.status)
                    ) {
                      validOptions.unshift({
                        value: lead.status,
                        label: lead.status,
                      });
                    }

                    return (
                      <CustomSelect
                        searchable={true}
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        options={validOptions}
                        className="w-full"
                      />
                    );
                  })()}
                </div>

                {status !== lead?.status && (
                  <div className="space-y-1.5 mt-3 fade-in">
                    <label className="block text-xs font-bold text-[var(--color-status-error)] uppercase tracking-wider flex items-center gap-1">
                      <Clipboard size={13} /> Mandatory Status Note *
                    </label>
                    <textarea
                      placeholder={`Reason for changing status to ${status}...`}
                      value={statusNoteText}
                      onChange={(e) => setStatusNoteText(e.target.value)}
                      className="w-full bg-[var(--color-status-error)]/5 text-[var(--color-text-main)] border border-[var(--color-status-error)]/30 rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-status-error)] text-sm resize-none min-h-[60px]"
                    />
                  </div>
                )}

                {status === "Won" && (
                  <div>
                    {lead?.status === "Won" ? (
                      <div className="text-center p-2 flex flex-col items-center">
                        <h4 className="text-sm font-bold text-[var(--color-status-success)] mb-1">
                          Lead is already converted to Won.
                        </h4>
                        <p className="text-xs text-[var(--color-text-muted)] mb-5">
                          To manage this customer, please visit the Customers page.
                        </p>
                        <a
                          href={`/customers/${lead._id}`}
                          className="bg-[var(--color-status-success)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:brightness-95 transition-all inline-block">
                          View Customer Profile
                        </a>
                      </div>
                    ) : (
                      <>
                        {status === "Won" && (
                          <div className="flex gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <Toggle
                                enabled={includeMembership}
                                onChange={setIncludeMembership}
                                disabled={status === "Won"}
                              />
                              <label
                                className={`text-sm font-semibold text-[var(--color-text-main)] ${status === "Won" ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                onClick={() =>
                                  status !== "Won" && setIncludeMembership(!includeMembership)
                                }>
                                Membership
                              </label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Toggle
                                enabled={includeEvent}
                                onChange={setIncludeEvent}
                              />
                              <label
                                className="text-sm font-semibold text-[var(--color-text-main)] cursor-pointer"
                                onClick={() => setIncludeEvent(!includeEvent)}>
                                Events
                              </label>
                            </div>
                          </div>
                        )}

                        {includeMembership && (
                          <div className="space-y-3 mb-6 p-4 border border-green-500/20 rounded-xl bg-white/50">
                            <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider border-b border-green-500/20 pb-2">
                              Membership Details
                            </h4>

                            <div className="flex items-center justify-between gap-2 mb-2 p-3.5 rounded-xl border border-green-500/20 bg-green-500/5">
                              <label
                                className="text-sm font-semibold text-[var(--color-text-main)] cursor-pointer"
                                onClick={() => setIsRenewal(!isRenewal)}>
                                This is a Renewal
                              </label>
                              <Toggle
                                enabled={isRenewal}
                                onChange={setIsRenewal}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="block text-xs font-bold text-[var(--color-text-main)] uppercase tracking-wider">
                                Membership Tier *
                              </label>
                              <CustomSelect
                                value={selectedTier}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedTier(val);
                                  const tier = membershipTiers.find(
                                    (t) => t._id === val,
                                  );
                                  if (tier) {
                                    setAmountPaid(tier.defaultSubscriptionAmount);
                                    const d = new Date(startDate || new Date());
                                    d.setFullYear(d.getFullYear() + 1);
                                    setEndDate(d.toISOString().split("T")[0]);
                                  }
                                }}
                                options={[
                                  { value: "", label: "Select a Tier" },
                                  ...membershipTiers.map((t) => ({
                                    value: t._id,
                                    label: t.name,
                                  })),
                                ]}
                                className="w-full bg-white"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
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
                                    if (val) {
                                      const d = new Date(val);
                                      d.setFullYear(d.getFullYear() + 1);
                                      setEndDate(d.toISOString().split("T")[0]);
                                    }
                                  }}
                                  className="w-full bg-white text-[var(--color-text-main)] border border-green-500/30 rounded-xl px-3 py-2 focus:outline-none focus:border-green-500 text-sm"
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
                                  className="w-full bg-white text-[var(--color-text-main)] border border-green-500/30 rounded-xl px-3 py-2 focus:outline-none focus:border-green-500 text-sm"
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



                            <div className="space-y-1.5 pt-2 border-t border-green-500/20">
                              <label className="block text-xs font-bold text-[var(--color-status-success)] uppercase tracking-wider flex items-center gap-1">
                                Amount Paid (₹) *
                              </label>
                              <input
                                type="number"
                                placeholder="Enter amount paid today..."
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                                className="w-full bg-white text-[var(--color-text-main)] border border-green-500/30 rounded-xl px-4 py-2 focus:outline-none focus:border-green-500 text-sm"
                              />
                            </div>
                          </div>
                        )}

                        {includeEvent && (
                          <div className="space-y-3 p-4 border border-blue-500/20 rounded-xl bg-white/50">
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
                                className="w-full bg-white"
                              />
                            </div>

                            {selectedEvent && (
                              <div className="space-y-1.5">
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
                                    if (activity)
                                      setEventAmountPaid(activity.amount);
                                  }}
                                  options={[
                                    { value: "", label: "Select an Action" },
                                    ...eventActivities.map((a) => ({
                                      value: a._id,
                                      label: a.title,
                                    })),
                                  ]}
                                  className="w-full bg-white"
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



                            <div className="space-y-1.5 pt-2 border-t border-blue-500/20">
                              <label className="block text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                                Amount Paid (₹) *
                              </label>
                              <input
                                type="number"
                                placeholder="Enter amount paid today..."
                                value={eventAmountPaid}
                                onChange={(e) =>
                                  setEventAmountPaid(e.target.value)
                                }
                                className="w-full bg-white text-[var(--color-text-main)] border border-blue-500/30 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 text-sm"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Notes Input */}
                <div className="space-y-1.5 mt-4">
                  <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
                    <Clipboard size={13} /> Add Note
                  </label>
                  <textarea
                    placeholder="Type interaction notes..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none min-h-[100px]"
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={handleAddNote}
                      disabled={addingNote || !newNoteText.trim()}
                      className="bg-[var(--color-primary)] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 flex items-center gap-2">
                      {addingNote ? <Spinner size={12} /> : "Save Note"}
                    </button>
                  </div>
                </div>

                {/* Notes History */}
                <div className="space-y-3 pt-4 border-t border-[var(--color-border-subtle)] mt-2">
                  <h4 className="font-bold text-sm text-[var(--color-text-main)] uppercase tracking-wide">
                    Notes History
                  </h4>
                  {!lead?.notes || lead.notes.length === 0 ? (
                    <p className="text-xs text-[var(--color-text-muted)] italic text-center py-4">
                      No notes recorded.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {[...lead.notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((note, idx) => (
                        <div
                          key={idx}
                          className="bg-[var(--color-bg-subtle)] p-3 rounded-lg border border-[var(--color-border-subtle)]">
                          <div className="flex justify-between items-start mb-1.5 gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded truncate shrink-0">
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
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showSaveConfirmation}
        onClose={() => setShowSaveConfirmation(false)}
        onConfirm={handleSaveDetails}
        title="Save Lead Details"
        message={`Are you sure you want to save these details for @${lead?.username || lead?.name || "this lead"}?`}
        confirmText="Save Details"
        cancelText="Cancel"
        isDestructive={false}
        isLoading={saving}
      />
    </div>,
    document.body,
  );
}
