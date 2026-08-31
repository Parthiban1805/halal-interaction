import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { Menu, AlertTriangle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth as useCRMAuth } from '../../context/AuthContext';

const DashboardLayout = ({ children, title }) => {
 const { token, isAuthenticated } = useCRMAuth();
 const navigate = useNavigate();

 // Load state from localStorage so it persists across routes and refreshes
 const [isCollapsed, setIsCollapsed] = useState(() => {
 return localStorage.getItem('sidebar_collapsed') === 'true';
 });
 const [isMobileOpen, setIsMobileOpen] = useState(false);
  // Task fetching logic has been removed as it's no longer needed

 const handleToggle = () => {
 setIsCollapsed(prev => {
 const next = !prev;
 localStorage.setItem('sidebar_collapsed', String(next));
 return next;
 });
 };

 return (
 <div className="flex h-screen bg-[var(--color-bg-app)] overflow-hidden">
 {/* Sidebar Overlay Backdrop for Mobile */}
 {isAuthenticated && isMobileOpen && (
 <div 
 className="fixed inset-0 bg-black/55 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
 onClick={() => setIsMobileOpen(false)}
 />
 )}

 {isAuthenticated && (
 <Sidebar 
 isCollapsed={isCollapsed} 
 onToggle={handleToggle} 
 isMobileOpen={isMobileOpen}
 onMobileClose={() => setIsMobileOpen(false)}
 />
 )}

 <div className={`flex-1 flex flex-col h-screen overflow-hidden transition-all duration-300 ml-0 ${isAuthenticated ? (isCollapsed ? 'md:ml-[72px]' : 'md:ml-[260px]') : 'md:ml-0'}`}>
 {/* Mobile Top Header */}
 <header className="md:hidden h-14 bg-[var(--color-bg-card)]/85 backdrop-blur-md border-b border-[var(--color-border-subtle)] flex items-center px-4 justify-between sticky top-0 z-30 shrink-0 select-none">
 <div className="flex items-center gap-3">
 {isAuthenticated && (
 <button 
 onClick={() => setIsMobileOpen(true)}
 className="p-1.5 rounded-lg text-[var(--color-text-main)] hover:bg-[var(--color-bg-hover)] transition-colors focus:outline-none cursor-pointer"
 aria-label="Open Sidebar"
 >
 <Menu size={22} />
 </button>
 )}
 <span className="font-semibold text-base text-[var(--color-text-main)] truncate max-w-[200px]">
 {title || 'Replyr'}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-status-success)] opacity-75"></span>
 <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-status-success)]"></span>
 </span>
 </div>
 </header>

 <main className="flex-1 overflow-y-auto relative bg-[var(--color-bg-app)] transition-colors duration-300">
 <div className="w-full max-w-[1600px] mx-auto py-8 px-5">
 {children}
 </div>
 </main>
 </div>
 </div>
 );
};

export default DashboardLayout;
