import { API_URL } from './config';
import React, { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation, Navigate, Link } from "react-router-dom";
import io from "socket.io-client";
import { Toaster } from "react-hot-toast";

// Layout & UI Components
import DashboardLayout from "./components/layout/DashboardLayout";
import SectionLabel from "./components/ui/SectionLabel";
import Spinner from "./components/ui/Spinner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'monospace', color: 'red' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// Pages
import CommentsInbox from "./components/inbox/CommentsInbox";
import MessagingInbox from "./components/inbox/MessagingInbox";
import MetaReviewChecklist from "./pages/MetaReviewChecklist";
import MetaReviewDashboard from "./pages/MetaReviewDashboard";

// CRM Pages & Auth
import CRMAuth from "./components/auth/CRMAuth";
import CRMAnalytics from "./pages/CRMAnalytics";
import CRMRules from "./pages/CRMRules";
import CRMTemplates from "./pages/CRMTemplates";
import AdminAccountCreation from "./pages/AdminAccountCreation";
import LeadsPipeline from "./pages/LeadsPipeline";
import ActivityFeed from "./pages/ActivityFeed";
import RevenueDashboard from "./pages/RevenueDashboard";
import AdminMembershipTiers from "./pages/AdminMembershipTiers";
import CustomerDetails from "./pages/CustomerDetails";
import CustomersList from "./pages/CustomersList";
import AdminEventManagement from "./pages/AdminEventManagement";
import AdminEventDetails from "./pages/AdminEventDetails";
import AdminDeletedLeads from "./pages/AdminDeletedLeads";
import ConnectedAccounts from "./pages/ConnectedAccounts";
import TransactionHistory from "./pages/TransactionHistory";
import SalaryIncentives from "./pages/SalaryIncentives";
import AdminTeamConfiguration from "./pages/AdminTeamConfiguration";
import AdminCityConfiguration from "./pages/AdminCityConfiguration";
import AdminCityMigration from "./pages/AdminCityMigration";
import PLDashboard from "./pages/PLDashboard";
import MyEarnings from "./pages/MyEarnings";

