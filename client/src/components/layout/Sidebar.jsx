import {
  ArrowRightLeft,
  BarChart2,
  Briefcase,
  Calendar,
  Crown,
  History,
  Link,
  LogOut,
  IndianRupee,
  PanelLeftClose,
  Shield,
  SlidersVertical,
  Sparkles,
  Trash2,
  Users,
  UserStar,
  Wallet,
  X,
  LayoutDashboard,
  UserCog,
  HandCoins,
  Map,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../../assets/livingcollective.png";
import userImg from "../../assets/user.png";
import { useAuth } from "../../context/AuthContext";
import ConfirmationDialog from "../ui/ConfirmationDialog";

const Sidebar = ({ isCollapsed, onToggle, isMobileOpen, onMobileClose }) => {
  const { isAuthenticated, user, logout } = useAuth();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const confirmLogout = () => {
    logout();
    if (onMobileClose) onMobileClose();
    setShowLogoutConfirm(false);
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  return (
    <>
      <aside
        className={`bg-[var(--color-bg-card)] border-r border-[var(--color-border-subtle)] flex flex-col h-screen fixed left-0 top-0 z-50 transition-all duration-300 -[2px_0_10px_rgba(0,0,0,0.02)]
 ${isMobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full md:translate-x-0"} 
 ${isCollapsed ? "md:w-[80px]" : "md:w-[260px]"}
 `}>
        {/* Brand Logo & Collapse Trigger */}
        <div
          className={`h-[80px] flex items-center pt-2 pb-2 mb-2 relative ${
            isCollapsed && !isMobileOpen
              ? "px-0 justify-center"
              : "px-6 justify-between"
          }`}>
          <button
            onClick={() => {
              if (isCollapsed && !isMobileOpen) onToggle();
            }}
            className={`flex items-center gap-3 overflow-hidden ${isCollapsed && !isMobileOpen ? "cursor-pointer hover:opacity-80 focus:outline-none" : "cursor-default focus:outline-none"}`}
            title={isCollapsed && !isMobileOpen ? "Expand Sidebar" : ""}>
            <img
              src={logo}
              alt="Halal Interactions Logo"
              className="w-8 h-8 rounded-lg shrink-0 object-contain"
            />
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col fade-in text-left">
                <span className="text-base font-bold text-[#111827] leading-tight">
                  Halal Interactions
                </span>
                <span className="text-xs text-[#6B7280] font-medium leading-tight">
                  CRM
                </span>
              </div>
            )}
          </button>

          {/* Mobile Close Button */}
          {isMobileOpen && (
            <button
              onClick={onMobileClose}
              className="md:hidden p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-bg-hover)] transition-colors focus:outline-none cursor-pointer"
              aria-label="Close Sidebar">
              <X size={18} />
            </button>
          )}

          {/* Inline Toggle Button (Desktop Only) */}
          {!isCollapsed && !isMobileOpen && (
            <button
              onClick={onToggle}
              className="hidden md:flex text-[var(--color-text-muted)] hover:text-[#111827] items-center justify-center cursor-pointer focus:outline-none transition-colors"
              title="Collapse Sidebar">
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={`flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-6`}>
          {/* GROUP: MAIN MENU */}
          <div className="flex flex-col gap-1">
            {(!isCollapsed || isMobileOpen) && (
              <div className="px-3 mb-2 text-xs font-bold tracking-wider text-[var(--color-text-light)] uppercase fade-in">
                Main Menu
              </div>
            )}

            {isAuthenticated && (
              <NavItem
                to="/dashboard"
                icon={LayoutDashboard}
                label="Dashboard"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
            )}
            {isAuthenticated && (
              <NavItem
                to="/revenue"
                icon={Wallet}
                label="Revenue Dashboard"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
            )}
            {isAuthenticated && ["admin", "superadmin"].includes(user?.role) && (
              <NavItem
                to="/admin/pl-dashboard"
                icon={BarChart2}
                label="P&L Dashboard"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
            )}
            {isAuthenticated && (
              <NavItem
                to="/transactions"
                icon={ArrowRightLeft}
                label="Transaction History"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
            )}
            {isAuthenticated && (
              <NavItem
                to="/my-earnings"
                icon={HandCoins}
                label="My Earnings"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
            )}
            <NavItem
              to="/leads"
              icon={Users}
              label="Leads Pipeline"
              isCollapsed={isCollapsed}
              isMobileOpen={isMobileOpen}
              onMobileClose={onMobileClose}
            />
            {isAuthenticated && (
              <NavItem
                to="/customers"
                icon={UserStar}
                label="Customers"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
            )}
            {isAuthenticated && (
              <NavItem
                to="/activity-feed"
                icon={History}
                label="Activity Feed"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
            )}
          </div>

          {/* GROUP: WORKSPACE */}
          {isAuthenticated && ["admin", "superadmin"].includes(user?.role) && (
            <div className="flex flex-col gap-1">
              {(!isCollapsed || isMobileOpen) && (
                <div className="px-3 mb-2 text-xs font-bold tracking-wider text-[var(--color-text-light)] uppercase fade-in">
                  Workspace
                </div>
              )}

              <NavItem
                to="/rules"
                icon={Sparkles}
                label="Automation Paths"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
              <NavItem
                to="/admin/create-account"
                icon={SlidersVertical}
                label="Account Management"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
              <NavItem
                to="/admin/teams"
                icon={UserCog}
                label="Team Configuration"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
              <NavItem
                to="/admin/cities"
                icon={Map}
                label="City Configuration"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
              <NavItem
                to="/admin/salary"
                icon={Briefcase}
                label="Salary & Incentives"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />

              <NavItem
                to="/admin/deleted-leads"
                icon={Trash2}
                label="Deleted Leads"
                isCollapsed={isCollapsed}
                isMobileOpen={isMobileOpen}
                onMobileClose={onMobileClose}
              />
              {user?.role === "superadmin" && (
                <NavItem
                  to="/accounts"
                  icon={Link}
                  label="Accounts"
                  isCollapsed={isCollapsed}
                  isMobileOpen={isMobileOpen}
                  onMobileClose={onMobileClose}
                />
              )}
            </div>
          )}
        </nav>
        {/* 
 <div className="px-4 pb-4 shrink-0">
 <NavItem to="/meta-review" icon={Link} label="Account" isCollapsed={isCollapsed} isMobileOpen={isMobileOpen} onMobileClose={onMobileClose} />
 </div> */}

        {/* Sidebar Footer */}
        <div
          className={`shrink-0 border-t border-[var(--color-border-subtle)] p-4`}>
          {/* CRM Agent Auth Card */}
          {!isAuthenticated ? (
            <NavLink
              to="/crm-login"
              onClick={onMobileClose}
              className={`w-full flex items-center bg-[#3B82F6] text-white hover:bg-[#1D4ED8] rounded-xl transition-all duration-200 text-sm font-bold ${
                isCollapsed && !isMobileOpen
                  ? "justify-center p-3"
                  : "px-4 py-3 gap-3"
              }`}
              title="CRM Agent Workspace">
              <Shield size={16} className="shrink-0" />
              {(!isCollapsed || isMobileOpen) && (
                <span className="fade-in truncate">Agent Login</span>
              )}
            </NavLink>
          ) : (
            <div
              className={`flex items-center gap-3 ${isCollapsed && !isMobileOpen ? "justify-center" : "px-2"}`}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center border border-[var(--color-border-subtle)] overflow-hidden shrink-0"
                title={`${user.name} (${user.role})`}>
                <img
                  src={userImg}
                  alt="User Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <>
                  <div className="flex flex-col min-w-0 flex-1 fade-in pr-2">
                    <span className="text-sm font-bold text-[var(--color-text-main)] truncate w-full text-left">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-[var(--color-text-muted)] truncate w-full text-left mt-0.5">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-[var(--color-text-muted)] hover:text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer shrink-0">
                    <LogOut size={18} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
      <ConfirmationDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={confirmLogout}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        isDestructive={false}
      />
    </>
  );
};

const NavItem = ({
  to,
  exact,
  icon: Icon,
  label,
  isCollapsed,
  isMobileOpen,
  onMobileClose,
}) => (
  <NavLink
    to={to}
    end={exact}
    onClick={onMobileClose}
    className={({ isActive }) =>
      `group relative flex items-center rounded-xl text-sm transition-all duration-200 ease-out overflow-hidden ${
        isCollapsed && !isMobileOpen
          ? "justify-center w-12 h-12 mx-auto"
          : "gap-3 px-3 py-2.5"
      } ${
        isActive
          ? "text-[#111827] bg-[#F3F4F6] font-semibold"
          : "text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] font-medium"
      }`
    }
    title={isCollapsed && !isMobileOpen ? label : undefined}>
    {({ isActive }) => (
      <>
        {/* Active Indicator Line (Left edge of the rounded button) */}
        <div
          className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-1/2 bg-[#3B82F6] rounded-r-full transition-all duration-200 ${
            isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
          }`}
        />

        <Icon
          size={18}
          className={`shrink-0 transition-transform duration-200 ${isActive ? "text-[#111827]" : "text-[#9CA3AF] group-hover:text-[#6B7280]"}`}
        />
        {(!isCollapsed || isMobileOpen) && (
          <span className="fade-in truncate">{label}</span>
        )}
      </>
    )}
  </NavLink>
);

export default Sidebar;
