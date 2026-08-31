import { API_URL } from '../../config';
import { useState, useEffect } from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import Spinner from './Spinner';
import ActivityCard from './ActivityCard';

export default function PostCommentsGroup({ mediaId, comments }) {
 const [media, setMedia] = useState(null);
 const [loading, setLoading] = useState(mediaId && mediaId !== 'unknown');

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
 setLoading(false);
 }
 };
 
 if (mediaId && mediaId !== 'unknown') {
 fetchMedia();
 }
 }, [mediaId]);

 return (
 <div className="bg-white rounded-xl border border-[var(--color-border-subtle)] overflow-hidden mb-6 fade-in">
 {/* Post Header Section */}
 <div className="bg-[var(--color-bg-subtle)] border-b border-[var(--color-border-subtle)] p-4 flex gap-4">
 {/* Post Image Thumbnail */}
 <div className="w-24 h-24 shrink-0 rounded-lg bg-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden relative group">
 {loading ? (
 <Spinner className="text-[var(--color-text-muted)]" size={24} />
 ) : media ? (
 <img 
 src={media.media_type === 'VIDEO' ? media.thumbnail_url : media.media_url} 
 alt="Post thumbnail" 
 className="w-full h-full object-cover transition-transform group-hover:scale-105"
 />
 ) : (
 <ImageIcon className="text-[var(--color-text-muted)]" size={32} />
 )}
 
 {media?.permalink && (
 <a 
 href={media.permalink} 
 target="_blank" 
 rel="noopener noreferrer"
 className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white backdrop-blur-sm"
 title="View on Instagram"
 >
 <ExternalLink size={20} />
 </a>
 )}
 </div>

 {/* Post Details */}
 <div className="flex-1 min-w-0 flex flex-col justify-center">
 <div className="flex items-center gap-2 mb-1.5">
 <span className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
 {media?.media_type || 'POST'}
 </span>
 <span className="text-xs text-[var(--color-text-muted)]">
 &bull; {comments.length} Comment{comments.length !== 1 ? 's' : ''}
 </span>
 </div>
 <p className="text-sm text-[var(--color-text-main)] line-clamp-3 font-medium leading-snug">
 {media?.caption || 'Loading caption...'}
 </p>
 </div>
 </div>

 {/* Comments List Section */}
 <div className="divide-y divide-[var(--color-border-subtle)]">
 {comments.map((comment, i) => (
 <div key={i} className="pl-4">
 <ActivityCard data={comment} type="comment" hideBorder />
 </div>
 ))}
 </div>
 </div>
 );
}
