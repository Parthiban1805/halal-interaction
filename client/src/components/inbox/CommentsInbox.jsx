import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { MessageSquare, ExternalLink, Image as ImageIcon, X, Smile, FileText } from 'lucide-react';
import Spinner from '../ui/Spinner';
import SearchFilterBar from '../ui/SearchFilterBar';
import EmptyState from '../ui/EmptyState';
import ActivityCard from '../ui/ActivityCard';
import { useAuth } from '../../context/AuthContext';

function GridPostItem({ mediaId, commentsCount, post, onClick }) {
 const [media, setMedia] = useState(post || null);

 useEffect(() => {
 if (post) {
 setMedia(post);
 return;
 }
 const fetchMedia = async () => {
 try {
 const res = await fetch(`${API_URL}/api/media/${mediaId}`);
 if (res.ok) {
 const data = await res.json();
 setMedia(data);
 }
 } catch (err) {
 console.error('Failed to fetch media for', mediaId, err);
 }
 };
 if (mediaId && mediaId !== 'unknown') {
 fetchMedia();
 }
 }, [mediaId, post]);

 return (
 <div onClick={onClick} className="relative aspect-square cursor-pointer group bg-[var(--color-border-subtle)] overflow-hidden">
 {media ? (
 <img 
 src={media.media_type === 'VIDEO' ? media.thumbnail_url || media.media_url : media.media_url} 
 alt="Post" 
 className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-[var(--color-bg-subtle)]">
 <ImageIcon className="text-[var(--color-text-muted)] opacity-50" size={32} />
 </div>
 )}
 
 {/* Hover Overlay */}
 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6 text-white font-bold text-lg">
 <div className="flex items-center gap-2">
 <MessageSquare size={20} className="fill-white" />
 <span>{commentsCount}</span>
 </div>
 </div>
 </div>
 );
}