// Protected CRM Route Wrapper
const CRMProtectedRoute = ({ children, requireAdmin, requireSuperAdmin }) => {
  const { isAuthenticated, loading, user } = useAuth();
  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <Spinner className="text-[var(--color-primary)]" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <CRMAuth />;
  }
  if (requireSuperAdmin && user?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }
  if (requireAdmin && user?.role !== 'admin' && user?.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const socket = io(`${API_URL}`);

function CommentsView({ comments }) {
  return (
    <div className="fade-in space-y-4">
      <CommentsInbox comments={comments} />
    </div>
  );
}

function MessagesView({ messages }) {
  return (
    <div className="fade-in space-y-4">
      <SectionLabel
        count={messages.length}
        label="message"
        extra={
          messages.length > 0
            ? `${messages.filter((m) => m.type === "incoming").length} unread`
            : null
        }
      />
      <MessagingInbox messages={messages} />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 fade-in py-20">
      <h1 className="text-4xl font-bold text-[var(--color-text-main)]">404</h1>
      <p className="text-lg text-[var(--color-text-muted)]">Page not found</p>
      <Link to="/dashboard" className="btn-primary mt-4">Go to Dashboard</Link>
    </div>
  );
}

function MainApp() {
  const [comments, setComments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [posts, setPosts] = useState([]);
  const [settings, setSettings] = useState({
    autoCommentReply: true,
    commentReplyText: "",
    autoDMReply: true,
    dmReplyText: "",
    dmOnComment: false,
    dmOnCommentText: "",
  });
  const [saveStatus, setSaveStatus] = useState(null);
  const location = useLocation();

  useEffect(() => {
    fetch(`${API_URL}/api/settings`)
      .then((res) => res.json())
      .then((data) => setSettings(data))
      .catch((err) => console.error("Error fetching settings:", err));

    const fetchAllPosts = async () => {
      let allFetchedPosts = [];
      let afterMedia = null;
      let afterTags = null;
      
      while (afterMedia !== 'done' || afterTags !== 'done') {
        try {
          const params = new URLSearchParams();
          if (afterMedia) params.append('afterMedia', afterMedia);
          if (afterTags) params.append('afterTags', afterTags);
          
          const res = await fetch(`${API_URL}/api/account/posts?${params.toString()}`);
          const data = await res.json();
          
          if (data.posts && data.posts.length > 0) {
            allFetchedPosts = [...allFetchedPosts, ...data.posts];
            // Deduplicate across batches
            const uniqueMap = new Map();
            allFetchedPosts.forEach(p => uniqueMap.set(p.id, p));
            const uniquePosts = Array.from(uniqueMap.values());
            
            // Sort descending by timestamp
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
    };
    fetchAllPosts();

    socket.on("init_comments", (data) => setComments(data.reverse()));
    socket.on("new_comment", (data) => setComments((prev) => [data, ...prev]));
    socket.on("init_messages", (data) => setMessages(data.reverse()));
    socket.on("new_message", (data) => setMessages((prev) => [data, ...prev]));

    return () => {
      socket.off("init_comments");
      socket.off("new_comment");
      socket.off("init_messages");
      socket.off("new_message");
    };
  }, []);

  const handleSaveSettings = async () => {
    setSaveStatus("saving");
    try {
      const response = await fetch(`${API_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (response.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.error(error);
      setSaveStatus("error");
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Comments Activity";
      case "/messages":
        return "Direct Messages";
      case "/settings":
        return "Settings";
      case "/leads":
        return "Leads Pipeline";
      case "/activity-feed":
        return "Activity Feed";
      case "/accounts":
        return "Accounts";

      case "/rules":
        return "Rules & Templates";
      case "/dashboard":
        return "Dashboard";
      case "/crm-login":
        return "CRM Authentication";
      case "/admin/create-account":
        return "Account Management";
      case "/admin/teams":
        return "Team Configuration";
      case "/admin/cities":
        return "City Configuration";
      case "/admin/pl-dashboard":
        return "P&L Dashboard";
      case "/admin/membership-tiers":
        return "Membership Tiers";
      default:
        if (location.pathname.startsWith("/customers/")) return "Customer Details";
        return "Dashboard";
    }
  };

  return (
    <DashboardLayout title={getPageTitle()}>
      <Routes>
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="crm-login" element={<CRMAuth />} />
        <Route
          path="leads"
          element={
            <CRMProtectedRoute>
              <LeadsPipeline />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="activity-feed"
          element={
            <CRMProtectedRoute>
              <ActivityFeed />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="accounts"
          element={
            <CRMProtectedRoute>
              <ConnectedAccounts />
            </CRMProtectedRoute>
          }
        />

        <Route
          path="rules"
          element={
            <CRMProtectedRoute requireAdmin>
              <CRMRules
                settings={settings}
                setSettings={setSettings}
                handleSaveSettings={handleSaveSettings}
                saveStatus={saveStatus}
                posts={posts}
              />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="dashboard"
          element={
            <CRMProtectedRoute>
              <CRMAnalytics />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="revenue"
          element={
            <CRMProtectedRoute>
              <RevenueDashboard />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="transactions"
          element={
            <CRMProtectedRoute>
              <TransactionHistory />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="my-earnings"
          element={
            <CRMProtectedRoute>
              <MyEarnings />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="admin/create-account"
          element={
            <CRMProtectedRoute requireAdmin>
              <AdminAccountCreation />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="admin/teams"
          element={
            <CRMProtectedRoute requireAdmin>
              <AdminTeamConfiguration />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="admin/cities"
          element={
            <CRMProtectedRoute requireAdmin>
              <AdminCityConfiguration />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="admin/city-migration"
          element={
            <CRMProtectedRoute requireAdmin>
              <AdminCityMigration />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="admin/salary"
          element={
            <CRMProtectedRoute requireAdmin>
              <SalaryIncentives />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="admin/pl-dashboard"
          element={
            <CRMProtectedRoute requireAdmin>
              <PLDashboard />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="admin/deleted-leads"
          element={
            <CRMProtectedRoute requireAdmin>
              <AdminDeletedLeads />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="admin/membership-tiers"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="admin/events"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="admin/events/*"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="customers"
          element={
            <CRMProtectedRoute>
              <CustomersList />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="customers/:leadId"
          element={
            <CRMProtectedRoute>
              <CustomerDetails />
            </CRMProtectedRoute>
          }
        />
        <Route
          path="*"
          element={
            <CRMProtectedRoute>
              <NotFound />
            </CRMProtectedRoute>
          }
        />
      </Routes>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} containerStyle={{ zIndex: 999999 }} />
          <BrowserRouter>
            <Routes>
              <Route path="/*" element={<MainApp />} />
              {/* <Route path="/meta-review" element={<MetaReviewDashboard />} />
              <Route
                path="/meta-review/checklist"
                element={<MetaReviewChecklist />}
              /> */}
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
