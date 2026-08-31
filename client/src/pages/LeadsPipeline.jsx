import { API_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Checkbox from '../components/ui/Checkbox';
import { 
 MessageSquare, 
 MessageCircle, 
 User, 
 Flame, 
 Plus, 
 Search, 
 Filter, 
 ChevronRight, 
 ChevronLeft,
 Users,
 Copy,
 LayoutGrid,
 List,
 Trash2,
 Sparkles,
 Calendar,
 X,
 XCircle
} from 'lucide-react';
import PI from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
const PhoneInput = PI.default || PI;
import CustomSelect from '../components/ui/CustomSelect';
import ConfiguredCitySelector from '../components/ui/ConfiguredCitySelector';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';
import { getLeadStatusColor, getLeadStatusBg } from '../utils/statusColors';

const formatAge = (timestamp) => {
  if (!timestamp) return '';
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 0) return '0m';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const COLUMNS = [
 { id: 'New', label: 'New' },
 { id: 'Not Picking', label: 'Not Picking' },
 { id: 'Sent WhatsApp', label: 'Sent WhatsApp' },
 { id: 'Call Later', label: 'Call Later' },
 { id: 'Spoken', label: 'Spoken' },
 { id: 'Pitched Membership', label: 'Pitched Membership' },
 { id: 'Following Up', label: 'Following Up' },
 { id: 'Payment Pending', label: 'Payment Pending' },
 { id: 'Won', label: 'Won' },
 { id: 'Lost', label: 'Lost' },
 { id: 'On Hold', label: 'On Hold' },
 { id: 'Wrong Number', label: 'Wrong Number' }
];

export default function LeadsPipeline() {
 const { token, user } = useAuth();
 const draggingRef = useRef(false);
 const [leads, setLeads] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [debouncedSearch, setDebouncedSearch] = useState('');
 const [priorityFilter, setPriorityFilter] = useState('all');
 const [statusFilters, setStatusFilters] = useState(['New']);
 const [sourceFilter, setSourceFilter] = useState('');
 const [posts, setPosts] = useState([]);
 const [postsWithLeads, setPostsWithLeads] = useState([]);
 const [postFilter, setPostFilter] = useState('');
 const [sortBy, setSortBy] = useState('updated_desc');
 const [assignedToMe, setAssignedToMe] = useState(false);
 const [agentFilter, setAgentFilter] = useState('');
 const [agents, setAgents] = useState([]);
 const [showStatusMenu, setShowStatusMenu] = useState(false);
 const statusMenuRef = useRef(null);
 const [datePreset, setDatePreset] = useState('this_month');
 const [customStartDate, setCustomStartDate] = useState('');
 const [customEndDate, setCustomEndDate] = useState('');
 const [showDateMenu, setShowDateMenu] = useState(false);
 const dateMenuRef = useRef(null);
 const [selectedLeadId, setSelectedLeadId] = useState(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [viewMode, setViewMode] = useState(() => {
 return localStorage.getItem('leads_view_mode') || 'list';
 });
 const [draggedOverColumnId, setDraggedOverColumnId] = useState(null);
 const [selectedLeads, setSelectedLeads] = useState([]);
 const [visibleLeads, setVisibleLeads] = useState([]);
 
 // Pagination State
 const [currentPage, setCurrentPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [totalItems, setTotalItems] = useState(0);
 const itemsPerPage = 10;
 
 const handleSetViewMode = (mode) => {
 setViewMode(mode);
 localStorage.setItem('leads_view_mode', mode);
 };
 
 // Manual add form state
 const [newUsername, setNewUsername] = useState('');
 const [newPUserId, setNewPUserId] = useState('');
 const [newPlatform, setNewPlatform] = useState('instagram');
 const [newOtherPlatform, setNewOtherPlatform] = useState('');
 const [newName, setNewName] = useState('');
 const [newEmail, setNewEmail] = useState('');
 const [newPhone, setNewPhone] = useState('');
 const [newCity, setNewCity] = useState('');
 const [newAge, setNewAge] = useState('');
 const [newDob, setNewDob] = useState('');
 const [newGender, setNewGender] = useState('');
 const [newMaritalStatus, setNewMaritalStatus] = useState('');
 const [newStatus, setNewStatus] = useState('New');
 const [newPriority, setNewPriority] = useState('hot');
 const [newNotes, setNewNotes] = useState('');
 const [newTags, setNewTags] = useState('');
 const [addError, setAddError] = useState(null);
 const [duplicateLeadId, setDuplicateLeadId] = useState(null);

 // Confirmation state
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 const abortControllerRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

 useEffect(() => {
 const handleClickOutside = (event) => {
 if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
 setShowStatusMenu(false);
 }
 if (dateMenuRef.current && !dateMenuRef.current.contains(event.target)) {
 setShowDateMenu(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 useEffect(() => {
    if (token && ['admin', 'superadmin'].includes(user?.role)) {
      fetch(`${API_URL}/api/leads/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAgents(data); })
      .catch(err => console.error('Failed to fetch agents:', err));
    }
  }, [token, user]);

 useEffect(() => {
    const fetchPosts = async () => {
      let allFetchedPosts = [];
      let afterMedia = null;
      let afterTags = null;
      
      while (afterMedia !== 'done' || afterTags !== 'done') {
        try {
          const params = new URLSearchParams();
          if (afterMedia) params.append('afterMedia', afterMedia);
          if (afterTags) params.append('afterTags', afterTags);
          
          const res = await fetch(`${API_URL}/api/account/posts?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          
          if (data.posts && data.posts.length > 0) {
            allFetchedPosts = [...allFetchedPosts, ...data.posts];
            const uniqueMap = new Map();
            allFetchedPosts.forEach(p => uniqueMap.set(p.id, p));
            const uniquePosts = Array.from(uniqueMap.values());
            uniquePosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
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
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (pWLRes.ok) {
          const pWLData = await pWLRes.json();
          setPostsWithLeads(pWLData);
        }
      } catch (err) {
        console.error("Error fetching posts with leads:", err);
      }
    };
    if (token) fetchPosts();
  }, [token]);

 const fetchLeads = async () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  abortControllerRef.current = new AbortController();

  try {
    setLoading(true);
    const params = new URLSearchParams();
    if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter);
    if (debouncedSearch) params.append('search', debouncedSearch);
    if (sourceFilter) params.append('source', sourceFilter);
    if (postFilter) params.append('postId', postFilter);
    if (statusFilters.length > 0) params.append('status', statusFilters.join(','));
    if (['admin', 'superadmin'].includes(user?.role) && agentFilter) {
      params.append('assignedTo', agentFilter);
    } else if (assignedToMe) {
      params.append('assignedToMe', 'true');
    }
 
    if (datePreset !== 'all') {
      const now = new Date();
      let start, end;
      switch (datePreset) {
        case 'today':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case 'yesterday':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
          break;
        case 'last_7_days':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          end = now;
          break;
        case 'last_30_days':
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
          end = now;
          break;
        case 'this_month':
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = now;
          break;
        case 'last_month':
          start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
          break;
        case 'custom':
          if (customStartDate) start = new Date(customStartDate);
          if (customEndDate) end = new Date(customEndDate);
          break;
      }
      if (start) params.append('startDate', start.toISOString());
      if (end) params.append('endDate', end.toISOString());
    }
 
    params.append('sort', sortBy);
    params.append('page', currentPage);
    params.append('limit', itemsPerPage);

    const res = await fetch(`${API_URL}/api/leads?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      signal: abortControllerRef.current.signal
    });
    const data = await res.json();
    if (res.ok) {
      if (data && data.data) {
        setLeads(data.data);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || data.data.length);
      } else if (Array.isArray(data)) {
        setLeads(data);
        setTotalPages(1);
        setTotalItems(data.length);
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return;
    console.error('Error fetching leads:', err);
  } finally {
    setLoading(false);
  }
 };

  useEffect(() => {
    if (token) {
      fetchLeads();
    }
  }, [token, debouncedSearch, priorityFilter, sortBy, sourceFilter, postFilter, assignedToMe, agentFilter, datePreset, customStartDate, customEndDate, currentPage, statusFilters]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilters]);

  const handleUpdateStatus = async (leadId, newStatus) => {
    const leadToUpdate = leads.find(l => l._id === leadId);
    if (!leadToUpdate) return;
    
    if (leadToUpdate.status === 'Won' || leadToUpdate.status === 'Lost') {
      toast.error('Cannot modify a closed lead.');
      return;
    }

    const pipelineOrder = {
      'New': 1, 'Not Picking': 2, 'Sent WhatsApp': 3, 'Call Later': 4, 'Spoken': 5, 
      'Pitched Membership': 6, 'Following Up': 7, 'Payment Pending': 8, 'Won': 9, 
      'Lost': 10, 'On Hold': 11, 'Wrong Number': 12
    };
    
    const oldIndex = pipelineOrder[leadToUpdate.status] || 0;
    const newIndex = pipelineOrder[newStatus] || 0;
    
    const specialStatuses = ['On Hold', 'Wrong Number'];
    if (specialStatuses.includes(leadToUpdate.status)) {
      if (newStatus === 'New') {
        toast.error('Cannot move a special status lead back to New.');
        return;
      }
    } else if (oldIndex > 0 && newIndex > 0 && newIndex < oldIndex) {
      toast.error('Lead status progression must move forward.');
      return;
    }

 // Save original state for potential rollback
 const originalLeads = [...leads];

 // Optimistic Update: instantly update the lead's status in local state
 setLeads(prevLeads =>
 prevLeads.map(lead =>
 lead._id === leadId ? { ...lead, status: newStatus } : lead
 )
 );

 try {
 const res = await fetch(`${API_URL}/api/leads/${leadId}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ status: newStatus })
 });
 if (res.ok) {
 // Refetch to sync dynamic properties or order, but without blocking
 fetchLeads();
 } else {
 // Rollback on non-ok response
 setLeads(originalLeads);
 console.error('Failed to update lead status on server');
 }
 } catch (err) {
 console.error('Error updating status:', err);
 // Rollback on network/server error
 setLeads(originalLeads);
 }
 };

 const handleDeleteSelectedLeads = () => {
  setShowDeleteConfirm(true);
  };

 // Drag and Drop handlers
 const onDragStart = (e, leadId) => {
 draggingRef.current = true;
 e.dataTransfer.setData('text/plain', leadId);
 };

 const onDragOver = (e) => {
 e.preventDefault();
 };

 const onDrop = (e, columnId) => {
 setDraggedOverColumnId(null);
 const leadId = e.dataTransfer.getData('text/plain');
 if (leadId) {
 handleUpdateStatus(leadId, columnId);
 }
 };

  const handleCreateLead = async (e) => {
  if (e && e.preventDefault) e.preventDefault();
  setAddError(null);
  setDuplicateLeadId(null);

  if (!newName.trim()) {
    setAddError("Name is mandatory.");
    return;
  }
  if (!newPhone || newPhone.replace(/\D/g, '').length < 8) {
    setAddError("Phone number is mandatory.");
    return;
  }

 try {
 const res = await fetch(`${API_URL}/api/leads`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 username: newUsername.trim() || undefined,
 platformUserId: newPUserId.trim() || undefined,
 platform: newPlatform === 'other' ? newOtherPlatform.trim() : newPlatform,
 name: newName.trim(),
 email: newEmail.trim(),
 phone: newPhone.trim(),
 city: newCity.trim(),
 age: newAge ? Number(newAge) : undefined,
 dob: newDob ? newDob : undefined,
 gender: newGender || undefined,
 maritalStatus: newMaritalStatus || undefined,
 status: newStatus,
 priority: newPriority,
 notes: newNotes.trim(),
 source: 'manual',
 tags: newTags.split(',').map(t => t.trim()).filter(Boolean)
 })
 });
 const data = await res.json();
 if (res.ok) {
 setShowAddModal(false);
 setNewUsername('');
 setNewPUserId('');
 setNewPlatform('instagram');
 setNewOtherPlatform('');
 setNewName('');
 setNewEmail('');
 setNewPhone('');
 setNewCity('');
 setNewAge('');
 setNewDob('');
 setNewGender('');
 setNewMaritalStatus('');
 setNewStatus('New');
 setNewPriority('hot');
 setNewNotes('');
 setNewTags('');
 fetchLeads();
 } else {
 setAddError(data.error || 'Failed to create lead');
 if (res.status === 409 && data.existingLeadId) {
   setDuplicateLeadId(data.existingLeadId);
   toast.error(data.error || 'Phone number already exists on another lead.');
 }
 }
 } catch (err) {
 console.error('Error creating lead:', err);
 setAddError('Server error creating lead');
 }
 };

 const handleMove = (lead, direction) => {
 const currentIndex = COLUMNS.findIndex(col => col.id === lead.status);
 let newIndex = currentIndex + direction;
 if (newIndex >= 0 && newIndex < COLUMNS.length) {
 handleUpdateStatus(lead._id, COLUMNS[newIndex].id);
 }
 };

 const handleBulkDelete = () => {
 setShowDeleteConfirm(true);
 };

 const confirmDelete = async () => {
 setIsDeleting(true);
 try {
 const res = await fetch(`${API_URL}/api/leads/bulk-delete`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ leadIds: selectedLeads })
 });
 if (res.ok) {
 setSelectedLeads([]);
 fetchLeads();
 setShowDeleteConfirm(false);
 toast.success(`${selectedLeads.length} leads deleted`);
 } else {
 const data = await res.json();
 toast.error(data.error || 'Failed to delete leads');
 }
 } catch (err) {
 console.error('Error deleting leads:', err);
 toast.error('Server error deleting leads');
 } finally {
 setIsDeleting(false);
 }
 };

 // Internal Table component handles pagination in List View

  const handleToggleSelectAll = () => {
    const visibleLeadIds = visibleLeads.map(l => l._id);
    const allVisibleSelected = visibleLeadIds.length > 0 && visibleLeadIds.every(id => selectedLeads.includes(id));
    
    if (allVisibleSelected) {
      // Deselect visible
      setSelectedLeads(prev => prev.filter(id => !visibleLeadIds.includes(id)));
    } else {
      // Select visible
      setSelectedLeads(prev => {
        const newSelection = [...prev];
        for (const id of visibleLeadIds) {
          if (!newSelection.includes(id)) newSelection.push(id);
        }
        return newSelection;
      });
    }
  };

 const handleToggleSelectLead = (id) => {
 setSelectedLeads(prev => 
 prev.includes(id) ? prev.filter(lId => lId !== id) : [...prev, id]
 );
 };

 const tableColumns = [
 {
  label: (
  <Checkbox 
  checked={visibleLeads.length > 0 && visibleLeads.every(l => selectedLeads.includes(l._id))}
  onChange={handleToggleSelectAll}
  />
  ),
 className: 'w-10 text-center',
 render: (lead) => (
 <div onClick={(e) => e.stopPropagation()}>
 <Checkbox 
 checked={selectedLeads.includes(lead._id)}
 onChange={() => handleToggleSelectLead(lead._id)}
 />
 </div>
 )
 },
  {
  label: 'Username',
  render: (lead) => <span className="font-semibold" title={lead.username}>@{lead.username}</span>
  },
  {
  label: 'Name',
  render: (lead) => <span className="text-[var(--color-text-main)] font-medium whitespace-nowrap block">{lead.name || <span className="text-[var(--color-text-light)] italic">-</span>}</span>
  },
 {
 label: 'Status',
 render: (lead) => {
 const matchedHistory = lead.statusHistory ? [...lead.statusHistory].reverse().find(h => h.status === lead.status) : null;
 const currentStageTime = matchedHistory ? matchedHistory.timestamp : lead.createdAt;
 const stageAge = formatAge(currentStageTime);
 const column = COLUMNS.find(col => col.id === lead.status);

 return (
  <div className="flex items-center gap-1.5">
    <span 
      className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
      style={{ backgroundColor: getLeadStatusBg(lead.status), color: getLeadStatusColor(lead.status) }}
    >
      {column?.label || lead.status}
    </span>
    {stageAge && <span className="text-xs text-[var(--color-text-muted)] font-medium">({stageAge})</span>}
  </div>
 );
 }
 },
  {
  label: 'Source',
  render: (lead) => (
  <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
  {lead.source === 'dm' ? <MessageCircle size={14} className="text-blue-500" /> : lead.source === 'comment' ? <MessageSquare size={14} className="text-purple-500" /> : <User size={14} className="text-gray-500" />}
  <span className="capitalize">{lead.source}</span>
  </div>
  )
  },
 {
 label: 'Assigned To',
 render: (lead) => (
 <span className="text-[var(--color-text-muted)] font-medium">
 {lead.assignedTo?.name || <span className="text-[var(--color-text-light)] font-normal italic">Unassigned</span>}
 </span>
 )
 },
  {
  label: 'Priority',
  render: (lead) => (
  <div className="flex items-center gap-1.5">
    {lead.priority === 'super' && <Badge variant="primary" className="bg-purple-100 text-purple-700 border-purple-200"><Sparkles size={12} className="inline mr-1 -mt-0.5" /> Super</Badge>}
    {lead.priority === 'hot' && <Badge variant="error"><Flame size={12} className="inline mr-1 -mt-0.5" /> Hot</Badge>}
    {lead.priority !== 'super' && lead.priority !== 'hot' && <span className="text-[var(--color-text-light)] text-xs font-medium">Normal</span>}
  </div>
  )
  },
  {
  label: 'Total Age',
  render: (lead) => (
  <span className="font-semibold text-[var(--color-text-main)] whitespace-nowrap">
    {formatAge(lead.createdAt)}
  </span>
  )
  },
  {
  label: 'Date',
  render: (lead) => (
  <div className="flex flex-col text-xs text-[var(--color-text-muted)] whitespace-nowrap">
  <span className="font-semibold text-[var(--color-text-main)]">{new Date(lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
  <span>{new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
  )
  },
  {
  label: 'Last Updated',
  render: (lead) => (
  <div className="flex flex-col text-xs text-[var(--color-text-muted)] whitespace-nowrap">
  <span className="font-semibold text-[var(--color-text-main)]">{new Date(lead.updatedAt || lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
  <span>{new Date(lead.updatedAt || lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
  )
  }
 ];

  const displayLeads = leads;

  const getSelectedLeadColumnIndex = () => {
    if (!selectedLeadId) return null;
    const lead = displayLeads.find(l => l._id === selectedLeadId);
    if (!lead) return null;
    const colLeads = displayLeads.filter(l => l.status === lead.status);
    const idx = colLeads.findIndex(l => l._id === selectedLeadId);
    return { colLeads, idx };
  };

  const leadNavData = getSelectedLeadColumnIndex();
  
  const handlePrevLead = leadNavData && leadNavData.idx > 0 
    ? (hasChanged) => { 
        if (hasChanged) fetchLeads(); 
        setSelectedLeadId(leadNavData.colLeads[leadNavData.idx - 1]._id); 
      } 
    : null;

  const handleNextLead = leadNavData && leadNavData.idx < leadNavData.colLeads.length - 1 
    ? (hasChanged) => { 
        if (hasChanged) fetchLeads(); 
        setSelectedLeadId(leadNavData.colLeads[leadNavData.idx + 1]._id); 
      } 
    : null;

 return (
  <div className={`fade-in space-y-6 flex flex-col ${viewMode === 'board' ? 'h-[calc(100vh-100px)]' : ''}`}>
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div>
  <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">Leads Pipeline</h1>
  <p className="text-sm text-[var(--color-text-muted)] mt-1">Track and manage your leads through different stages.</p>
  </div>
  <div className="flex items-center gap-3">
  <div className={`flex items-center gap-2 transition-opacity duration-200 ${selectedLeads.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
  <Button 
  onClick={handleBulkDelete}
  variant="danger"
  className="text-sm font-semibold py-2 px-3 flex items-center gap-1.5"
  icon={Trash2}
  >
  Delete ({selectedLeads.length})
  </Button>
  </div>
  <Button onClick={() => setShowAddModal(true)} icon={Plus} className="self-start sm:self-auto whitespace-nowrap">
  Add Lead
  </Button>
  </div>
  </div>

 {/* Top action bar - Row 1 */}
 <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 w-full">
 <div className="relative w-full md:max-w-md">
 <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
 <input
 type="text"
 placeholder="Search by name, username, phone, email, tags..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
 />
 {search && (
   <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]" title="Clear search">
     <X size={16} />
   </button>
 )}
 </div>

 <div className="grid grid-cols-2 md:flex md:items-center gap-3 shrink-0 w-full md:w-auto">
 {/* Agent Filter (Admin) or Assigned to Me Toggle (Agent) */}
 {['admin', 'superadmin'].includes(user?.role) ? (
 <CustomSelect searchable={true}
  className="w-full md:w-auto"
  value={agentFilter}
  onChange={(e) => { setAgentFilter(e.target.value); setAssignedToMe(false); }}
  options={[
    { value: "", label: "All Agents" },
    { value: "me", label: "Assigned to Me" },
    { value: "unassigned", label: "Unassigned" },
    ...agents
      .filter(a => String(a._id) !== String(user?.id || user?._id) && a.isActive !== false)
      .map(a => ({ value: a._id, label: `${a.name} (${a.role})` }))
  ]}
 />
 ) : null}

 {/* View Mode Switcher */}
 <div className="flex items-center justify-center border border-[var(--color-border-subtle)] rounded-xl bg-[var(--color-bg-card)] p-0.5 shrink-0 w-full md:w-auto">
 <button
 onClick={() => handleSetViewMode('board')}
 className={`flex-1 flex justify-center p-2 rounded-lg transition-all cursor-pointer ${
 viewMode === 'board'
 ? 'bg-[var(--color-bg-active)] text-[var(--color-primary)]'
 : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
 }`}
 title="Board View"
 >
 <LayoutGrid size={16} />
 </button>
 <button
 onClick={() => handleSetViewMode('list')}
 className={`flex-1 flex justify-center p-2 rounded-lg transition-all cursor-pointer ${
 viewMode === 'list'
 ? 'bg-[var(--color-bg-active)] text-[var(--color-primary)]'
 : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
 }`}
 title="List View"
 >
 <List size={16} />
 </button>
 </div>
 
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
 { value: "username_desc", label: "Username (Z-A)" }
 ]}
 />

 <CustomSelect
 className="w-full md:w-auto"
 value={sourceFilter}
 onChange={(e) => setSourceFilter(e.target.value)}
 options={[
 { value: "", label: "All Sources" },
 { value: "dm", label: "Direct Messages" },
 { value: "comment", label: "Comments" },
 { value: "manual", label: "Manual" },
 { value: "other", label: "Other" }
 ]}
 />

 <CustomSelect searchable={true}
 value={postFilter}
 onChange={(e) => setPostFilter(e.target.value)}
 className="col-span-2 md:col-span-1 min-w-[250px] sm:w-[250px] md:w-[250px] w-full md:w-auto"
 options={[
 { value: "", label: "All Posts" },
 ...posts
 .filter(p => postsWithLeads.includes(p.id))
 .map(p => {
   const postDate = p.timestamp ? new Date(p.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
   const captionText = p.caption ? (p.caption.length > 30 ? p.caption.substring(0, 30) + '...' : p.caption) : 'Post ' + p.id;
   return {
     value: p.id, 
     displayLabel: captionText,
     label: postDate ? (
       <div className="flex flex-col text-left py-0.5">
         <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider leading-none mb-1">{postDate}</span>
         <span className="truncate">{captionText}</span>
       </div>
     ) : captionText
   };
 })
 ]}
 />

 <div className="relative shrink-0 w-full md:w-auto" ref={dateMenuRef}>
   <button
     onClick={() => setShowDateMenu(!showDateMenu)}
     className={`w-full md:w-auto bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between md:justify-start gap-2 transition-colors ${showDateMenu || datePreset !== 'this_month' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border-subtle)]'}`}
   >
     <Calendar size={16} />
     {datePreset === 'all' ? 'All Time' : 
      datePreset === 'today' ? 'Today' :
      datePreset === 'yesterday' ? 'Yesterday' :
      datePreset === 'last_7_days' ? 'Last 7 Days' :
      datePreset === 'last_30_days' ? 'Last 30 Days' :
      datePreset === 'this_month' ? 'This Month' :
      datePreset === 'last_month' ? 'Last Month' : 'Custom Range'
     }
   </button>
   {showDateMenu && (
     <div className="absolute top-full mt-2 left-0 w-64 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-2 flex flex-col fade-in shadow-xl">
       {['this_month', 'all', 'today', 'yesterday', 'last_7_days', 'last_30_days', 'last_month', 'custom'].map(preset => (
         <label key={preset} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-sm">
           <input
             type="radio"
             name="date_preset"
             checked={datePreset === preset}
             onChange={() => setDatePreset(preset)}
             className="accent-[var(--color-primary)]"
           />
           {preset === 'all' ? 'All Time' : 
            preset === 'today' ? 'Today' :
            preset === 'yesterday' ? 'Yesterday' :
            preset === 'last_7_days' ? 'Last 7 Days' :
            preset === 'last_30_days' ? 'Last 30 Days' :
            preset === 'this_month' ? 'This Month' :
            preset === 'last_month' ? 'Last Month' : 'Custom Date & Time'}
         </label>
       ))}
       {datePreset === 'custom' && (
         <div className="px-4 py-3 mt-2 border-t border-[var(--color-border-subtle)] flex flex-col gap-3">
           <div>
             <label className="text-xs text-[var(--color-text-muted)] font-semibold mb-1 block">Start Date & Time</label>
             <input 
               type="datetime-local" 
               value={customStartDate} 
               onChange={(e) => setCustomStartDate(e.target.value)} 
               className="w-full bg-[var(--color-bg-hover)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary)]"
             />
           </div>
           <div>
             <label className="text-xs text-[var(--color-text-muted)] font-semibold mb-1 block">End Date & Time</label>
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

 <div className="relative shrink-0 w-full md:w-auto" ref={statusMenuRef}>
 <button
 onClick={() => setShowStatusMenu(!showStatusMenu)}
 className={`w-full md:w-auto bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center justify-between md:justify-start gap-2 transition-colors ${showStatusMenu || statusFilters.length > 0 ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border-subtle)]'}`}
 >
 <Filter size={16} />
 {statusFilters.length === 0 ? 'All Statuses' : `Statuses (${statusFilters.length})`}
 </button>
 {showStatusMenu && (
 <div className="absolute top-full mt-2 left-0 w-48 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-2 flex flex-col fade-in">
 {COLUMNS.map(col => (
 <label key={col.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-sm">
 <input
 type="checkbox"
 checked={statusFilters.includes(col.id)}
 onChange={() => {
 setStatusFilters(prev => 
 prev.includes(col.id) 
 ? prev.filter(s => s !== col.id)
 : [...prev, col.id]
 );
 }}
 className="pro-checkbox"
 />
 {col.label}
 </label>
 ))}
 {statusFilters.length > 0 && (
 <button 
 onClick={() => setStatusFilters([])}
 className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] mx-4 text-left font-semibold"
 >
 Clear All
 </button>
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
            { value: "super", label: <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-purple-600" /> Super Leads</span> },
            { value: "hot", label: <span className="flex items-center gap-1.5"><Flame size={14} className="text-[var(--color-status-error)]" /> Hot Leads</span> },
            { value: "normal", label: <span className="flex items-center gap-1.5"><User size={14} className="text-[var(--color-text-muted)]" /> Normal Leads</span> }
          ]}
        />
        {(statusFilters.length > 0 || priorityFilter !== 'all' || sourceFilter !== '' || postFilter !== '' || datePreset !== 'this_month' || sortBy !== 'updated_desc' || search !== '' || agentFilter !== '') && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilters([]);
              setPriorityFilter('all');
              setSourceFilter('');
              setPostFilter('');
              setDatePreset('this_month');
              setCustomStartDate('');
              setCustomEndDate('');
              setSortBy('updated_desc');
              setAgentFilter('');
              setAssignedToMe(false);
            }}
            className="w-full md:w-auto text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors flex items-center justify-center md:justify-start gap-1.5 px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] rounded-xl h-[42px] col-span-2 md:col-span-1"
          >
            <XCircle size={14} /> Clear Filters
          </button>
        )}
 </div>

 {/* Content Area */}
 {viewMode === 'list' ? (
  <div className="flex flex-col mb-6">
    {selectedLeads.length > 0 && (
      <div className={`border rounded-lg p-3 mb-4 text-center text-sm ${selectedLeads.length === displayLeads.length ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]/20' : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border-[var(--color-primary)]/30'}`}>
        {selectedLeads.length === displayLeads.length ? (
          <>
            All <strong>{displayLeads.length}</strong> leads in this view are selected.
            <button onClick={() => setSelectedLeads([])} className="font-bold hover:underline ml-2 text-[var(--color-primary)]">Clear selection</button>
          </>
        ) : visibleLeads.length > 0 && visibleLeads.every(l => selectedLeads.includes(l._id)) ? (
          <>
            All <strong>{visibleLeads.length}</strong> leads on this page are selected. 
            <button onClick={() => setSelectedLeads(displayLeads.map(l => l._id))} className="font-bold hover:underline ml-2 text-[var(--color-primary)]">
              Select all {displayLeads.length} leads in this view
            </button>
          </>
        ) : (
          <>
            <strong>{selectedLeads.length}</strong> leads selected.
            <button onClick={() => setSelectedLeads([])} className="font-bold hover:underline ml-2 text-[var(--color-text-muted)]">Clear selection</button>
          </>
        )}
      </div>
    )}
  <div className="bg-[var(--color-bg-card)] rounded-xl overflow-hidden flex flex-col">
  <Table 
  columns={tableColumns} 
  data={displayLeads} 
  itemsPerPage={10} 
  currentPage={currentPage}
  onPageChange={setCurrentPage}
  isLoading={loading}
  onRowClick={(lead) => setSelectedLeadId(lead._id)}
  onVisibleDataChange={(data) => setVisibleLeads(data)}
  totalPages={totalPages}
  totalItems={totalItems}
  />
  </div>
  </div>
  ) : (
 <div className="flex-1 flex gap-4 overflow-x-auto pb-4 scroll-smooth min-h-0">
 {COLUMNS.map(column => {
 const columnLeads = displayLeads.filter(l => l.status === column.id);
 const isHovered = draggedOverColumnId === column.id;
 return (
 <div 
 key={column.id}
 onDragOver={onDragOver}
 onDrop={(e) => onDrop(e, column.id)}
 onDragEnter={(e) => { e.preventDefault(); setDraggedOverColumnId(column.id); }}
 onDragLeave={() => setDraggedOverColumnId(null)}
 className={`w-[290px] rounded-2xl flex flex-col shrink-0 overflow-hidden transition-all duration-300 border shadow-sm ${
 isHovered
 ? `border-[var(--color-primary)]/40 bg-[var(--color-bg-active)] shadow-md ring-4 ring-[var(--color-primary)]/10`
 : 'bg-[var(--color-bg-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)]'
 }`}
 >
 {/* Header */}
 <div 
   className="p-4 flex items-center justify-between shrink-0 bg-[var(--color-bg-card)] border-b border-[var(--color-border-subtle)]/60"
   style={{ borderTop: `4px solid ${getLeadStatusColor(column.id)}` }}
 >
 <span className="font-bold text-xs text-[var(--color-text-main)] uppercase tracking-wider">{column.label}</span>
 <span 
   className="text-xs font-bold px-2.5 py-0.5 rounded-lg border shadow-sm"
   style={{ backgroundColor: getLeadStatusBg(column.id), color: getLeadStatusColor(column.id), borderColor: getLeadStatusBg(column.id) }}
 >
 {columnLeads.length}
 </span>
 </div>

 {/* Cards List */}
 <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
 {columnLeads.length === 0 ? (
 <div className="text-center py-10 text-xs text-[var(--color-text-muted)] font-medium">
 Drag leads here
 </div>
 ) : (
 columnLeads.map(lead => (
 <div
 key={lead._id}
 draggable
 onDragStart={(e) => onDragStart(e, lead._id)}
 onDragEnd={() => {
 // Add small delay to prevent click fire right after drag end
 setTimeout(() => { draggingRef.current = false; }, 100);
 setDraggedOverColumnId(null);
 }}
 onClick={() => {
 if (!draggingRef.current) {
 setSelectedLeadId(lead._id);
 }
 }}
 className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/40 rounded-xl cursor-pointer transition-all duration-300 select-none flex flex-col gap-3 active:scale-[0.98] group relative shadow-sm hover:shadow-md"
 >
 {/* Title & Checkbox */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 max-w-[80%]">
 <Checkbox 
 checked={selectedLeads.includes(lead._id)}
 onChange={() => handleToggleSelectLead(lead._id)}
 onClick={(e) => e.stopPropagation()}
 />
 <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getLeadStatusColor(lead.status) }} />
 <span className="font-semibold text-base text-[var(--color-text-main)] truncate">
 @{lead.username}
 </span>
 </div>
 <div className="flex items-center gap-1.5 flex-wrap justify-end">
 {lead.priority === 'super' ? (
 <Sparkles size={15} className="text-purple-600 fill-purple-600 shrink-0" />
 ) : lead.priority === 'hot' ? (
 <Flame size={15} className="text-[var(--color-status-error)] fill-[var(--color-status-error)] shrink-0" />
 ) : null}
 </div>
 </div>

 {/* Time info */}
 <div className="text-xs text-[var(--color-text-muted)] font-medium">
 {(() => {
   const matchedHistory = lead.statusHistory ? [...lead.statusHistory].reverse().find(h => h.status === lead.status) : null;
   const currentStageTime = matchedHistory ? matchedHistory.timestamp : lead.createdAt;
   return formatAge(currentStageTime);
 })()}
 </div>

 {/* Agent / Tags */}
 {lead.assignedTo && (
 <div className="text-xs text-[var(--color-text-muted)] font-medium">
 Agent: <span className="text-[var(--color-text-main)]">{lead.assignedTo.name}</span>
 </div>
 )}

 {lead.tags && lead.tags.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mt-1">
 {lead.tags.slice(0, 3).map((t, idx) => (
 <span key={idx} className="text-[11px] bg-[var(--color-bg-active)] text-[var(--color-text-main)] px-2 py-0.5 rounded-md font-semibold border border-[var(--color-border-subtle)]">
 {t}
 </span>
 ))}
 {lead.tags.length > 3 && (
 <span className="text-[11px] bg-[var(--color-bg-active)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-md font-bold border border-[var(--color-border-subtle)]">
 +{lead.tags.length - 3}
 </span>
 )}
 </div>
 )}

 {/* Bottom Info Row */}
 <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]/50 shrink-0">
 <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
 {lead.source === 'dm' ? (
 <MessageCircle size={13} className="text-blue-500" />
 ) : lead.source === 'comment' ? (
 <MessageSquare size={13} className="text-purple-500" />
 ) : (
 <User size={13} className="text-gray-500" />
 )}
 <div className="flex flex-col">
   <span className="text-xs font-medium capitalize leading-tight">{lead.source}</span>
   <span className="text-[9px] uppercase font-bold text-[var(--color-text-light)] leading-tight tracking-wider">{lead.platform || 'Other'}</span>
 </div>
 </div>
 
 {/* Quick navigation arrows for mobile/tablets */}
 <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-200">
 <button
 onClick={(e) => { e.stopPropagation(); handleMove(lead, -1); }}
 disabled={column.id === 'new'}
 className="p-1 hover:bg-[var(--color-bg-active)] rounded text-[var(--color-text-muted)] disabled:opacity-30 disabled:hover:bg-transparent"
 >
 <ChevronLeft size={13} />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); handleMove(lead, 1); }}
 disabled={column.id === 'lost'}
 className="p-1 hover:bg-[var(--color-bg-active)] rounded text-[var(--color-text-muted)] disabled:opacity-30 disabled:hover:bg-transparent"
 >
 <ChevronRight size={13} />
 </button>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Lead details Modal */}
 {selectedLeadId && (
 <LeadDetailModal
 leadId={selectedLeadId}
 onClose={(changed) => { 
   setSelectedLeadId(null); 
   if (changed) fetchLeads(); 
 }}
 onNext={handleNextLead}
 onPrev={handlePrevLead}
 />
 )}

 <Modal
 isOpen={showAddModal}
 onClose={() => setShowAddModal(false)}
 title="Add Manual CRM Lead"
 footer={
 <>
 <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
 <Button variant="primary" onClick={(e) => handleCreateLead(e)}>Save Lead</Button>
 </>
 }
 >
  {addError && (
  <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-3 rounded-lg text-sm mb-4 font-medium flex justify-between items-center">
  <span>{addError}</span>
  </div>
  )}

 <form id="add-lead-form" onSubmit={handleCreateLead} className="space-y-4">
  <Input
    label="Full Name"
    placeholder="e.g. Jane Smith"
    value={newName}
    onChange={(e) => setNewName(e.target.value)}
  />

  <div className="grid grid-cols-2 gap-4">
    <Input
      label="Email Address"
      type="email"
      placeholder="e.g. jane@example.com"
      value={newEmail}
      onChange={(e) => setNewEmail(e.target.value)}
    />
    <div className="space-y-1.5 flex flex-col">
      <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
        Phone Number
      </label>
      <PhoneInput
        country={'in'}
        enableSearch={true}
        value={newPhone}
        onChange={(value) => setNewPhone(value ? (value.startsWith('+') ? value : '+' + value) : '')}
        inputClass="!w-full !bg-[var(--color-bg-subtle)] !border !border-[var(--color-border-subtle)] !text-[var(--color-text-main)] !px-12 !py-2.5 !rounded-lg !text-sm focus:!outline-none focus:!border-[var(--color-primary)] !transition-colors !h-auto"
        buttonClass="!bg-transparent !border-0 !border-r !border-[var(--color-border-subtle)] !rounded-l-lg !pl-2 hover:!bg-[var(--color-bg-subtle)]"
        containerClass="!w-full !flex-1"
        dropdownClass="!bg-[var(--color-bg-card)] !text-[var(--color-text-main)] !border-[var(--color-border-subtle)]"
        searchClass="!bg-[var(--color-bg-subtle)] !text-[var(--color-text-main)] !border-[var(--color-border-subtle)]"
      />
    </div>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Platform</label>
      <CustomSelect
        value={newPlatform}
        onChange={(e) => setNewPlatform(e.target.value)}
        options={[
          { value: "instagram", label: "Instagram" },
          { value: "facebook", label: "Facebook" },
          { value: "youtube", label: "YouTube" },
          { value: "linkedin", label: "LinkedIn" },
          { value: "other", label: "Other" }
        ]}
      />
    </div>
    <Input
      label="Platform-Specific Username"
      placeholder="e.g. janesmith (without @)"
      value={newUsername}
      onChange={(e) => setNewUsername(e.target.value)}
    />
  </div>

  {newPlatform === 'other' && (
    <Input
      label="Specify Platform"
      placeholder="e.g. TikTok"
      value={newOtherPlatform}
      onChange={(e) => setNewOtherPlatform(e.target.value)}
    />
  )}

  <div className="grid grid-cols-2 gap-4">
    <Input
      label="Platform ID (Optional)"
      placeholder="e.g. 178414058..."
      value={newPUserId}
      onChange={(e) => setNewPUserId(e.target.value)}
    />
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">City</label>
      <ConfiguredCitySelector
        value={newCity}
        onChange={(e) => setNewCity(e.target.value)}
        className="w-full"
      />
    </div>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <Input
      label="Age"
      type="number"
      placeholder="e.g. 28"
      value={newAge}
      onChange={(e) => setNewAge(e.target.value)}
    />
    <Input
      label="DOB (Optional)"
      type="date"
      value={newDob}
      onChange={(e) => {
        const val = e.target.value;
        setNewDob(val);
        if (val && !newAge) {
          const birthYear = new Date(val).getFullYear();
          const currentYear = new Date().getFullYear();
          if (birthYear && currentYear >= birthYear) {
            setNewAge(currentYear - birthYear);
          }
        }
      }}
    />
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Gender</label>
      <CustomSelect
        value={newGender}
        onChange={(e) => setNewGender(e.target.value)}
        options={[
          { value: "", label: "Select Gender" },
          { value: "Male", label: "Male" },
          { value: "Female", label: "Female" },
          { value: "Other", label: "Other" }
        ]}
      />
    </div>
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Marital Status</label>
      <CustomSelect
        value={newMaritalStatus}
        onChange={(e) => setNewMaritalStatus(e.target.value)}
        options={[
          { value: "", label: "Select Status" },
          { value: "Single", label: "Single" },
          { value: "Divorced", label: "Divorced" },
          { value: "Annulled", label: "Annulled" },
          { value: "Widowed", label: "Widowed" }
        ]}
      />
    </div>
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Status</label>
      <CustomSelect
        value={newStatus}
        onChange={(e) => setNewStatus(e.target.value)}
        options={[
          { value: "New", label: "New" },
          { value: "Not Picking", label: "Not Picking" },
          { value: "Sent WhatsApp", label: "Sent WhatsApp" },
          { value: "Call Later", label: "Call Later" },
          { value: "Spoken", label: "Spoken" },
          { value: "Pitched Membership", label: "Pitched Membership" },
          { value: "Following Up", label: "Following Up" },
          { value: "Payment Pending", label: "Payment Pending" },
          { value: "Won", label: "Won" },
          { value: "Lost", label: "Lost" },
          { value: "On Hold", label: "On Hold" },
          { value: "Wrong Number", label: "Wrong Number" }
        ]}
      />
    </div>
    <div className="flex items-center justify-between mt-6 px-2">
      <span className="text-sm font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5">
        <Sparkles size={16} className={newPriority === 'super' ? 'text-purple-600 fill-purple-600' : ''} />
        Super Lead
      </span>
      <label className="pro-toggle">
        <input type="checkbox" className="pro-checkbox" checked={newPriority === 'super'} onChange={(e) => setNewPriority(e.target.checked ? 'super' : 'hot')} />
        <span className="pro-toggle-track"></span>
      </label>
    </div>
  </div>

 <Input
 label="Tags (Comma-separated)"
 placeholder="e.g. collab, hot, retail"
 value={newTags}
 onChange={(e) => setNewTags(e.target.value)}
 />

 <Input
 type="textarea"
 label="Lead Notes"
 placeholder="Add details about this prospect..."
 value={newNotes}
 onChange={(e) => setNewNotes(e.target.value)}
 rows={3}
 />
 </form>
 </Modal>

 <ConfirmationDialog 
 isOpen={showDeleteConfirm}
 onClose={() => setShowDeleteConfirm(false)}
 onConfirm={confirmDelete}
 title="Delete Leads"
 message={`Are you sure you want to permanently delete ${selectedLeads.length} selected leads and their history? This action cannot be undone.`}
 confirmText="Delete Leads"
 isLoading={isDeleting}
 />
 </div>
 );
}
