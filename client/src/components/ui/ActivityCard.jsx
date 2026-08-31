import React from 'react';
import { Hash, Clock3, MessageSquare, MessageCircle, Bot } from 'lucide-react';

const ActivityCard = ({ data, type, hideBorder }) => {
 const isBot = data.senderId === 'BOT';
 const username = data.username
 ? data.username
 : isBot ? null : `user_${data.senderId?.slice(-6)}`;
 const initials = username ? username.slice(0, 2).toUpperCase() : 'B';
 const dateObj = data.timestamp ? new Date(data.timestamp) : (data.receivedAt ? new Date(data.receivedAt) : new Date());
 const timestamp = isNaN(dateObj.getTime()) ? new Date() : dateObj;

 const styleConfig = {
 comment: { icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-100' },
 message: { icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-100' },
 bot: { icon: Bot, color: 'text-slate-600', bg: 'bg-slate-100' }
 };
 
 const config = isBot ? styleConfig.bot : styleConfig[type];
 const Icon = config.icon;

 return (
 <div className={`flex gap-4 p-4 ${hideBorder ? '' : 'border-b border-[var(--color-border-subtle)]'} bg-[var(--color-bg-card)] transition-colors duration-300 hover:bg-[var(--color-bg-subtle)] group last:border-b-0`}>
 {/* Avatar / Icon */}
 <div className={`w-10 h-10 rounded-full shrink-0 ${config.bg} ${config.color} flex items-center justify-center overflow-hidden border border-[var(--color-border-subtle)]`}>
 {isBot ? (
 <Icon size={20} />
 ) : data.profilePicUrl ? (
 <img src={data.profilePicUrl} alt={username} className="w-full h-full object-cover" />
 ) : (
 <span className="font-bold text-sm">{initials}</span>
 )}
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="text-sm font-semibold text-[var(--color-text-main)]">
 {isBot ? 'Replyr Bot' : `@${username}`}
 </span>
 {isBot && (
 <span className="text-xs font-medium px-2 py-0.5 bg-[var(--color-bg-active)] text-[var(--color-text-main)] rounded-full uppercase tracking-wider">
 Auto reply
 </span>
 )}
 {type === 'comment' && data.commentId && (
 <span className="text-xs text-[var(--color-text-light)] ml-auto shrink-0 flex items-center gap-1 px-2 py-1 bg-[var(--color-bg-app)] rounded-md border border-[var(--color-border-subtle)]">
 <Hash size={10} />
 {data.commentId.slice(-6)}
 </span>
 )}
 </div>

 <p className="text-sm text-[var(--color-text-main)] mt-1.5 leading-relaxed break-words">
 {data.text}
 </p>

 <div className="text-xs text-[var(--color-text-muted)] mt-2 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
 <Clock3 size={12} />
 {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 <span className="mx-0.5">·</span>
 {timestamp.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
 </div>
 </div>
 </div>
 );
};

export default ActivityCard;
