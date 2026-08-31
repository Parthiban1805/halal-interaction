import { API_URL } from "../config";
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import Spinner from "../components/ui/Spinner";
import Table from "../components/ui/Table";
import Button from "../components/ui/Button";
import Checkbox from "../components/ui/Checkbox";
import ConfirmationDialog from "../components/ui/ConfirmationDialog";
import { Skeleton } from "../components/ui/Skeleton";
import {
  Search,
  X,
  XCircle,
  Calendar,
  Sparkles,
  Flame,
  User,
  Users,
  Trash2,
} from "lucide-react";
import CustomSelect from "../components/ui/CustomSelect";

const formatAge = (timestamp) => {
  if (!timestamp) return "";
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 0) return "0m";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export default function CustomersList() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("");

  const [posts, setPosts] = useState([]);
  const [postsWithLeads, setPostsWithLeads] = useState([]);
  const [postFilter, setPostFilter] = useState("");
  const [sortBy, setSortBy] = useState("updated_desc");
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [agentFilter, setAgentFilter] = useState("");
  const [agents, setAgents] = useState([]);

  const [datePreset, setDatePreset] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showDateMenu, setShowDateMenu] = useState(false);
  const dateMenuRef = useRef(null);

  const [customerTypes, setCustomerTypes] = useState([]);
  const [showCustomerTypeMenu, setShowCustomerTypeMenu] = useState(false);
  const customerTypeMenuRef = useRef(null);

  const [tierFilter, setTierFilter] = useState("");
  const [membershipTiers, setMembershipTiers] = useState([]);

  const [membershipChangeFilter, setMembershipChangeFilter] = useState("all");

  const [renewalDatePreset, setRenewalDatePreset] = useState("all");
  const [customRenewalStartDate, setCustomRenewalStartDate] = useState("");
  const [customRenewalEndDate, setCustomRenewalEndDate] = useState("");
  const [showRenewalDateMenu, setShowRenewalDateMenu] = useState(false);
  const renewalDateMenuRef = useRef(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLeads, setSelectedLeads] = useState([]);
  const [visibleLeads, setVisibleLeads] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(event.target)) {
        setShowDateMenu(false);
      }
      if (
        renewalDateMenuRef.current &&
        !renewalDateMenuRef.current.contains(event.target)
      ) {
        setShowRenewalDateMenu(false);
      }
      if (
        customerTypeMenuRef.current &&
        !customerTypeMenuRef.current.contains(event.target)
      ) {
        setShowCustomerTypeMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (token && ["admin", "superadmin"].includes(user?.role)) {
      fetch(`${API_URL}/api/leads/agents`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) setAgents(data);
        })
        .catch((err) => console.error("Failed to fetch agents:", err));
    }
  }, [token, user]);

  useEffect(() => {
    const fetchPosts = async () => {
      let allFetchedPosts = [];
      let afterMedia = null;
      let afterTags = null;

      while (afterMedia !== "done" || afterTags !== "done") {
        try {
          const params = new URLSearchParams();
          if (afterMedia) params.append("afterMedia", afterMedia);
          if (afterTags) params.append("afterTags", afterTags);

          const res = await fetch(
            `${API_URL}/api/account/posts?${params.toString()}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          const data = await res.json();

          if (data.posts && data.posts.length > 0) {
            allFetchedPosts = [...allFetchedPosts, ...data.posts];
            const uniqueMap = new Map();
            allFetchedPosts.forEach((p) => uniqueMap.set(p.id, p));
            const uniquePosts = Array.from(uniqueMap.values());
            uniquePosts.sort(
              (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
            );
            setPosts(uniquePosts);
          }

          afterMedia = data.nextMediaCursor;
          afterTags = data.nextTagsCursor;

          if (!afterMedia && !afterTags) break;
        } catch (err) {
          console.error("Error fetching batched posts:", err);
          break;
        }
      }

      try {
        const pWLRes = await fetch(`${API_URL}/api/leads/posts-with-leads`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pWLRes.ok) {
          const pWLData = await pWLRes.json();
          setPostsWithLeads(pWLData);
        }
      } catch (err) {
        console.error("Error fetching posts with leads:", err);
      }
    };

    const fetchTiers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/membership-tiers`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMembershipTiers(data.data || data || []);
        }
      } catch (err) {
        console.error("Error fetching tiers:", err);
      }
    };

    if (token) {
      fetchPosts();
      fetchTiers();
    }
  }, [token]);

  const fetchLeads = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (priorityFilter && priorityFilter !== "all")
        params.append("priority", priorityFilter);
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (sourceFilter) params.append("source", sourceFilter);
      if (postFilter) params.append("postId", postFilter);
      if (["admin", "superadmin"].includes(user?.role) && agentFilter) {
        params.append("assignedTo", agentFilter);
      } else if (assignedToMe) {
        params.append("assignedToMe", "true");
      }

      if (datePreset !== "all") {
        const now = new Date();
        let start, end;
        switch (datePreset) {
          case "today":
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
            break;
          case "yesterday":
            start = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 1,
            );
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
            break;
          case "last_7_days":
            start = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 7,
            );
            end = now;
            break;
          case "last_30_days":
            start = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 30,
            );
            end = now;
            break;
          case "this_month":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = now;
            break;
          case "last_month":
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(
              now.getFullYear(),
              now.getMonth(),
              0,
              23,
              59,
              59,
              999,
            );
            break;
          case "custom":
            if (customStartDate) start = new Date(customStartDate);
            if (customEndDate) end = new Date(customEndDate);
            break;
        }
        if (start) params.append("startDate", start.toISOString());
        if (end) params.append("endDate", end.toISOString());
        params.append("filterByWonDate", "true");
      }

      if (customerTypes.length > 0) {
        params.append("customerType", customerTypes.join(","));
      }
      if (tierFilter) {
        params.append("tierId", tierFilter);
      }
      if (membershipChangeFilter && membershipChangeFilter !== "all") {
        params.append("membershipChangeType", membershipChangeFilter);
      }
      if (renewalDatePreset !== "all") {
        const now = new Date();
        let start, end;
        switch (renewalDatePreset) {
          case "today":
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
            break;
          case "yesterday":
            start = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 1,
            );
            end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
            break;
          case "last_7_days":
            start = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 7,
            );
            end = now;
            break;
          case "last_30_days":
            start = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate() - 30,
            );
            end = now;
            break;
          case "this_month":
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            );
            break;
          case "next_month":
            start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            end = new Date(
              now.getFullYear(),
              now.getMonth() + 2,
              0,
              23,
              59,
              59,
              999,
            );
            break;
          case "custom":
            if (customRenewalStartDate)
              start = new Date(customRenewalStartDate);
            if (customRenewalEndDate) end = new Date(customRenewalEndDate);
            break;
        }
        if (start) params.append("renewalStartDate", start.toISOString());
        if (end) params.append("renewalEndDate", end.toISOString());
      }

      // Server-side pagination parameters
      params.append("page", currentPage);
      params.append("limit", 10);
      params.append("sort", sortBy);
      
      // Ensure we only fetch customer leads
      params.append("status", "Won");

      const res = await fetch(`${API_URL}/api/leads?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: abortControllerRef.current.signal,
      });
      const data = await res.json();
      if (res.ok) {
        if (data && data.data) {
          setLeads(data.data);
          setTotalPages(data.totalPages || 1);
          setTotalItems(data.total || data.data.length);
        } else if (Array.isArray(data)) {
          // Fallback for array response
          const wonLeads = data.filter((l) => l.status === "Won");
          setLeads(wonLeads);
          setTotalPages(1);
          setTotalItems(wonLeads.length);
        }
      } else {
        console.error("Failed to fetch customers:", data);
        setLeads([]);
      }
    } catch (err) {
      if (err.name === "AbortError") return;
      console.error("Error fetching customers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    const visibleLeadIds = visibleLeads.map((l) => l._id);
    const allVisibleSelected =
      visibleLeadIds.length > 0 &&
      visibleLeadIds.every((id) => selectedLeads.includes(id));

    if (allVisibleSelected) {
      setSelectedLeads((prev) =>
        prev.filter((id) => !visibleLeadIds.includes(id)),
      );
    } else {
      setSelectedLeads((prev) => {
        const newSelection = [...prev];
        for (const id of visibleLeadIds) {
          if (!newSelection.includes(id)) newSelection.push(id);
        }
        return newSelection;
      });
    }
  };

  const handleToggleSelectLead = (id) => {
    setSelectedLeads((prev) =>
      prev.includes(id) ? prev.filter((lId) => lId !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/leads/bulk-delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ leadIds: selectedLeads }),
      });
      if (res.ok) {
        setSelectedLeads([]);
        fetchLeads();
        setShowDeleteConfirm(false);
        toast.success(`${selectedLeads.length} customers deleted`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete customers");
      }
    } catch (err) {
      console.error("Error deleting customers:", err);
      toast.error("Server error deleting customers");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchLeads();
    }
  }, [
    token,
    debouncedSearch,
    priorityFilter,
    sortBy,
    sourceFilter,
    postFilter,
    assignedToMe,
    agentFilter,
    datePreset,
    customStartDate,
    customEndDate,
    customerTypes,
    tierFilter,
    membershipChangeFilter,
    renewalDatePreset,
    customRenewalStartDate,
    customRenewalEndDate,
    currentPage
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    priorityFilter,
    sortBy,
    sourceFilter,
    postFilter,
    assignedToMe,
    agentFilter,
    datePreset,
    customStartDate,
    customEndDate,
    customerTypes,
    tierFilter,
    membershipChangeFilter,
    renewalDatePreset,
    customRenewalStartDate,
    customRenewalEndDate
  ]);

  const columns = [
    {
      label: (
        <Checkbox
          checked={
            visibleLeads.length > 0 &&
            visibleLeads.every((l) => selectedLeads.includes(l._id))
          }
          onChange={handleToggleSelectAll}
        />
      ),
      key: "select",
      render: (lead) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedLeads.includes(lead._id)}
            onChange={() => handleToggleSelectLead(lead._id)}
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
      label: "Customer",
      key: "name",
      sortable: true,
      render: (lead) => (
        <div className="flex flex-col">
          <span className="text-[var(--color-text-main)] font-semibold text-sm whitespace-nowrap">
            {lead.name || (
              <span className="text-[var(--color-text-light)] italic">
                Unknown
              </span>
            )}
          </span>
          <span className="text-[var(--color-text-muted)] text-xs mt-0.5 opacity-75 whitespace-nowrap">
            {lead.username ? `@${lead.username}` : ""}
          </span>
        </div>
      ),
      skeletonRender: () => (
        <div className="flex flex-col gap-1">
          <Skeleton variant="text" className="h-4 w-32" />
          <Skeleton variant="text" className="h-3 w-20" />
        </div>
      ),
    },
    {
      label: "Phone",
      key: "phone",
      render: (lead) => (
        <span className="text-[var(--color-text-muted)] font-medium text-sm">
          {lead.phone || "-"}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-24" />,
    },
    {
      label: "City",
      key: "city",
      sortable: true,
      render: (lead) => (
        <span className="text-[var(--color-text-muted)] font-medium text-sm">
          {lead.city || "-"}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-20" />,
    },
    {
      label: "Source",
      key: "platform",
      sortable: true,
      render: (lead) => {
        const sourceVal = (lead.source || "").toLowerCase();
        let displaySource = "Other";
        if (sourceVal === "dm") displaySource = "Direct Messages";
        else if (sourceVal === "comment") displaySource = "Comments";
        else if (sourceVal === "manual") displaySource = "Manual";
        else if (sourceVal === "mention") displaySource = "Mention";

        return (
          <span className="text-sm text-[var(--color-text-muted)] font-medium">
            {displaySource}
          </span>
        );
      },
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-20" />,
    },
    {
      label: "Assigned To",
      key: "assignedTo",
      render: (lead) => (
        <span className="text-[var(--color-text-muted)] font-medium text-sm">
          {lead.assignedTo ? lead.assignedTo.name : "-"}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-24" />,
    },
    {
      label: "Age",
      key: "age",
      render: (lead) => (
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">
          {formatAge(lead.createdAt || lead.timestamp)}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-12" />,
    },
    {
      label: "Type",
      key: "customerTypes",
      render: (lead) => {
        let displayTypes = lead.customerTypes || [];
        const hasMember = displayTypes.some((t) =>
          t.toLowerCase().includes("member"),
        );
        const hasEventRegistrant = displayTypes.some((t) =>
          t.toLowerCase().includes("event"),
        );

        if (hasMember && hasEventRegistrant) {
          displayTypes = displayTypes.filter(
            (t) => !t.toLowerCase().includes("event"),
          );
        }

        return (
          <div className="flex flex-col gap-1">
            {displayTypes.length > 0 ? (
              displayTypes.map((type, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold uppercase tracking-wider bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-[var(--color-text-main)] px-2 py-0.5 rounded w-fit"
                >
                  {type === "eventRegistrant"
                    ? "Event Registrant"
                    : type === "member"
                      ? "Member"
                      : type === "trialMember"
                        ? "Trial Member"
                        : type}
                </span>
              ))
            ) : (
              <span className="text-xs text-[var(--color-text-muted)]">-</span>
            )}
          </div>
        );
      },
      skeletonRender: () => (
        <Skeleton variant="rectangular" className="h-5 w-16 rounded" />
      ),
    },
    {
      label: "Tier",
      key: "membershipTier",
      render: (lead) => (
        <span className="text-sm font-medium text-[var(--color-text-main)] whitespace-nowrap">
          {lead.membershipTier || "-"}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-20" />,
    },
    {
      label: "Renewal Date",
      key: "renewalDate",
      render: (lead) => (
        <span className="text-sm font-medium text-[var(--color-text-main)] whitespace-nowrap">
          {lead.renewalDate
            ? new Date(lead.renewalDate).toLocaleDateString()
            : "-"}
        </span>
      ),
      skeletonRender: () => <Skeleton variant="text" className="h-4 w-20" />,
    },
    {
      label: "Last Updated",
      key: "updatedAt",
      render: (lead) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-[var(--color-text-main)] whitespace-nowrap">
            {lead.updatedAt
              ? new Date(lead.updatedAt).toLocaleDateString()
              : "-"}
          </span>
          <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap mt-0.5">
            {lead.updatedAt
              ? new Date(lead.updatedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </span>
        </div>
      ),
      skeletonRender: () => (
        <div className="flex flex-col gap-1">
          <Skeleton variant="text" className="h-4 w-20" />
          <Skeleton variant="text" className="h-3 w-16" />
        </div>
      ),
    },
  ];

  return (
    <div className="fade-in space-y-6 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">
            Customers
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            View and manage converted customers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 transition-opacity duration-200 ${selectedLeads.length > 0 ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          >
            <Button
              onClick={handleBulkDelete}
              variant="danger"
              className="text-sm font-semibold py-2 px-3 flex items-center gap-1.5"
              icon={Trash2}
            >
              Delete ({selectedLeads.length})
            </Button>
          </div>
        </div>
      </div>

      {/* Top action bar - Row 1 */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 w-full">
        <div className="relative w-full md:max-w-md">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
          />
          <input
            type="text"
            placeholder="Search by name, username, phone, email, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
              title="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:flex md:items-center gap-3 shrink-0 w-full md:w-auto">
          {["admin", "superadmin"].includes(user?.role) ? (
            <CustomSelect searchable={true}
              className="w-full md:w-auto"
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e.target.value);
                setAssignedToMe(false);
              }}
              options={[
                { value: "", label: "All Agents" },
                { value: "me", label: "Assigned to Me" },
                { value: "unassigned", label: "Unassigned" },
                ...agents
                  .filter(
                    (a) => String(a._id) !== String(user?.id || user?._id),
                  )
                  .map((a) => ({
                    value: a._id,
                    label: `${a.name} (${a.role})`,
                  })),
              ]}
            />
          ) : null}
        </div>
      </div>

      {/* Top action bar - Row 2 (Filters) */}
      <div className="grid grid-cols-2 md:flex md:flex-wrap md:items-center gap-3 shrink-0 w-full">
        <CustomSelect
          className="w-full md:w-auto"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          options={[
            { value: "updated_desc", label: "Recently Updated" },
            { value: "newest", label: "Newest First" },
            { value: "oldest", label: "Oldest First" },
            { value: "username_asc", label: "Username (A-Z)" },
            { value: "username_desc", label: "Username (Z-A)" },
          ]}
        />

        <CustomSelect searchable={true}
          className="w-full md:w-auto"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          options={[
            { value: "", label: "All Sources" },
            { value: "dm", label: "Direct Messages" },
            { value: "comment", label: "Comments" },
            { value: "manual", label: "Manual" },
            { value: "other", label: "Other" },
          ]}
        />

        <CustomSelect searchable={true}
          value={postFilter}
          onChange={(e) => setPostFilter(e.target.value)}
          className="col-span-2 md:col-span-1 min-w-[250px] sm:w-[250px] md:w-[250px] w-full md:w-auto"
          options={[
            { value: "", label: "All Posts" },
            ...posts
              .filter((p) => postsWithLeads.includes(p.id))
              .map((p) => {
                const postDate = p.timestamp
                  ? new Date(p.timestamp).toLocaleString([], {
                      dateStyle: "short",
                      timeStyle: "short",
                    })
                  : "";
                const captionText = p.caption
                  ? p.caption.length > 30
                    ? p.caption.substring(0, 30) + "..."
                    : p.caption
                  : "Post " + p.id;
                return {
                  value: p.id,
                  displayLabel: captionText,
                  label: postDate ? (
                    <div className="flex flex-col text-left py-0.5">
                      <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider leading-none mb-1">
                        {postDate}
                      </span>
                      <span className="truncate">{captionText}</span>
                    </div>
                  ) : (
                    captionText
                  ),
                };
              }),
          ]}
        />

        <CustomSelect searchable={true}
          className="w-full md:w-auto"
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          options={[
            { value: "", label: "All Tiers" },
            ...membershipTiers.map((t) => ({ value: t._id, label: t.name })),
          ]}
        />

        <div className="relative shrink-0 w-full md:w-auto" ref={dateMenuRef}>
          <button
            onClick={() => setShowDateMenu(!showDateMenu)}
            className={`w-full md:w-auto bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between md:justify-start gap-2 transition-colors ${showDateMenu || datePreset !== "all" ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-[var(--color-border-subtle)]"}`}
          >
            <Calendar size={16} />
            {datePreset === "all"
              ? "All Time"
              : datePreset === "today"
                ? "Today"
                : datePreset === "yesterday"
                  ? "Yesterday"
                  : datePreset === "last_7_days"
                    ? "Last 7 Days"
                    : datePreset === "last_30_days"
                      ? "Last 30 Days"
                      : datePreset === "this_month"
                        ? "This Month"
                        : datePreset === "last_month"
                          ? "Last Month"
                          : "Custom Range"}
          </button>
          {showDateMenu && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-2 flex flex-col fade-in shadow-xl">
              {[
                "this_month",
                "all",
                "today",
                "yesterday",
                "last_7_days",
                "last_30_days",
                "last_month",
                "custom",
              ].map((preset) => (
                <label
                  key={preset}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    name="date_preset"
                    checked={datePreset === preset}
                    onChange={() => setDatePreset(preset)}
                    className="accent-[var(--color-primary)]"
                  />
                  {preset === "all"
                    ? "All Time"
                    : preset === "today"
                      ? "Today"
                      : preset === "yesterday"
                        ? "Yesterday"
                        : preset === "last_7_days"
                          ? "Last 7 Days"
                          : preset === "last_30_days"
                            ? "Last 30 Days"
                            : preset === "this_month"
                              ? "This Month"
                              : preset === "last_month"
                                ? "Last Month"
                                : "Custom Date & Time"}
                </label>
              ))}
              {datePreset === "custom" && (
                <div className="px-4 py-3 mt-2 border-t border-[var(--color-border-subtle)] flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] font-semibold mb-1 block">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full bg-[var(--color-bg-hover)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] font-semibold mb-1 block">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full bg-[var(--color-bg-hover)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <CustomSelect
          className="w-full md:w-auto"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: "all", label: "All Priorities" },
            {
              value: "super",
              label: (
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-purple-600" /> Super Leads
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
                  Hot Leads
                </span>
              ),
            },
            {
              value: "normal",
              label: (
                <span className="flex items-center gap-1.5">
                  <User size={14} className="text-[var(--color-text-muted)]" />{" "}
                  Normal Leads
                </span>
              ),
            },
          ]}
        />

        <div
          className="relative shrink-0 w-full md:w-auto"
          ref={customerTypeMenuRef}
        >
          <button
            onClick={() => setShowCustomerTypeMenu(!showCustomerTypeMenu)}
            className={`w-full md:w-auto bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between md:justify-start gap-2 transition-colors ${showCustomerTypeMenu || customerTypes.length > 0 ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-[var(--color-border-subtle)]"}`}
          >
            <Users size={16} />
            {customerTypes.length === 0
              ? "Customer Type"
              : customerTypes.length === 1
                ? customerTypes[0] === "member"
                  ? "Members"
                  : customerTypes[0] === "eventRegistrant"
                    ? "Event Registrants"
                    : "Trial Members"
                : "Multiple Types"}
          </button>
          {showCustomerTypeMenu && (
            <div className="absolute top-full mt-2 left-0 w-48 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-2 flex flex-col fade-in shadow-xl">
              <label className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={customerTypes.includes("member")}
                  onChange={(e) => {
                    if (e.target.checked)
                      setCustomerTypes([...customerTypes, "member"]);
                    else
                      setCustomerTypes(
                        customerTypes.filter((t) => t !== "member"),
                      );
                  }}
                  className="accent-[var(--color-primary)]"
                />
                Members
              </label>
              <label className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={customerTypes.includes("eventRegistrant")}
                  onChange={(e) => {
                    if (e.target.checked)
                      setCustomerTypes([...customerTypes, "eventRegistrant"]);
                    else
                      setCustomerTypes(
                        customerTypes.filter((t) => t !== "eventRegistrant"),
                      );
                  }}
                  className="accent-[var(--color-primary)]"
                />
                Event Registrants
              </label>
              <label className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={customerTypes.includes("trialMember")}
                  onChange={(e) => {
                    if (e.target.checked)
                      setCustomerTypes([...customerTypes, "trialMember"]);
                    else
                      setCustomerTypes(
                        customerTypes.filter((t) => t !== "trialMember"),
                      );
                  }}
                  className="accent-[var(--color-primary)]"
                />
                Trial Members
              </label>
            </div>
          )}
        </div>

        <CustomSelect
          className="w-full md:w-auto"
          value={membershipChangeFilter}
          onChange={(e) => setMembershipChangeFilter(e.target.value)}
          options={[
            { value: "all", label: "All Customers" },
            { value: "new", label: "New Members" },
            { value: "renewal", label: "Renewals" },
            // { value: "upgrade", label: "Upgrades" },
            // { value: "downgrade", label: "Downgrades" },
            { value: "cancellation", label: "Cancellations" },
          ]}
        />

        <div
          className="relative shrink-0 w-full md:w-auto"
          ref={renewalDateMenuRef}
        >
          <button
            onClick={() => setShowRenewalDateMenu(!showRenewalDateMenu)}
            className={`w-full md:w-auto bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between md:justify-start gap-2 transition-colors ${showRenewalDateMenu || renewalDatePreset !== "all" ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-[var(--color-border-subtle)]"}`}
          >
            <Calendar size={16} />
            {renewalDatePreset === "all"
              ? "Renewal Date"
              : renewalDatePreset === "today"
                ? "Renews Today"
                : renewalDatePreset === "yesterday"
                  ? "Renewed Yesterday"
                  : renewalDatePreset === "last_7_days"
                    ? "Renewed Last 7 Days"
                    : renewalDatePreset === "last_30_days"
                      ? "Renewed Last 30 Days"
                      : renewalDatePreset === "this_month"
                        ? "Renews This Month"
                        : renewalDatePreset === "next_month"
                          ? "Renews Next Month"
                          : "Custom Renewal Date"}
          </button>
          {showRenewalDateMenu && (
            <div className="absolute top-full mt-2 left-0 w-64 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-2 flex flex-col fade-in shadow-xl">
              {[
                "all",
                "today",
                "yesterday",
                "last_7_days",
                "last_30_days",
                "this_month",
                "next_month",
                "custom",
              ].map((preset) => (
                <label
                  key={preset}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-sm"
                >
                  <input
                    type="radio"
                    name="renewal_date_preset"
                    checked={renewalDatePreset === preset}
                    onChange={() => setRenewalDatePreset(preset)}
                    className="accent-[var(--color-primary)]"
                  />
                  {preset === "all"
                    ? "All Time"
                    : preset === "today"
                      ? "Today"
                      : preset === "yesterday"
                        ? "Yesterday"
                        : preset === "last_7_days"
                          ? "Last 7 Days"
                          : preset === "last_30_days"
                            ? "Last 30 Days"
                            : preset === "this_month"
                              ? "This Month"
                              : preset === "next_month"
                                ? "Next Month"
                                : "Custom Date"}
                </label>
              ))}
              {renewalDatePreset === "custom" && (
                <div className="px-4 py-3 mt-2 border-t border-[var(--color-border-subtle)] flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] font-semibold mb-1 block">
                      Start Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customRenewalStartDate}
                      onChange={(e) =>
                        setCustomRenewalStartDate(e.target.value)
                      }
                      className="w-full bg-[var(--color-bg-hover)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--color-text-muted)] font-semibold mb-1 block">
                      End Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={customRenewalEndDate}
                      onChange={(e) => setCustomRenewalEndDate(e.target.value)}
                      className="w-full bg-[var(--color-bg-hover)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {(priorityFilter !== "all" ||
          sourceFilter !== "" ||
          postFilter !== "" ||
          datePreset !== "this_month" ||
          sortBy !== "updated_desc" ||
          search !== "" ||
          agentFilter !== "" ||
          customerTypes.length > 0 ||
          membershipChangeFilter !== "all" ||
          renewalDatePreset !== "all") && (
          <button
            onClick={() => {
              setSearch("");
              setPriorityFilter("all");
              setSourceFilter("");
              setPostFilter("");
              setDatePreset("this_month");
              setCustomStartDate("");
              setCustomEndDate("");
              setSortBy("updated_desc");
              setAgentFilter("");
              setAssignedToMe(false);
              setCustomerTypes([]);
              setMembershipChangeFilter("all");
              setRenewalDatePreset("all");
              setCustomRenewalStartDate("");
              setCustomRenewalEndDate("");
            }}
            className="w-full md:w-auto text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors flex items-center justify-center md:justify-start gap-1.5 px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] rounded-xl h-[42px] col-span-2 md:col-span-1"
          >
            <XCircle size={14} /> Clear Filters
          </button>
        )}
      </div>

      {/* Content Area */}
      <div className="flex flex-col mb-6">
        {selectedLeads.length > 0 && (
          <div
            className={`border rounded-lg p-3 mb-4 text-center text-sm ${selectedLeads.length === leads.length ? "bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]/20" : "bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border-[var(--color-primary)]/30"}`}
          >
            {selectedLeads.length === leads.length ? (
              <>
                All <strong>{leads.length}</strong> customers in this view are
                selected.
                <button
                  onClick={() => setSelectedLeads([])}
                  className="font-bold hover:underline ml-2 text-[var(--color-primary)]"
                >
                  Clear selection
                </button>
              </>
            ) : visibleLeads.length > 0 &&
              visibleLeads.every((l) => selectedLeads.includes(l._id)) ? (
              <>
                All <strong>{visibleLeads.length}</strong> customers on this
                page are selected.
                <button
                  onClick={() => setSelectedLeads(leads.map((l) => l._id))}
                  className="font-bold hover:underline ml-2 text-[var(--color-primary)]"
                >
                  Select all {leads.length} customers in this view
                </button>
              </>
            ) : (
              <>
                <strong>{selectedLeads.length}</strong> customers selected.
                <button
                  onClick={() => setSelectedLeads([])}
                  className="font-bold hover:underline ml-2 text-[var(--color-text-muted)]"
                >
                  Clear selection
                </button>
              </>
            )}
          </div>
        )}
        <div className="bg-[var(--color-bg-card)] rounded-xl overflow-hidden flex flex-col">
          <Table
            columns={columns}
            data={leads}
            itemsPerPage={10}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            isLoading={loading}
            onRowClick={(lead) => navigate(`/customers/${lead._id}`)}
            onVisibleDataChange={(data) => setVisibleLeads(data)}
            keyField="_id"
            totalPages={totalPages}
            totalItems={totalItems}
          />
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Customers"
        message={`Are you sure you want to delete ${selectedLeads.length} selected customers? This action cannot be undone.`}
        confirmText={isDeleting ? "Deleting" : "Delete Customers"}
        isLoading={isDeleting}
        isDestructive={true}
      />
    </div>
  );
}
