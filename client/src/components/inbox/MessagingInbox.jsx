import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, Reply, FileText, X } from 'lucide-react';
import Spinner from '../ui/Spinner';
import SearchFilterBar from '../ui/SearchFilterBar';
import EmptyState from '../ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function MessagingInbox({ messages }) {
 const { token } = useAuth();
 const [replyText, setReplyText] = useState('');
 const [selectedUser, setSelectedUser] = useState(null);
 const [sending, setSending] = useState(false);
 const [searchQuery, setSearchQuery] = useState('');
 const [filterType, setFilterType] = useState('all');
 const [templates, setTemplates] = useState([]);
 const [showTemplatesPopover, setShowTemplatesPopover] = useState(false);
 const messagesEndRef = React.useRef(null);

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };
 const conversations = messages.reduce((acc, msg) => {
 const userId = msg.type === 'incoming' ? msg.senderId : msg.recipientId;
 if (!userId || userId === 'BOT') return acc;
 if (!acc[userId]) acc[userId] = [];
 acc[userId].push(msg);
 return acc;
 }, {});

 // Apply filters and search to the conversations list
 const filteredUserIds = Object.keys(conversations).filter(userId => {
 const userMsgs = conversations[userId];
 const hasIncoming = userMsgs.some(m => m.type === 'incoming');
 const hasOutgoing = userMsgs.some(m => m.type === 'outgoing' || m.type === 'outgoing_private_reply');

 // Filter
 if (filterType === 'incoming' && !hasIncoming) return false;
 if (filterType === 'outgoing' && !hasOutgoing) return false;

 // Search
 if (searchQuery) {
 const q = searchQuery.toLowerCase();
 const userMatch = userId.toLowerCase().includes(q);
 const textMatch = userMsgs.some(m => m.text?.toLowerCase().includes(q));
 if (!userMatch && !textMatch) return false;
 }

 return true;
 });

 const handleSend = async () => {
 if (!replyText.trim() || !selectedUser) return;
 setSending(true);
 try {
 const res = await fetch(`${API_URL}/api/messages/send`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ recipientId: selectedUser, text: replyText })
 });
 if (res.ok) {
 setReplyText('');
 } else {
 const data = await res.json();
 toast.error(`Failed to send message: ${data.error || 'Unknown error'}`);
 }
 } catch (err) {
 console.error(err);
 toast.error('Server error sending message');
 } finally {
 setSending(false);
 }
 };

 const currentChat = selectedUser ? conversations[selectedUser] || [] : [];
 
 // Sort currentChat by timestamp ascending for display
 const sortedChat = [...currentChat].sort((a, b) => {
 const timeA = new Date(a.timestamp || a.receivedAt).getTime();
 const timeB = new Date(b.timestamp || b.receivedAt).getTime();
 return timeA - timeB;
 });

 const filterOptions = [
 { value: 'all', label: 'All Conversations' },
 { value: 'incoming', label: 'Has Incoming' },
 { value: 'outgoing', label: 'Has Outgoing' },
 ];

 // Mark seen when opening a chat
 useEffect(() => {
 if (selectedUser) {
 fetch(`${API_URL}/api/messages/seen`, {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ recipientId: selectedUser })
 }).catch(console.error);
 }
 }, [selectedUser]);

 useEffect(() => {
 scrollToBottom();
 }, [sortedChat]);

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
 .catch(err => console.error('Failed to fetch templates in inbox:', err));
 }
 }, [token]);

 return (
 <div className="fade-in space-y-4 h-[calc(100vh-100px)] flex flex-col">
 <div className="shrink-0">
 <SearchFilterBar 
 searchQuery={searchQuery}
 onSearchChange={setSearchQuery}
 filterValue={filterType}
 onFilterChange={setFilterType}
 filterOptions={filterOptions}
 />
 </div>

 <div className="flex-1 flex border border-[var(--color-border-subtle)] rounded-[4px] overflow-hidden bg-[var(--color-bg-card)]">
 {/* Sidebar - Users */}
 <div className="w-[350px] border-r border-[var(--color-border-subtle)] flex flex-col bg-[var(--color-bg-card)] shrink-0 transition-colors duration-300">
 <div className="p-4 border-b border-[var(--color-border-subtle)] font-bold text-[var(--color-text-main)] text-lg shrink-0">
 Messages
 </div>
 <div className="flex-1 overflow-y-auto">
 {filteredUserIds.length === 0 ? (
 <div className="p-6">
 <EmptyState 
 icon={MessageCircle} 
 message="No conversations found" 
 sub="Try adjusting your search or filters" 
 />
 </div>
 ) : (
 filteredUserIds.map(userId => {
 const userMsgs = conversations[userId];
 // Get the most recent message for the preview
 const sortedMsgs = [...userMsgs].sort((a, b) => new Date(a.timestamp || a.receivedAt).getTime() - new Date(b.timestamp || b.receivedAt).getTime());
 const lastMsg = sortedMsgs[sortedMsgs.length - 1];
 const incomingMsg = userMsgs.find(m => m.type === 'incoming' && m.username);
 const profilePicUrl = incomingMsg?.profilePicUrl || userMsgs.find(m => m.profilePicUrl)?.profilePicUrl;
 const displayUsername = incomingMsg?.username || userId;
 
 return (
 <div 
 key={userId}
 onClick={() => setSelectedUser(userId)}
 className={`p-3 cursor-pointer transition-colors flex items-center gap-3 ${selectedUser === userId ? 'bg-[var(--color-bg-active)]' : 'hover:bg-[var(--color-bg-subtle)]'}`}
 >
 <div className="w-14 h-14 rounded-full bg-[var(--color-border-subtle)] flex items-center justify-center shrink-0 overflow-hidden text-[var(--color-text-muted)] font-bold text-sm">
 {profilePicUrl ? <img src={profilePicUrl} alt={displayUsername} className="w-full h-full object-cover" /> : displayUsername.slice(0,2).toUpperCase()}
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-normal text-base text-[var(--color-text-main)] truncate">{displayUsername}</div>
 <div className="text-sm text-[var(--color-text-muted)] mt-0.5 truncate font-normal">
 {lastMsg.mediaType ? `Sent an attachment` : lastMsg.text}
 </div>
 </div>
 </div>
 )
 })
 )}
 </div>
 </div>

 {/* Chat Area */}
 <div className="flex-1 flex flex-col bg-[var(--color-bg-card)] relative transition-colors duration-300">
 {selectedUser ? (
 <>
 {(() => {
 const incomingMsg = conversations[selectedUser]?.find(m => m.type === 'incoming' && m.username);
 const displayUsername = incomingMsg?.username || selectedUser;
 const headerPicUrl = incomingMsg?.profilePicUrl || conversations[selectedUser]?.find(m => m.profilePicUrl)?.profilePicUrl;
 return (
 <div className="px-6 py-4 bg-[var(--color-bg-card)] border-b border-[var(--color-border-subtle)] font-semibold text-base text-[var(--color-text-main)] flex items-center gap-3 shrink-0 transition-colors duration-300">
 <div className="w-11 h-11 rounded-full bg-[var(--color-border-subtle)] flex items-center justify-center shrink-0 overflow-hidden text-[var(--color-text-muted)] font-bold text-xs">
 {headerPicUrl 
 ? <img src={headerPicUrl} alt={displayUsername} className="w-full h-full object-cover" /> 
 : displayUsername.slice(0,2).toUpperCase()}
 </div>
 {displayUsername}
 </div>
 );
 })()}
 
 <div className="flex-1 overflow-y-auto p-6 space-y-1">
 {sortedChat.map((msg, i) => {
 const isBot = msg.type === 'outgoing' || msg.type === 'outgoing_private_reply' || msg.senderId === 'BOT';
 
 // Grouping Logic
 const prevMsg = sortedChat[i - 1];
 const nextMsg = sortedChat[i + 1];
 const isPrevSame = prevMsg && (prevMsg.senderId === msg.senderId || (isBot && (prevMsg.type === 'outgoing' || prevMsg.senderId === 'BOT')));
 const isNextSame = nextMsg && (nextMsg.senderId === msg.senderId || (isBot && (nextMsg.type === 'outgoing' || nextMsg.senderId === 'BOT')));
 
 // Margin top if previous isn't the same sender
 const mtClass = isPrevSame ? "mt-[2px]" : "mt-4";
 
 // Border radius logic (18px for independent bubbles, 4px for connected sides)
 let roundedClass = isBot ? "rounded-l-[18px]" : "rounded-r-[18px]";
 
 if (isBot) {
 if (!isPrevSame && !isNextSame) roundedClass += " rounded-r-[18px]";
 else if (!isPrevSame && isNextSame) roundedClass += " rounded-tr-[18px] rounded-br-[4px]";
 else if (isPrevSame && isNextSame) roundedClass += " rounded-tr-[4px] rounded-br-[4px]";
 else if (isPrevSame && !isNextSame) roundedClass += " rounded-tr-[4px] rounded-br-[18px]";
 } else {
 if (!isPrevSame && !isNextSame) roundedClass += " rounded-l-[18px]";
 else if (!isPrevSame && isNextSame) roundedClass += " rounded-tl-[18px] rounded-bl-[4px]";
 else if (isPrevSame && isNextSame) roundedClass += " rounded-tl-[4px] rounded-bl-[4px]";
 else if (isPrevSame && !isNextSame) roundedClass += " rounded-tl-[4px] rounded-bl-[18px]";
 }

 const showAvatar = !isBot && !isNextSame && msg.profilePicUrl;
 const showPlaceholderAvatar = !isBot && !isNextSame && !msg.profilePicUrl;

 const msgDate = new Date(msg.timestamp || msg.receivedAt);
 const displayTime = isNaN(msgDate.getTime()) ? '' : msgDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
 
 const isLastMessage = i === sortedChat.length - 1;
 const showStatus = isBot && isLastMessage;

 const repliedMsg = msg.replyToId ? sortedChat.find(m => m.messageId === msg.replyToId) : null;
 const repliedText = repliedMsg ? (repliedMsg.mediaType ? `[${repliedMsg.mediaType}]` : repliedMsg.text) : (msg.replyToId ? 'Replying to a message...' : null);

 let mainRoundedClass = roundedClass;
 if (repliedText) {
 if (isBot) {
 mainRoundedClass = mainRoundedClass.replace('rounded-tr-[18px]', 'rounded-tr-[4px]').replace('rounded-tl-[18px]', 'rounded-tl-[4px]');
 if (!mainRoundedClass.includes('rounded-tr-') && !mainRoundedClass.includes('rounded-l-')) mainRoundedClass += " rounded-tl-[4px] rounded-tr-[4px]";
 } else {
 mainRoundedClass = mainRoundedClass.replace('rounded-tl-[18px]', 'rounded-tl-[4px]').replace('rounded-tr-[18px]', 'rounded-tr-[4px]');
 if (!mainRoundedClass.includes('rounded-tl-') && !mainRoundedClass.includes('rounded-r-')) mainRoundedClass += " rounded-tr-[4px] rounded-tl-[4px]";
 }
 }

 return (
 <div key={i} className={`flex gap-2 ${isBot ? 'flex-row-reverse' : 'flex-row'} items-end ${mtClass}`}>
 {!isBot && (
 <div className={`w-7 h-7 rounded-full shrink-0 overflow-hidden text-xs font-bold flex items-center justify-center ${showAvatar || showPlaceholderAvatar ? 'bg-[var(--color-border-subtle)] text-[var(--color-text-muted)]' : 'opacity-0'}`}>
 {showAvatar ? <img src={msg.profilePicUrl} alt="User" className="w-full h-full object-cover" /> : (showPlaceholderAvatar ? msg.senderId.slice(0,2).toUpperCase() : '')}
 </div>
 )}
 
 <div className={`flex flex-col ${isBot ? 'items-end' : 'items-start'} max-w-[65%]`}>
 {repliedText && (
 <div className="text-xs text-[var(--color-text-muted)] font-normal mb-1 flex items-center gap-1 mt-2">
 <Reply size={12} className={isBot ? '' : 'scale-x-[-1]'} /> 
 {isBot ? 'You replied' : `${msg.username || msg.senderId} replied`}
 </div>
 )}

 {repliedText && (
 <div className={`px-4 py-2 mb-[2px] text-sm opacity-75 ${
 isBot ? 'bg-[var(--color-msg-outgoing)] text-[var(--color-msg-outgoing-text)]' : 'bg-[var(--color-msg-incoming)] text-[var(--color-msg-incoming-text)]'
 } rounded-t-[18px] ${isBot ? 'rounded-bl-[18px] rounded-br-[4px]' : 'rounded-br-[18px] rounded-bl-[4px]'} line-clamp-2 transition-colors duration-300`}>
 {repliedText}
 </div>
 )}

 {msg.mediaUrl && (
 <div className={`overflow-hidden mb-1 ${mainRoundedClass}`}>
 {msg.mediaType === 'video' ? (
 <video src={msg.mediaUrl} controls className="max-w-full max-h-[300px] object-cover" />
 ) : (
 <img src={msg.mediaUrl} alt="attachment" className="max-w-full max-h-[300px] object-cover" />
 )}
 </div>
 )}
 
 {msg.text && (
 <div className={`px-4 py-3 text-base leading-tight ${mainRoundedClass} ${
 isBot ? 'bg-[var(--color-msg-outgoing)] text-[var(--color-msg-outgoing-text)]' : 'bg-[var(--color-msg-incoming)] text-[var(--color-msg-incoming-text)]'
 } transition-colors duration-300`} title={msgDate.toLocaleString()}>
 {msg.text}
 </div>
 )}

 {showStatus && (
 <span className="text-xs font-normal text-[var(--color-text-muted)] mt-1.5 px-1">
 Sent
 </span>
 )}
 </div>
 </div>
 );
 })}
 <div ref={messagesEndRef} />
 </div>

 <div className="p-4 bg-[var(--color-bg-card)] mt-auto shrink-0 transition-colors duration-300">
 <div className="flex gap-3 border border-[var(--color-border-subtle)] rounded-full px-4 py-2 bg-[var(--color-bg-card)] items-center transition-colors duration-300">
 <input 
 type="text"
 value={replyText}
 onChange={e => setReplyText(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleSend()}
 placeholder="Message..."
 className="flex-1 bg-transparent border-none text-base focus:outline-none transition-all text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]"
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
 <div className="absolute bottom-10 right-0 w-64 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 flex flex-col max-h-48 overflow-y-auto fade-in">
 <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider bg-[var(--color-bg-subtle)] flex items-center justify-between shrink-0">
 <span>Reply Templates</span>
 <button onClick={() => setShowTemplatesPopover(false)} className="text-[var(--color-text-light)] hover:text-black">
 <X size={12} />
 </button>
 </div>
 {templates.length === 0 ? (
 <div className="p-3 text-xs text-[var(--color-text-light)] italic text-center">
 No templates saved.
 </div>
 ) : (
 templates.map(t => (
 <button
 key={t._id}
 type="button"
 onClick={() => {
 setReplyText(prev => prev + t.body);
 setShowTemplatesPopover(false);
 }}
 className="w-full text-left px-3 py-2.5 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-active)] border-b border-[var(--color-border-subtle)]/50 last:border-0 truncate font-semibold cursor-pointer"
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
 onClick={handleSend}
 disabled={sending || !replyText.trim()}
 className="text-[var(--color-primary)] font-semibold text-base hover:text-[var(--color-text-main)] transition-colors disabled:opacity-50 disabled:hover:text-[var(--color-primary)]"
 >
 {sending ? <Spinner size={18} /> : "Send"}
 </button>
 </div>
 </div>
 </>
 ) : (
 <div className="flex-1 flex flex-col items-center justify-center text-[var(--color-text-main)] bg-[var(--color-bg-card)] transition-colors duration-300">
 <div className="w-24 h-24 rounded-full border-2 border-[var(--color-text-main)] flex items-center justify-center mb-4 transition-colors duration-300">
 <MessageCircle size={48} strokeWidth={1} />
 </div>
 <p className="font-semibold text-lg">Your Messages</p>
 <p className="text-base text-[var(--color-text-muted)] mt-2">Send private photos and messages to a friend or group.</p>
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