function InstagramPostModal({ mediaId, onClose, onCommentsFetched, searchQuery }) {
 const { token } = useAuth();
 const [media, setMedia] = useState(null);
 const [loadingMedia, setLoadingMedia] = useState(true);
 const [comments, setComments] = useState([]);
 const [loadingComments, setLoadingComments] = useState(true);
 const [accountInfo, setAccountInfo] = useState(null);
 const [commentText, setCommentText] = useState('');
 const [templates, setTemplates] = useState([]);
 const [showTemplatesPopover, setShowTemplatesPopover] = useState(false);

 const handleContentClick = (e) => e.stopPropagation();

 useEffect(() => {
 fetch(`${API_URL}/api/connection-status`)
 .then(res => res.json())
 .then(data => setAccountInfo(data))
 .catch(err => console.error('Failed to fetch account info', err));
 }, []);

 useEffect(() => {
 if (token) {
 fetch(`${API_URL}/api/rules-templates/templates`, {
 headers: { 'Authorization': `Bearer ${token}` }
 })
 .then(res => res.json())
 .then(data => {
 if (Array.isArray(data)) {
 setTemplates(data);
 }
 })
 .catch(err => console.error('Failed to fetch templates in comments inbox:', err));
 }
 }, [token]);

 useEffect(() => {
 const fetchMedia = async () => {
 try {
 const res = await fetch(`${API_URL}/api/media/${mediaId}`);
 if (res.ok) {
 const data = await res.json();
 setMedia(data);
 }
 } catch (err) {
 console.error('Failed to fetch media for', mediaId, err);
 } finally {
 setLoadingMedia(false);
 }
 };
 if (mediaId && mediaId !== 'unknown') {
 fetchMedia();
 } else {
 setLoadingMedia(false);
 }
 }, [mediaId]);

 useEffect(() => {
 const fetchComments = async () => {
 try {
 const res = await fetch(`${API_URL}/api/account/posts/${mediaId}/comments`);
 if (res.ok) {
 const data = await res.json();
 setComments(data);
 if (onCommentsFetched) onCommentsFetched(data.length);
 }
 } catch (err) {
 console.error(err);
 } finally {
 setLoadingComments(false);
 }
 };
 if (mediaId && mediaId !== 'unknown') {
 fetchComments();
 } else {
 setLoadingComments(false);
 }
 }, [mediaId]);

 // Handle escape key
 useEffect(() => {
 const handleEsc = (e) => {
 if (e.key === 'Escape') onClose();
 };
 window.addEventListener('keydown', handleEsc);
 return () => window.removeEventListener('keydown', handleEsc);
 }, [onClose]);

 // Sort comments oldest to newest
 const sortedComments = [...comments].sort((a, b) => {
 const timeA = new Date(a.timestamp || a.receivedAt).getTime();
 const timeB = new Date(b.timestamp || b.receivedAt).getTime();
 return timeA - timeB;
 });

 const filteredSortedComments = sortedComments.filter(comment => {
 if (!searchQuery) return true;
 const q = searchQuery.toLowerCase();
 return comment.text?.toLowerCase().includes(q) || comment.username?.toLowerCase().includes(q);
 });

 const accountName = accountInfo?.botUsername || 'Your Account';
 const profilePicUrl = accountInfo?.profilePicUrl || null;

 const handlePostComment = () => {
 if (!commentText.trim()) return;
 const newComment = {
 username: accountName,
 text: commentText,
 timestamp: new Date().toISOString()
 };
 setComments(prev => [...prev, newComment]);
 setCommentText('');
 if (onCommentsFetched) {
 onCommentsFetched(comments.length + 1);
 }
 };

 return (
 <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 md:p-10 fade-in" onClick={onClose}>
 <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 text-white hover:text-gray-300 transition-colors z-[110]">
 <X size={32} />
 </button>

 {/* Modal Container */}
 <div className="bg-black w-full max-w-[1200px] h-full max-h-[90vh] flex flex-col md:flex-row rounded overflow-hidden relative slide-up" onClick={handleContentClick}>
 
 {/* Left: Media Area */}
 <div className="flex-1 flex items-center justify-center bg-black relative min-h-[300px] md:min-h-0 border-r border-[var(--color-border-subtle)]">
 {loadingMedia ? (
 <Spinner className="text-white" />
 ) : media ? (
 media.media_type === 'VIDEO' ? (
 <video src={media.media_url} controls className="max-w-full max-h-full object-contain" />
 ) : (
 <img src={media.media_url} alt="Post" className="max-w-full max-h-full object-contain" />
 )
 ) : (
 <div className="flex flex-col items-center text-white/50">
 <ImageIcon size={48} className="mb-2" />
 <p>Media not available</p>
 </div>
 )}
 </div>

 {/* Right: Comments Sidebar */}
 <div className="w-full md:w-[350px] bg-[var(--color-bg-card)] flex flex-col h-full shrink-0 transition-colors duration-300">
 {/* Header */}
 <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-8 h-8 shrink-0">
 <div className="w-full h-full p-[2px] rounded-full">
 {profilePicUrl ? (
 <img src={profilePicUrl} alt="Profile" className="w-full h-full rounded-full border border-[var(--color-bg-card)] object-cover" />
 ) : (
 <div className="w-full h-full bg-[var(--color-bg-card)] rounded-full border border-[var(--color-bg-card)]"></div>
 )}
 </div>
 </div>
 <span className="font-semibold text-base text-[var(--color-text-main)]">{accountName}</span>
 </div>
 {media?.permalink && (
 <a href={media.permalink} target="_blank" rel="noopener noreferrer" className="text-[var(--color-text-main)] hover:text-[var(--color-text-muted)] transition-colors">
 <ExternalLink size={20} />
 </a>
 )}
 </div>

 {/* Comments Area */}
 <div className="flex-1 overflow-y-auto p-4">
 {/* Caption */}
 {media?.caption && (
 <div className="flex gap-3 mb-6">
 <div className="w-8 h-8 shrink-0 mt-1">
 <div className="w-full h-full p-[2px] rounded-full">
 {profilePicUrl ? (
 <img src={profilePicUrl} alt="Profile" className="w-full h-full rounded-full border border-[var(--color-bg-card)] object-cover" />
 ) : (
 <div className="w-full h-full bg-[var(--color-bg-subtle)] rounded-full border border-[var(--color-bg-card)]"></div>
 )}
 </div>
 </div>
 <div className="text-base leading-snug">
 <span className="font-semibold mr-2">{accountName}</span>
 <span className="text-[var(--color-text-main)] whitespace-pre-wrap">{media.caption}</span>
 </div>
 </div>
 )}

 {/* Comments List */}
 <div className="space-y-4">
 {loadingComments ? (
 <div className="flex justify-center p-4">
 <Spinner className="text-[var(--color-text-muted)]"/>
 </div>
 ) : filteredSortedComments.length === 0 ? (
 <div className="text-center text-[var(--color-text-muted)] text-base py-4">No comments match your search.</div>
 ) : (
 filteredSortedComments.map((comment, i) => (
 <div key={i}>
 <ActivityCard data={comment} type="comment" hideBorder />
 </div>
 ))
 )}
 </div>
 </div>

 {/* Footer Input */}
 <div className="p-4 border-t border-[var(--color-border-subtle)] shrink-0">
 <div className="flex items-center gap-3">
 <Smile size={24} className="text-[var(--color-text-main)]" />
 <input 
 type="text" 
 placeholder="Add a comment..." 
 value={commentText}
 onChange={e => setCommentText(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handlePostComment()}
 className="flex-1 bg-transparent border-none text-base focus:outline-none text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]" 
 />
 
 {/* Canned Templates Insertion */}
 <div className="relative flex items-center shrink-0">
 <button
 type="button"
 onClick={() => setShowTemplatesPopover(!showTemplatesPopover)}
 className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
 title="Insert Reply Template"
 >
 <FileText size={18} />
 </button>
 
 {showTemplatesPopover && (
 <div className="absolute bottom-10 right-0 w-60 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-[120] flex flex-col max-h-40 overflow-y-auto fade-in">
 <div className="px-2.5 py-1.5 border-b border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider bg-[var(--color-bg-subtle)] flex items-center justify-between shrink-0">
 <span>Templates</span>
 <button onClick={() => setShowTemplatesPopover(false)} className="text-[var(--color-text-light)] hover:text-black">
 <X size={11} />
 </button>
 </div>
 {templates.length === 0 ? (
 <div className="p-2 text-xs text-[var(--color-text-light)] italic text-center">
 No templates.
 </div>
 ) : (
 templates.map(t => (
 <button
 key={t._id}
 type="button"
 onClick={() => {
 setCommentText(prev => prev + t.body);
 setShowTemplatesPopover(false);
 }}
 className="w-full text-left px-2.5 py-2 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-active)] border-b border-[var(--color-border-subtle)]/50 last:border-0 truncate font-semibold cursor-pointer"
 title={t.body}
 >
 {t.title}
 </button>
 ))
 )}
 </div>
 )}
 </div>

 <button 
 onClick={handlePostComment}
 disabled={!commentText.trim()}
 className="text-[var(--color-primary)] font-semibold text-base hover:text-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:hover:text-[var(--color-primary)]"
 >
 Post
 </button>
 </div>
 </div>

 </div>
 </div>
 </div>
 );
}

export default function CommentsInbox({ comments }) {
 const [searchQuery, setSearchQuery] = useState('');
 const [filterType, setFilterType] = useState('all');
 const [selectedPostId, setSelectedPostId] = useState(null);
 const [posts, setPosts] = useState([]);
 const [loadingPosts, setLoadingPosts] = useState(true);
 const [trueCommentCounts, setTrueCommentCounts] = useState({});
 const [botUsername, setBotUsername] = useState('creozen_ltd');

 useEffect(() => {
 // Fetch posts
 fetch(`${API_URL}/api/account/posts`)
 .then(res => res.json())
 .then(data => {
 if (!data.error) {
 setPosts(data);
 }
 setLoadingPosts(false);
 })
 .catch(err => {
 console.error(err);
 setLoadingPosts(false);
 });

 // Fetch dynamic bot username to identify replies correctly
 fetch(`${API_URL}/api/connection-status`)
 .then(res => res.json())
 .then(data => {
 if (data.botUsername) {
 setBotUsername(data.botUsername);
 }
 })
 .catch(err => console.error('Failed to fetch account info in CommentsInbox:', err));
 }, []);

 const groupedComments = comments.reduce((acc, c) => {
 const mId = c.mediaId || 'unknown';
 if (!acc[mId]) acc[mId] = [];
 acc[mId].push(c);
 return acc;
 }, {});

 const allMediaIds = new Set();
 posts.forEach(p => allMediaIds.add(p.id));
 Object.keys(groupedComments).forEach(id => {
 if (id !== 'unknown') allMediaIds.add(id);
 });

 const displayItems = Array.from(allMediaIds).map(mediaId => {
 const post = posts.find(p => p.id === mediaId);
 const localComments = groupedComments[mediaId] || [];
 
 // If we have fetched the exact count inside the modal, use it.
 // Otherwise, guess using the API's comments_count or the local comments we have.
 let commentsCount = trueCommentCounts[mediaId];
 if (commentsCount === undefined) {
 commentsCount = Math.max(post?.comments_count || 0, localComments.length);
 }
 
 return { mediaId, post, localComments, commentsCount };
 });

 const filteredItems = displayItems.filter(item => {
 const hasIncoming = item.localComments.some(c => c.username !== botUsername);
 const hasOutgoing = item.localComments.some(c => c.username === botUsername);

 if (filterType === 'incoming' && !hasIncoming) return false;
 if (filterType === 'outgoing' && !hasOutgoing) return false;

 if (searchQuery) {
 const q = searchQuery.toLowerCase();
 const matchesCaption = item.post?.caption?.toLowerCase().includes(q);
 const matchesComments = item.localComments.some(c => 
 c.text?.toLowerCase().includes(q) || 
 c.username?.toLowerCase().includes(q)
 );
 if (!matchesCaption && !matchesComments) return false;
 }

 return true;
 });

 const filterOptions = [
 { value: 'all', label: 'All Posts' },
 { value: 'incoming', label: 'Has Follower Comments (Recent)' },
 { value: 'outgoing', label: 'Has Bot Replies (Recent)' },
 ];

 return (
 <div className="fade-in space-y-6">
 <div className="shrink-0">
 <SearchFilterBar 
 searchQuery={searchQuery}
 onSearchChange={setSearchQuery}
 filterValue={filterType}
 onFilterChange={setFilterType}
 filterOptions={filterOptions}
 />
 </div>

 {loadingPosts ? (
 <div className="py-20 flex justify-center">
 <Spinner className="text-[var(--color-primary)]" />
 </div>
 ) : filteredItems.length === 0 ? (
 <div className="py-20">
 <EmptyState 
 icon={MessageSquare} 
 message="No posts found" 
 sub="Try adjusting your search or filters" 
 />
 </div>
 ) : (
 <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-1">
 {filteredItems.map(item => (
 <GridPostItem 
 key={item.mediaId} 
 mediaId={item.mediaId} 
 commentsCount={item.commentsCount}
 post={item.post}
 onClick={() => setSelectedPostId(item.mediaId)}
 />
 ))}
 </div>
 )}

 {selectedPostId && (
 <InstagramPostModal 
 mediaId={selectedPostId} 
 onClose={() => setSelectedPostId(null)}
 onCommentsFetched={(count) => setTrueCommentCounts(prev => ({ ...prev, [selectedPostId]: count }))}
 searchQuery={searchQuery}
 />
 )}
 </div>
 );
}
