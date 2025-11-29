"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkAdminAccess, getAllUsers, updateUserStatus, getUserStats, getAllServices, updateServiceStatus, deleteService, deleteUser, getServiceStats } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  X
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
  const [activeTab, setActiveTab] = useState<"users" | "services">("users");
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
        
        // Load users, services, and stats
        const [usersData, servicesData, statsData, serviceStatsData] = await Promise.all([
          getAllUsers(),
          getAllServices(),
          getUserStats(),
          getServiceStats()
        ]);

        setUsers(usersData);
        setFilteredUsers(usersData);
        setServices(servicesData);
        setFilteredServices(servicesData);
        setStats(statsData);
        setServiceStats(serviceStatsData);
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
                  placeholder={activeTab === "users" ? "Search users..." : "Search services..."}
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
              ) : (
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
              )}
              
              <Button
                onClick={() => {
                  setSearchTerm("");
                  if (activeTab === "users") {
                    setRoleFilter("all");
                    setStatusFilter("all");
                  } else {
                    setServiceStatusFilter("all");
                    setServiceCategoryFilter("all");
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
              {activeTab === "users" ? `Users (${filteredUsers.length})` : `Services (${filteredServices.length})`}
            </h3>
          </div>
          
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
                            Verify
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
        </div>

        {(activeTab === "users" ? filteredUsers.length === 0 : filteredServices.length === 0) && (
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
