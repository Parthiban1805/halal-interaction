import { API_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import { Skeleton } from '../components/ui/Skeleton';
import { 
 Sparkles, 
 FileText, 
 Plus, 
 Trash2, 
 Copy, 
 Check, 
 AlertCircle,
 Search,
 Edit2,
 MessageSquare,
 MessageCircle,
 Activity,
 Zap,
 Info,
 GitCommit,
 ChevronDown,
 CheckCircle2,
 Flame,
 X
} from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
import Toggle from '../components/settings/Toggle';
import Button from '../components/ui/Button';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';

function InstagramPreview({ text, keywords, placement }) {
 const resolvedText = text ? text.replace(/{username}/g, '@follower_handle') : '';
 const firstKeyword = keywords && keywords.trim() ? keywords.split(',')[0].trim() : 'pricing';

 return (
 <div className="card-panel p-5 bg-[var(--color-bg-card)] border-[var(--color-border-subtle)] relative overflow-hidden flex flex-col transition-colors duration-300">
 <div className=" mb-4 flex items-center gap-2.5">
 <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-xs font-extrabold text-white">
 IG
 </div>
 <div>
 <h4 className="text-xs font-bold text-[var(--color-text-main)]">Instagram Preview</h4>
 <p className="text-xs text-[var(--color-text-muted)] font-semibold uppercase tracking-wider">
 {placement === 'comment' ? 'Public Comment Feed' : 'Direct Message (DM)'}
 </p>
 </div>
 </div>
 
 {placement === 'comment' ? (
 <div className="space-y-3 p-3.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-xs leading-normal">
 {/* Follower comment */}
 <div className="flex gap-2.5 items-start">
 <div className="w-6 h-6 rounded-full bg-[var(--color-border-focus)] shrink-0 flex items-center justify-center text-xs font-bold text-white uppercase select-none">
 FH
 </div>
 <div>
 <span className="font-semibold text-[var(--color-text-main)] mr-1.5">@follower_handle</span>
 <span className="text-[var(--color-text-main)] font-normal">
 How much is the {firstKeyword} of this? Is it available?
 </span>
 <div className="flex gap-3 text-xs text-[var(--color-text-light)] mt-1 font-semibold">
 <span>2h</span>
 <span className="cursor-pointer">Reply</span>
 </div>
 </div>
 </div>
 
 {/* Automated reply comment */}
 <div className="flex gap-2.5 items-start pl-6 border-l-2 border-[var(--color-border-subtle)]">
 <div className="w-6 h-6 rounded-full bg-[var(--color-primary)] shrink-0 flex items-center justify-center text-xs font-bold text-white uppercase select-none">
 R
 </div>
 <div className="flex-1 min-w-0">
 <span className="font-semibold text-[var(--color-text-main)] mr-1.5">@your_brand</span>
 <span className="text-[var(--color-text-main)] whitespace-pre-wrap break-words font-normal">
 {resolvedText || <span className="italic text-[var(--color-text-light)]">Type response body to preview...</span>}
 </span>
 <div className="flex gap-3 text-xs text-[var(--color-text-light)] mt-1 font-semibold">
 <span>1m</span>
 <span className="cursor-pointer">Reply</span>
 </div>
 </div>
 </div>
 </div>
 ) : (
 <div className="space-y-3.5 p-3.5 rounded-xl bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] text-xs leading-normal flex flex-col min-h-[140px] justify-end">
 {/* Follower incoming message */}
 <div className="self-start max-w-[85%] bg-[var(--color-msg-incoming)] text-[var(--color-msg-incoming-text)] px-3.5 py-2.5 rounded-2xl rounded-tl-none font-normal ">
 Hello, can you help me with details regarding {firstKeyword}?
 </div>
 
 {/* Automated reply outgoing message */}
 <div className={`self-end max-w-[85%] px-3.5 py-2.5 rounded-2xl rounded-tr-none font-normal whitespace-pre-wrap break-words ${
 resolvedText 
 ? 'bg-[var(--color-primary)] text-white' 
 : 'bg-[var(--color-bg-active)] text-[var(--color-text-light)] italic'
 }`}>
 {resolvedText || 'Type response body to preview...'}
 </div>
 </div>
 )}
 </div>
 );
}

export default function CRMTemplates() {
 const { token } = useAuth();
 const [templates, setTemplates] = useState([]);
 const [loading, setLoading] = useState(true);
 const [copiedId, setCopiedId] = useState(null);
 const [searchQuery, setSearchQuery] = useState('');
 
 // New Template form state
 const [tempTitle, setTempTitle] = useState('');
 const [tempCategory, setTempCategory] = useState('general');
 const [tempBody, setTempBody] = useState('');
 const [tempAdding, setTempAdding] = useState(false);
 const [tempError, setTempError] = useState(null);
 const [editingTemplateId, setEditingTemplateId] = useState(null);

 // Confirmation state
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [templateToDelete, setTemplateToDelete] = useState(null);
 const [isDeleting, setIsDeleting] = useState(false);

 const fetchTemplates = async () => {
 try {
 const res = await fetch(`${API_URL}/api/rules-templates/templates`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (res.ok) setTemplates(data);
 } catch (err) {
 console.error(err);
 }
 };

 useEffect(() => {
 const init = async () => {
 setLoading(true);
 await fetchTemplates();
 setLoading(false);
 };
 if (token) {
 init();
 }
 }, [token]);

 // Copy Template to Clipboard
 const handleCopy = (text, id) => {
 navigator.clipboard.writeText(text);
 setCopiedId(id);
 setTimeout(() => setCopiedId(null), 2000);
 };

 // Delete Template
 const handleDeleteTemplate = (id) => {
 setTemplateToDelete(id);
 setShowDeleteConfirm(true);
 };

 const confirmDelete = async () => {
 if (!templateToDelete) return;
 setIsDeleting(true);
 try {
 const res = await fetch(`${API_URL}/api/rules-templates/templates/${templateToDelete}`, {
 method: 'DELETE',
 headers: { 'Authorization': `Bearer ${token}` }
 });
 if (res.ok) {
 setTemplates(templates.filter(t => t._id !== templateToDelete));
 setShowDeleteConfirm(false);
 setTemplateToDelete(null);
 toast.success('Template deleted');
 } else {
 toast.error('Failed to delete template');
 }
 } catch (err) {
 console.error('Error deleting template:', err);
 toast.error('Server error deleting template');
 } finally {
 setIsDeleting(false);
 }
 };

 // Save Template (Add or Edit)
 const handleSaveTemplate = async (e) => {
 e.preventDefault();
 setTempError(null);
 if (!tempTitle || !tempBody) {
 setTempError('Title and body are required');
 return;
 }
 setTempAdding(true);

 try {
 const url = editingTemplateId 
 ? `${API_URL}/api/rules-templates/templates/${editingTemplateId}`
 : `${API_URL}/api/rules-templates/templates`;
 
 const method = editingTemplateId ? 'PUT' : 'POST';

 const res = await fetch(url, {
 method,
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 title: tempTitle.trim(),
 category: tempCategory,
 body: tempBody
 })
 });
 const data = await res.json();
 if (res.ok) {
 if (editingTemplateId) {
 setTemplates(templates.map(t => t._id === editingTemplateId ? data : t));
 toast.success('Template updated successfully');
 } else {
 setTemplates([data, ...templates]);
 toast.success('Template added successfully');
 }
 setTempTitle('');
 setTempCategory('general');
 setTempBody('');
 setEditingTemplateId(null);
 } else {
 setTempError(data.error || 'Failed to save template');
 }
 } catch (err) {
 setTempError('Server error saving template');
 } finally {
 setTempAdding(false);
 }
 };

 const handleEditClick = (template) => {
 setEditingTemplateId(template._id);
 setTempTitle(template.title);
 setTempCategory(template.category);
 setTempBody(template.body);
 window.scrollTo({ top: 0, behavior: 'smooth' });
 };

 const handleCancelEdit = () => {
 setEditingTemplateId(null);
 setTempTitle('');
 setTempCategory('general');
 setTempBody('');
 setTempError(null);
 };

 return (
 <div className="fade-in space-y-6 pb-20 px-4 sm:px-6 lg:px-8 flex flex-col">
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4  mb-6">
    <div>
      <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">Reply Templates</h1>
      <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage and preview reusable response blocks.</p>
    </div>

    <div className="relative w-full sm:max-w-xs shrink-0">
    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
    <input
    type="text"
    placeholder="Search templates..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg pl-9 pr-9 py-2 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors "
    />
    {searchQuery && (
      <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]" title="Clear search">
        <X size={16} />
      </button>
    )}
    </div>
  </div>

 {loading ? (
  <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 w-full">
    {/* Left Panel Skeleton */}
    <div className="w-full lg:w-[350px] xl:w-[400px] shrink-0 flex flex-col gap-6">
      <div className="card-panel p-5 bg-[var(--color-bg-card)]">
        <Skeleton variant="text" className="h-4 w-40 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton variant="text" className="h-3 w-24" />
              <Skeleton variant="rectangular" className="h-10 w-full rounded-xl" />
            </div>
          ))}
          <Skeleton variant="rectangular" className="h-10 w-full rounded-lg mt-2" />
        </div>
      </div>
      <div className="card-panel p-5 bg-[var(--color-bg-card)]">
        <div className="mb-4 flex items-center gap-2.5">
          <Skeleton variant="circular" className="h-7 w-7 shrink-0" />
          <div className="space-y-1">
            <Skeleton variant="text" className="h-3 w-32" />
            <Skeleton variant="text" className="h-2 w-24" />
          </div>
        </div>
        <Skeleton variant="rectangular" className="h-32 w-full rounded-xl" />
      </div>
    </div>
    
    {/* Right Panel Skeleton */}
    <div className="flex-1 bg-[var(--color-bg-card)] rounded-2xl border border-[var(--color-border-subtle)] p-5 md:p-8 flex flex-col h-[600px]">
      <div className="flex justify-between items-end mb-8 border-b border-[var(--color-border-subtle)] pb-4">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-5 w-32" />
          <Skeleton variant="text" className="h-3 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rectangular" className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  </div>
 ) : (
 <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
 
 {/* Left Panel: Form & Preview Simulator */}
 <div className="w-full lg:w-[350px] xl:w-[400px] shrink-0 flex flex-col gap-6">
 {/* Add/Edit Reply Template Form */}
 <div className="card-panel p-5 bg-[var(--color-bg-card)] transition-colors duration-300">
 <h3 className="font-bold text-sm text-[var(--color-text-main)]  mb-4 uppercase tracking-wider flex items-center gap-2">
 <FileText size={16} /> {editingTemplateId ? 'Edit Reply Template' : 'New Reply Template'}
 </h3>

 {tempError && (
 <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-3 rounded-lg text-xs mb-4 font-medium">
 {tempError}
 </div>
 )}

 <form onSubmit={handleSaveTemplate} className="space-y-4">
 <div className="space-y-1.5">
 <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Template Title</label>
 <input
 type="text"
 placeholder="e.g. Sales Intro Template"
 value={tempTitle}
 onChange={(e) => setTempTitle(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm"
 required
 />
 </div>

 <div className="space-y-1.5">
 <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Category</label>
 <input
 type="text"
 placeholder="e.g. sales, support, info"
 value={tempCategory}
 onChange={(e) => setTempCategory(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm"
 />
 </div>

 <div className="space-y-1.5">
 <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Template Body</label>
 <textarea
 placeholder="Write template content..."
 value={tempBody}
 onChange={(e) => setTempBody(e.target.value)}
 rows={5}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none"
 required
 />
 </div>

 <div className="flex gap-2 pt-2">
 <Button
 type="submit"
 disabled={tempAdding || !tempTitle || !tempBody}
 loading={tempAdding}
 icon={editingTemplateId ? Check : Plus}
 className="flex-1 py-3"
 >
 {editingTemplateId ? 'Update Template' : 'Save Template'}
 </Button>
 {editingTemplateId && (
 <Button
 type="button"
 variant="secondary"
 onClick={handleCancelEdit}
 className="py-3"
 >
 Cancel
 </Button>
 )}
 </div>
 </form>
 </div>

 <InstagramPreview 
 text={tempBody}
 keywords={''}
 placement={'dm'}
 />
 </div>

 {/* Right Panel: Lists */}
 <div className="flex-1 min-w-0">
 {/* Templates List */}
 {templates.length === 0 ? (
 <div className="card-panel py-20 flex flex-col items-center justify-center text-center bg-[var(--color-bg-card)] transition-colors duration-300">
 <AlertCircle size={40} className="text-[var(--color-text-light)] mb-3 opacity-60" />
 <p className="font-semibold text-lg text-[var(--color-text-main)]">No Templates Saved</p>
 <p className="text-sm text-[var(--color-text-muted)] mt-1.5 max-w-sm mx-auto">
 Save canned reply blocks to speed up manual conversations in direct chats.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
 {templates.filter(template => {
 if (!searchQuery) return true;
 const q = searchQuery.toLowerCase();
 return template.title.toLowerCase().includes(q) || 
 template.category.toLowerCase().includes(q) || 
 template.body.toLowerCase().includes(q);
 }).map(template => (
 <div 
 key={template._id}
 className="card-panel p-5 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] transition-all flex flex-col justify-between"
 >
 <div>
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 w-full gap-3 sm:gap-2">
 <div className="min-w-0 flex-1 w-full sm:w-auto">
 <h4 className="font-bold text-base text-[var(--color-text-main)] truncate" title={template.title}>
 {template.title}
 </h4>
 <span className="text-xs uppercase font-bold text-[var(--color-text-muted)] tracking-wider block mt-1 truncate">
 Category: {template.category}
 </span>
 </div>

 <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 self-end sm:self-auto bg-[var(--color-bg-subtle)] sm:bg-transparent p-1 sm:p-0 rounded-lg sm:rounded-none w-full sm:w-auto justify-end">
 <Button
 onClick={() => handleCopy(template.body, template._id)}
 variant="ghost"
 size="sm"
 title="Copy Template"
 icon={copiedId === template._id ? Check : Copy}
 className={copiedId === template._id ? 'text-[var(--color-status-success)]' : 'text-[var(--color-text-muted)]'}
 />
 
 <Button
 onClick={() => handleEditClick(template)}
 variant="ghost"
 size="sm"
 title="Edit Template"
 icon={Edit2}
 className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)]"
 />
 
 <Button
 onClick={() => handleDeleteTemplate(template._id)}
 variant="ghost"
 size="sm"
 title="Delete Template"
 icon={Trash2}
 className="text-[var(--color-text-light)] hover:text-[var(--color-status-error)]"
 />
 </div>
 </div>

 <p className="text-xs text-[var(--color-text-main)] leading-relaxed bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] p-3 rounded-lg font-normal line-clamp-4 select-all">
 {template.body}
 </p>
 </div>

 <div className="text-xs text-[var(--color-text-light)] font-semibold mt-3 pt-2 border-t border-[var(--color-border-subtle)]/50 shrink-0">
 Saved by: {template.salespersonId?.name || 'Unknown Agent'}
 </div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 )}

 <ConfirmationDialog 
 isOpen={showDeleteConfirm}
 onClose={() => {
 setShowDeleteConfirm(false);
 setTemplateToDelete(null);
 }}
 onConfirm={confirmDelete}
 title="Delete Template"
 message="Are you sure you want to delete this reply template? This action cannot be undone."
 confirmText="Delete Template"
 isLoading={isDeleting}
 />
 </div>
 );
}
