"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { checkAdminAccess, getAllUsers, updateUserStatus, getUserStats, getAllServices, updateServiceStatus, deleteService, deleteUser, getServiceStats } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Download,
  LogOut,
  Settings,
  BarChart3,
  Activity,
  AlertTriangle,
  TrendingUp,
  Database,
  Eye,
  EyeOff,
  Briefcase,
  Edit,
  Trash2,
  DollarSign,
  Clock,
  Star
} from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";

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
  const router = useRouter();

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
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteUser(userId);
      
      // Update local state
      setUsers(prev => prev.filter(user => user.id !== userId));
      setFilteredUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleUpdateServiceStatus = async (serviceId: string, newStatus: string) => {
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
    } catch (error) {
      console.error('Error updating service status:', error);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteService(serviceId);
      
      // Update local state
      setServices(prev => prev.filter(service => service.id !== serviceId));
      setFilteredServices(prev => prev.filter(service => service.id !== serviceId));
    } catch (error) {
      console.error('Error deleting service:', error);
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
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'suspended': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending_verification': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'teen': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'parent': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getServiceStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      {/* Dashboard Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-[#434c9d] to-[#ff725a] rounded-xl">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-700">Admin Dashboard</h1>
                <p className="text-sm text-slate-600">Platform administration & user management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={() => setShowSensitiveData(!showSensitiveData)}
                variant="outline"
                className="border-[#96cbc3] text-[#434c9d] hover:bg-[#96cbc3]/10"
              >
                {showSensitiveData ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showSensitiveData ? "Hide" : "Show"} Sensitive Data
              </Button>
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-[#96cbc3]/20 rounded-xl">
                <Users className="h-8 w-8 text-[#434c9d]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-700">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-[#96cbc3]/20 rounded-xl">
                <UserCheck className="h-8 w-8 text-[#434c9d]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-700">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-[#96cbc3]/20 rounded-xl">
                <Shield className="h-8 w-8 text-[#434c9d]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Teens</p>
                <p className="text-2xl font-bold text-gray-700">{stats.teenUsers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-[#96cbc3]/20 rounded-xl">
                <Briefcase className="h-8 w-8 text-[#434c9d]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Total Services</p>
                <p className="text-2xl font-bold text-gray-700">{serviceStats.totalServices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-[#96cbc3]/20 rounded-xl">
                <Activity className="h-8 w-8 text-[#434c9d]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Active Services</p>
                <p className="text-2xl font-bold text-gray-700">{serviceStats.activeServices}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center">
              <div className="p-3 bg-[#96cbc3]/20 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-[#434c9d]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-600">Pending Users</p>
                <p className="text-2xl font-bold text-gray-700">{stats.pendingUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 border border-gray-100">
          <div className="p-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("users")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "users"
                    ? "bg-white text-[#434c9d] shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Users ({filteredUsers.length})
              </button>
              <button
                onClick={() => setActiveTab("services")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "services"
                    ? "bg-white text-[#434c9d] shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Briefcase className="w-4 h-4 inline mr-2" />
                Services ({filteredServices.length})
              </button>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-2xl shadow-lg mb-6 border border-gray-100">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder={activeTab === "users" ? "Search users..." : "Search services..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/80 border-[#96cbc3] focus:border-[#434c9d] text-gray-700 placeholder:text-slate-500"
                />
              </div>
              
              {activeTab === "users" ? (
                <>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-[#96cbc3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#434c9d] text-gray-700"
              >
                <option value="all">All Roles</option>
                <option value="teen">Teens</option>
                <option value="parent">Parents</option>
                <option value="admin">Admins</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-[#96cbc3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#434c9d] text-gray-700"
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
                    className="px-3 py-2 bg-white border border-[#96cbc3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#434c9d] text-gray-700"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={serviceCategoryFilter}
                    onChange={(e) => setServiceCategoryFilter(e.target.value)}
                    className="px-3 py-2 bg-white border border-[#96cbc3] rounded-md focus:outline-none focus:ring-2 focus:ring-[#434c9d] text-gray-700"
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
                className="flex items-center space-x-2 border-[#96cbc3] text-[#434c9d] hover:bg-[#96cbc3]/10"
              >
                <Filter className="h-4 w-4" />
                <span>Clear Filters</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-700">
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
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#434c9d] to-[#ff725a] flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-700">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-sm text-slate-600">
                            Age: {user.age || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span>{user.email}</span>
                        </div>
                        {showSensitiveData && user.phone && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{user.phone}</span>
                          </div>
                        )}
                        {showSensitiveData && user.parent_email && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">Parent: {user.parent_email}</span>
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
                      <div className="flex items-center space-x-1 text-sm text-slate-600">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {user.city && user.state ? `${user.city}, ${user.state}` : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-1 text-sm text-slate-600">
                        <Calendar className="h-4 w-4" />
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
                            className="border-red-400/50 text-red-300 hover:bg-red-500/20"
                          >
                            Suspend
                          </Button>
                        ) : user.status === 'suspended' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserStatus(user.id, 'active')}
                            className="border-green-400/50 text-green-300 hover:bg-green-500/20"
                          >
                            Activate
                          </Button>
                        ) : user.status === 'pending_verification' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserStatus(user.id, 'active')}
                            className="border-green-400/50 text-green-300 hover:bg-green-500/20"
                          >
                            Verify
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateUserStatus(user.id, 'active')}
                            className="border-blue-400/50 text-blue-300 hover:bg-blue-500/20"
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteUser(user.id)}
                          className="border-red-400/50 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : filteredServices.map((service) => (
                  <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-[#434c9d] to-[#ff725a] flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-white" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-700">
                            {service.title}
                          </div>
                          <div className="text-sm text-slate-600 max-w-xs truncate">
                            {service.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        <div className="font-medium">
                          {service.profiles.first_name} {service.profiles.last_name}
                        </div>
                        <div className="text-slate-600">{service.profiles.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                        {service.category.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        <div className="flex items-center space-x-1">
                          <DollarSign className="h-4 w-4 text-slate-400" />
                          <span>${service.price}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-slate-600">
                          <Clock className="h-4 w-4" />
                          <span>{service.duration} min</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge className={getServiceStatusColor(service.status)}>
                        {service.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-700">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>{service.total_bookings}</span>
                        </div>
                        {service.rating && (
                          <div className="flex items-center space-x-1 text-slate-600">
                            <Star className="h-4 w-4" />
                            <span>{service.rating.toFixed(1)}</span>
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
                            className="border-yellow-400/50 text-yellow-600 hover:bg-yellow-50"
                          >
                            Pause
                          </Button>
                        ) : service.status === 'paused' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateServiceStatus(service.id, 'active')}
                            className="border-green-400/50 text-green-600 hover:bg-green-50"
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateServiceStatus(service.id, 'active')}
                            className="border-green-400/50 text-green-600 hover:bg-green-50"
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteService(service.id)}
                          className="border-red-400/50 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
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
          <div className="text-center py-12">
            {activeTab === "users" ? (
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            ) : (
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
            )}
            <h3 className="mt-2 text-sm font-medium text-gray-700">
              No {activeTab} found
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
