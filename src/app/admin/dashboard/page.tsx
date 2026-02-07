"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { checkAdminAccess, getAllUsers, updateUserStatus, getUserStats, getAllServices, updateServiceStatus, deleteService, deleteUser, getServiceStats } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  Users, 
  Search, 
  Shield, 
  UserCheck, 
  UserX, 
  Mail, 
  Phone, 
  MapPin,
  Calendar,
  Filter,
  LogOut,
  Activity,
  AlertTriangle,
  Briefcase,
  Trash2,
  DollarSign,
  Clock,
  Star,
  Eye,
  EyeOff,
  Wallet,
  CheckCircle,
  Loader2,
  MessageCircle,
  Send,
  HelpCircle
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Toaster } from "@/components/ui/toaster";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "teen" | "parent" | "admin";
  status: "active" | "inactive" | "suspended" | "pending_verification";
  age: number | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  parent_email: string | null;
  parent_phone: string | null;
  is_verified: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

interface ServiceProfile {
  id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  category: string;
  status: string;
  duration: number;
  rating: number | null;
  total_bookings: number;
  created_at: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface SupportMessage {
  id: string;
  sender_id: string;
  sender_name?: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

interface SupportConversation {
  id: string;
  booking_id: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string | null;
  };
  service_title: string | null;
  last_message: {
    content: string | null;
    image_url: string | null;
    created_at: string;
    sender_id: string;
    sender_name: string;
  } | null;
  unread_count: number;
  created_at: string | null;
}

interface WithdrawalRequest {
  id: string;
  user_id: string | null;
  amount: number | null;
  platform_fee: number | null;
  total_earnings: number | null;
  status: string;
  created_at: string | null;
  profiles: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [services, setServices] = useState<ServiceProfile[]>([]);
  const [filteredServices, setFilteredServices] = useState<ServiceProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceStatusFilter, setServiceStatusFilter] = useState<string>("all");
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>("all");
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"users" | "services" | "withdrawals" | "support">("users");
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
  const [selectedSupportConversation, setSelectedSupportConversation] = useState<SupportConversation | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [newSupportMessage, setNewSupportMessage] = useState("");
  const [sendingSupportMessage, setSendingSupportMessage] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    teenUsers: 0,
    pendingUsers: 0,
  });
  const [serviceStats, setServiceStats] = useState({
    totalServices: 0,
    activeServices: 0,
    pausedServices: 0,
  });
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredSupportConversations = useMemo(() => {
    if (!normalizedSearch) return supportConversations;
    return supportConversations.filter((conv) => {
      const fullName = `${conv.user.first_name} ${conv.user.last_name}`.toLowerCase();
      const email = conv.user.email.toLowerCase();
      const serviceTitle = (conv.service_title || "").toLowerCase();
      const lastMessageContent = (conv.last_message?.content || "").toLowerCase();
      return (
        fullName.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        serviceTitle.includes(normalizedSearch) ||
        lastMessageContent.includes(normalizedSearch)
      );
    });
  }, [supportConversations, normalizedSearch]);

  const filteredWithdrawalRequests = useMemo(() => {
    let filtered = withdrawalRequests;
    if (withdrawalStatusFilter !== "all") {
      filtered = filtered.filter((request) => request.status === withdrawalStatusFilter);
    }
    if (!normalizedSearch) return filtered;
    return filtered.filter((request) => {
      const name = `${request.profiles?.first_name || ""} ${request.profiles?.last_name || ""}`.toLowerCase();
      const email = (request.profiles?.email || "").toLowerCase();
      const status = request.status.toLowerCase();
      return (
        name.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        status.includes(normalizedSearch)
      );
    });
  }, [withdrawalRequests, withdrawalStatusFilter, normalizedSearch]);

  useEffect(() => {
    const initializeAdmin = async () => {
      try {
        setLoading(true);
        
        // Check admin access
        const adminUser = await checkAdminAccess();
        if (!adminUser) {
          router.push('/admin/login');
          return;
        }

        setCurrentUser(adminUser);
        
        // Load users, services, stats, withdrawal requests, and support conversations
        const [usersData, servicesData, statsData, serviceStatsData, withdrawalRequestsData, supportData] = await Promise.all([
          getAllUsers(),
          getAllServices(),
          getUserStats(),
          getServiceStats(),
          fetchWithdrawalRequests(),
          fetchSupportConversations()
        ]);

        setUsers(usersData);
        setFilteredUsers(usersData);
        setServices(servicesData);
        setFilteredServices(servicesData);
        setStats(statsData);
        setServiceStats(serviceStatsData);
        setWithdrawalRequests(withdrawalRequestsData || []);
        setSupportConversations(supportData || []);
      } catch (error) {
        console.error('Error initializing admin:', error);
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    initializeAdmin();
  }, [router]);

  useEffect(() => {
    let filtered = users;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    let filtered = services;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(service => 
        service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.profiles.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.profiles.last_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (serviceStatusFilter !== "all") {
      filtered = filtered.filter(service => service.status === serviceStatusFilter);
    }

    // Category filter
    if (serviceCategoryFilter !== "all") {
      filtered = filtered.filter(service => service.category === serviceCategoryFilter);
    }

    setFilteredServices(filtered);
  }, [services, searchTerm, serviceStatusFilter, serviceCategoryFilter]);

  async function fetchWithdrawalRequests() {
    try {
      const res = await fetch("/api/admin/withdrawal-requests", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data.withdrawalRequests || [];
        }
      }
      return [];
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      return [];
    }
  }

  async function fetchSupportConversations() {
    try {
      const res = await fetch("/api/admin/support", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data.conversations || [];
        }
      }
      return [];
    } catch (error) {
      console.error("Error fetching support conversations:", error);
      return [];
    }
  }

  async function fetchSupportMessages(bookingId: string) {
    try {
      const res = await fetch(`/api/messages?booking_id=${bookingId}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data.messages || [];
        }
      }
      return [];
    } catch (error) {
      console.error("Error fetching support messages:", error);
      return [];
    }
  }

  async function handleSendSupportMessage() {
    if (!newSupportMessage.trim() || !selectedSupportConversation) return;

    try {
      setSendingSupportMessage(true);
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: selectedSupportConversation.booking_id,
          receiver_id: selectedSupportConversation.user.id,
          content: newSupportMessage.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to send message");
      }

      const data = await res.json();
      if (data.success) {
        setSupportMessages(prev => [...prev, data.message]);
        setNewSupportMessage("");
        // Refresh conversations to update unread counts
        const updated = await fetchSupportConversations();
        setSupportConversations(updated);
      }
    } catch (e: unknown) {
      toast({
        title: "Error sending message",
        description: getErrorMessage(e, "Failed to send message"),
        variant: "destructive",
      });
    } finally {
      setSendingSupportMessage(false);
    }
  }

  useEffect(() => {
    if (selectedSupportConversation) {
      fetchSupportMessages(selectedSupportConversation.booking_id).then(setSupportMessages);
    }
  }, [selectedSupportConversation]);

  // Refresh withdrawal requests when withdrawals tab is opened
  useEffect(() => {
    if (activeTab === "withdrawals") {
      fetchWithdrawalRequests().then(setWithdrawalRequests);
    }
  }, [activeTab]);

  async function handleProcessWithdrawal(requestId: string) {
    setProcessingRequest(requestId);
    try {
      const res = await fetch(`/api/admin/withdrawal-requests/${requestId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to process withdrawal");
      }

      const data = await res.json();
      if (data.success) {
        toast({
          title: "Withdrawal Approved",
                            description: data.message || `Withdrawal approved. Please manually pay $${Number(data.withdrawalRequest?.amount || 0).toFixed(2)} to ${data.withdrawalRequest?.user_name || 'the student'} via Stripe.`,
        });
        // Refresh withdrawal requests
        const updatedRequests = await fetchWithdrawalRequests();
        setWithdrawalRequests(updatedRequests);
      }
    } catch (e: unknown) {
      toast({
        title: "Error processing withdrawal",
        description: getErrorMessage(e, "Failed to process withdrawal"),
        variant: "destructive",
      });
    } finally {
      setProcessingRequest(null);
    }
  }

  const handleUpdateUserStatus = async (userId: string, newStatus: "active" | "inactive" | "suspended" | "pending_verification") => {
    setActionLoading(userId);
    try {
      await updateUserStatus(userId, newStatus);
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
      
      // Update filtered users as well
      setFilteredUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));

      // Update stats
      const updatedStats = await getUserStats();
      setStats(updatedStats);

      toast({
        title: "Status updated",
        description: `User status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleVerification = async (userId: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to update verification status");
      }

      const data = await res.json();
      if (data.success) {
        // Update local state
        setUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, is_verified: data.is_verified } : user
        ));
        
        // Update filtered users as well
        setFilteredUsers(prev => prev.map(user => 
          user.id === userId ? { ...user, is_verified: data.is_verified } : user
        ));

        toast({
          title: "Verification updated",
          description: data.message || `User ${data.is_verified ? 'verified' : 'unverified'} successfully`,
        });
      }
    } catch (error: unknown) {
      console.error('Error toggling verification:', error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to update verification status. Please try again."),
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    setActionLoading(userId);
    try {
      await deleteUser(userId);
      
      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      setFilteredUsers(prev => prev.filter(user => user.id !== userId));

      // Update stats
      const updatedStats = await getUserStats();
      setStats(updatedStats);

      toast({
        title: "User deleted",
        description: "User has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to delete user. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateServiceStatus = async (serviceId: string, newStatus: string) => {
    setActionLoading(serviceId);
    try {
      await updateServiceStatus(serviceId, newStatus);
      
      // Update local state
      setServices(prev => prev.map(service => 
        service.id === serviceId ? { ...service, status: newStatus } : service
      ));
      
      // Update filtered services as well
      setFilteredServices(prev => prev.map(service => 
        service.id === serviceId ? { ...service, status: newStatus } : service
      ));

      // Update stats
      const updatedStats = await getServiceStats();
      setServiceStats(updatedStats);

      toast({
        title: "Status updated",
        description: `Service status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating service status:', error);
      toast({
        title: "Error",
        description: "Failed to update service status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }
    
    setActionLoading(serviceId);
    try {
      await deleteService(serviceId);
      
      // Update local state
      setServices(prev => prev.filter(service => service.id !== serviceId));
      setFilteredServices(prev => prev.filter(service => service.id !== serviceId));

      // Update stats
      const updatedStats = await getServiceStats();
      setServiceStats(updatedStats);

      toast({
        title: "Service deleted",
        description: "Service has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting service:', error);
      toast({
        title: "Error",
        description: "Failed to delete service. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/admin/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'inactive': return 'bg-gray-50 text-gray-700 border-gray-200';
      case 'suspended': return 'bg-red-50 text-red-700 border-red-200';
      case 'pending_verification': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'teen': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'parent': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'paused': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'inactive': return 'bg-gray-50 text-gray-700 border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-slate-900 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <Toaster />
      <AdminLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Manage users and services</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setShowSensitiveData(!showSensitiveData)}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {showSensitiveData ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showSensitiveData ? "Hide" : "Show"} Data
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
              <div className="p-2 bg-slate-100 rounded-lg">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Active Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeUsers}</p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Teens</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.teenUsers}</p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Services</p>
                <p className="text-2xl font-semibold text-gray-900">{serviceStats.totalServices}</p>
              </div>
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Briefcase className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Active Services</p>
                <p className="text-2xl font-semibold text-gray-900">{serviceStats.activeServices}</p>
              </div>
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Pending</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pendingUsers}</p>
              </div>
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg border border-gray-200 mb-4 shadow-sm">
          <div className="p-1">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab("users")}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === "users"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Users ({filteredUsers.length})
              </button>
              <button
                onClick={() => setActiveTab("services")}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === "services"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Briefcase className="w-4 h-4 inline mr-2" />
                Services ({filteredServices.length})
              </button>
              <button
                onClick={() => setActiveTab("withdrawals")}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === "withdrawals"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Wallet className="w-4 h-4 inline mr-2" />
                Withdrawals ({withdrawalRequests.filter((r) => r.status === 'processing').length})
              </button>
              <button
                onClick={() => setActiveTab("support")}
                className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === "support"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <HelpCircle className="w-4 h-4 inline mr-2" />
                Support ({supportConversations.filter((c) => c.unread_count > 0).length})
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg border border-gray-200 mb-4 shadow-sm">
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={activeTab === "users" ? "Search users..." : activeTab === "services" ? "Search services..." : activeTab === "support" ? "Search support conversations..." : "Search withdrawals..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-slate-900 focus:ring-slate-900"
                />
              </div>
              
              {activeTab === "users" ? (
                <>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-gray-700 text-sm"
                  >
                    <option value="all">All Roles</option>
                    <option value="teen">Teens</option>
                    <option value="parent">Parents</option>
                    <option value="admin">Admins</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-gray-700 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending_verification">Pending</option>
                  </select>
                </>
              ) : activeTab === "services" ? (
                <>
                  <select
                    value={serviceStatusFilter}
                    onChange={(e) => setServiceStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-gray-700 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={serviceCategoryFilter}
                    onChange={(e) => setServiceCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-gray-700 text-sm"
                  >
                    <option value="all">All Categories</option>
                    <option value="pet_care">Pet Care</option>
                    <option value="lawn_care">Lawn Care</option>
                    <option value="tutoring">Tutoring</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="tech_support">Tech Support</option>
                    <option value="delivery">Delivery</option>
                    <option value="other">Other</option>
                  </select>
                </>
              ) : activeTab === "withdrawals" ? (
                <select
                  value={withdrawalStatusFilter}
                  onChange={(e) => setWithdrawalStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 text-gray-700 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="processing">Processing</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <div />
              )}
              
              <Button
                onClick={() => {
                  setSearchTerm("");
                  if (activeTab === "users") {
                    setRoleFilter("all");
                    setStatusFilter("all");
                  } else if (activeTab === "services") {
                    setServiceStatusFilter("all");
                    setServiceCategoryFilter("all");
                  } else if (activeTab === "withdrawals") {
                    setWithdrawalStatusFilter("all");
                  }
                }}
                variant="outline"
                size="sm"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              {activeTab === "users" ? `Users (${filteredUsers.length})` : activeTab === "services" ? `Services (${filteredServices.length})` : activeTab === "support" ? `Support Conversations (${filteredSupportConversations.length})` : `Withdrawal Requests (${filteredWithdrawalRequests.length})`}
            </h3>
          </div>
          
          {activeTab === "support" ? (
            <div className="flex h-[600px]">
              {/* Conversations List */}
              <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
                <div className="p-4 space-y-2">
                  {filteredSupportConversations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <HelpCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p>No support conversations yet</p>
                    </div>
                  ) : (
                    filteredSupportConversations.map((conv) => (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedSupportConversation(conv)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedSupportConversation?.id === conv.id
                            ? "bg-slate-50 border-slate-300"
                            : "bg-white border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                              {conv.user.first_name} {conv.user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{conv.user.email}</div>
                          </div>
                          {conv.unread_count > 0 && (
                            <Badge className="bg-blue-500 text-white">{conv.unread_count}</Badge>
                          )}
                        </div>
                        {conv.service_title && (
                          <div className="text-xs text-gray-600 mb-2">
                            Service: {conv.service_title}
                          </div>
                        )}
                        {conv.last_message && (
                          <div className="text-sm text-gray-600 truncate">
                            {conv.last_message.content || "Image"}
                          </div>
                        )}
                        {conv.last_message && (
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(conv.last_message.created_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Messages View */}
              <div className="flex-1 flex flex-col">
                {selectedSupportConversation ? (
                  <>
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                      <div className="font-semibold text-gray-900">
                        {selectedSupportConversation.user.first_name} {selectedSupportConversation.user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">{selectedSupportConversation.user.email}</div>
                      {selectedSupportConversation.service_title && (
                        <div className="text-sm text-gray-600 mt-1">
                          Service: {selectedSupportConversation.service_title}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {supportMessages.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                          <p>No messages yet</p>
                        </div>
                      ) : (
                        supportMessages.map((msg) => {
                          const isAdmin = msg.sender_id === currentUser?.id;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                  isAdmin
                                    ? "bg-slate-900 text-white"
                                    : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                <div className="text-sm font-medium mb-1">{msg.sender_name}</div>
                                <div className="text-sm">{msg.content}</div>
                                {msg.image_url && (
                                  <img src={msg.image_url} alt="Message" className="mt-2 rounded max-w-full" />
                                )}
                                <div className={`text-xs mt-1 ${isAdmin ? "text-slate-300" : "text-gray-500"}`}>
                                  {new Date(msg.created_at).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-200">
                      <div className="flex gap-2">
                        <Textarea
                          value={newSupportMessage}
                          onChange={(e) => setNewSupportMessage(e.target.value)}
                          placeholder="Type your reply..."
                          rows={3}
                          className="flex-1"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && e.ctrlKey) {
                              handleSendSupportMessage();
                            }
                          }}
                        />
                        <Button
                          onClick={handleSendSupportMessage}
                          disabled={!newSupportMessage.trim() || sendingSupportMessage}
                          className="bg-slate-900 hover:bg-slate-800"
                        >
                          {sendingSupportMessage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p>Select a conversation to view messages</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "withdrawals" ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Platform Fee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Earnings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requested
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredWithdrawalRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {request.profiles?.first_name} {request.profiles?.last_name}
                              </div>
                              <div className="text-sm text-gray-500">{request.profiles?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            ${Number(request.amount || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            ${Number(request.platform_fee || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            ${Number(request.total_earnings || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {request.status === 'processing' ? (
                            <Badge className="bg-blue-100 text-blue-800">Processing</Badge>
                          ) : request.status === 'approved' ? (
                            <Badge className="bg-green-100 text-green-800">Approved</Badge>
                          ) : request.status === 'pending' ? (
                            <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                          ) : request.status === 'failed' ? (
                            <Badge className="bg-red-100 text-red-800">Failed</Badge>
                          ) : request.status === 'cancelled' ? (
                            <Badge className="bg-gray-100 text-gray-800">Cancelled</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">{request.status}</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.created_at ? new Date(request.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {request.status === 'processing' ? (
                            <Button
                              onClick={() => handleProcessWithdrawal(request.id)}
                              disabled={processingRequest === request.id}
                              className="bg-green-600 hover:bg-green-700 text-white"
                              size="sm"
                              title="Approve withdrawal. You will need to manually pay the student via Stripe."
                            >
                              {processingRequest === request.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve & Pay
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredWithdrawalRequests.length === 0 && (
                <div className="text-center py-16">
                  <Wallet className="mx-auto h-12 w-12 text-gray-300" />
                  <h3 className="mt-4 text-sm font-medium text-gray-900">
                    No withdrawal requests
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Withdrawal requests from users will appear here.
                  </p>
                </div>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {activeTab === "users" ? (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Verified
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Service
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Provider
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bookings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeTab === "users" ? filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Age: {user.age || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-700">{user.email}</span>
                        </div>
                        {showSensitiveData && user.phone && (
                          <div className="flex items-center space-x-1.5 mt-1.5">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600">{user.phone}</span>
                          </div>
                        )}
                        {showSensitiveData && user.parent_email && (
                          <div className="flex items-center space-x-1.5 mt-1.5">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600">Parent: {user.parent_email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getStatusColor(user.status)}>
                        {user.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={user.is_verified ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-800 border-gray-200"}>
                        {user.is_verified ? (
                          <>
                            <UserCheck className="w-3 h-3 inline mr-1" />
                            Verified
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 inline mr-1" />
                            Unverified
                          </>
                        )}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-sm text-gray-600">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>
                          {user.city && user.state ? `${user.city}, ${user.state}` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5 text-sm text-gray-600">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {user.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserStatus(user.id, 'suspended')}
                            disabled={actionLoading === user.id}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                          >
                            Suspend
                          </Button>
                        ) : user.status === 'suspended' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserStatus(user.id, 'active')}
                            disabled={actionLoading === user.id}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                          >
                            Activate
                          </Button>
                        ) : user.status === 'pending_verification' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserStatus(user.id, 'active')}
                            disabled={actionLoading === user.id}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserStatus(user.id, 'active')}
                            disabled={actionLoading === user.id}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleVerification(user.id)}
                          disabled={actionLoading === user.id}
                          className={user.is_verified ? "border-orange-300 text-orange-600 hover:bg-orange-50 text-xs" : "border-green-300 text-green-600 hover:bg-green-50 text-xs"}
                          title={user.is_verified ? "Unverify user" : "Verify user"}
                        >
                          {user.is_verified ? (
                            <>
                              <UserX className="h-3.5 w-3.5 mr-1" />
                              Unverify
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              Verify
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={actionLoading === user.id}
                          className="border-red-300 text-red-600 hover:bg-red-50 text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-lg bg-slate-900 flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {service.title}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {service.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="font-medium">
                          {service.profiles.first_name} {service.profiles.last_name}
                        </div>
                        <div className="text-gray-500 text-xs">{service.profiles.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200">
                        {service.category.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium">${service.price}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-gray-500 mt-1">
                          <Clock className="h-3.5 w-3.5" />
                          <span className="text-xs">{service.duration} min</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getServiceStatusColor(service.status)}>
                        {service.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          <span className="font-medium">{service.total_bookings}</span>
                        </div>
                        {service.rating && (
                          <div className="flex items-center space-x-1.5 text-gray-500 mt-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-xs">{service.rating.toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {service.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateServiceStatus(service.id, 'paused')}
                            disabled={actionLoading === service.id}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                          >
                            Pause
                          </Button>
                        ) : service.status === 'paused' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateServiceStatus(service.id, 'active')}
                            disabled={actionLoading === service.id}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateServiceStatus(service.id, 'active')}
                            disabled={actionLoading === service.id}
                            className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteService(service.id)}
                          disabled={actionLoading === service.id}
                          className="border-red-300 text-red-600 hover:bg-red-50 text-xs"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
        {activeTab !== "withdrawals" && activeTab !== "support" && (activeTab === "users" ? filteredUsers.length === 0 : filteredServices.length === 0) && (
          <div className="text-center py-16 bg-white">
            {activeTab === "users" ? (
              <Users className="mx-auto h-12 w-12 text-gray-300" />
            ) : (
              <Briefcase className="mx-auto h-12 w-12 text-gray-300" />
            )}
            <h3 className="mt-4 text-sm font-medium text-gray-900">
              No {activeTab} found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
      </AdminLayout>
    </>
  );
}
  const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  };
