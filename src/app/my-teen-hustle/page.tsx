
"use client";
import React, { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast"; 
import { cn } from "@/lib/utils";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Star,
  DollarSign,
  Calendar,
  MapPin,
  Clock,
  TrendingUp,
  Users,
  MessageCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";


export type Service = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  category: string;
  rating: number | null;
  total_bookings: number;
  status: "active" | "paused";
  banner_url: string | null;
  created_at: string;
  duration?: number;
  education?: string | null;
  qualifications?: string | null;
  address?: string | null;
  pricing_model?: "per_job" | "per_hour";
};

export type Booking = {
  id: string;
  service_id: string;
  status: string;
  requested_date: string;
  requested_time: string;
  duration: number;
  total_price: number;
  special_instructions: string;
  created_at: string;
  updated_at: string;
  service: {
    id: string;
    title: string;
    pricing_model: string;
    location: string;
    category: string;
  };
  customer_name?: string;
};


const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "paused":
      return "bg-yellow-100 text-yellow-800";
    case "pending":
      return "bg-gray-100 text-gray-800";
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

function ServiceCard({ service, onEdit, onDelete }: { service: Service; onEdit: (service: Service) => void; onDelete: (serviceId: string) => void }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex gap-4">
        {service.banner_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.banner_url}
            alt={service.title}
            className="w-36 h-24 object-cover rounded-lg border"
          />
        ) : (
          <div className="w-36 h-24 rounded-lg border bg-gray-50 flex items-center justify-center">
            <Star className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{service.title}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{service.description}</p>
            </div>
            <Badge className={getStatusColor(service.status)}>
              {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /><span className="font-semibold">${service.price}</span> <span className="text-xs text-gray-500">/{service.pricing_model === 'per_hour' ? 'hr' : 'job'}</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{service.location}</div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4" />{service.duration || 60} min</div>
            <div className="flex items-center gap-2"><Star className="w-4 h-4" />{service.rating ? `${service.rating}/5` : "—"}</div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4" />{service.total_bookings} bookings</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" />View</Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(service)}><Edit className="w-4 h-4 mr-1" />Edit</Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" onClick={() => onDelete(service.id)}><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:${minutes} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{booking.service.title}</h3>
          <p className="text-sm text-gray-600">
            {booking.customer_name ? `Requested by ${booking.customer_name}` : 'Customer request'}
          </p>
        </div>
        <Badge className={getStatusColor(booking.status)}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Badge>
      </div>
      {booking.special_instructions && (
        <p className="text-gray-700 mb-4">{booking.special_instructions}</p>
      )}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          {new Date(booking.requested_date).toLocaleDateString()} at {formatTime(booking.requested_time)}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <DollarSign className="w-4 h-4" />
          <span className="font-semibold">${booking.total_price}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          {booking.duration} minutes
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4" />
          {booking.service.location}
        </div>
      </div>
      <div className="flex gap-2">
        {booking.status === "pending" && (
          <>
            <Button size="sm" className="bg-green-600 hover:bg-green-700">Accept</Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">Decline</Button>
          </>
        )}
        {booking.status === "confirmed" && (
          <Button variant="outline" size="sm"><MessageCircle className="w-4 h-4 mr-1" />Message</Button>
        )}
        {booking.status === "completed" && (
          <Button variant="outline" size="sm">View Details</Button>
        )}
      </div>
    </div>
  );
}

export default function TeenHustlePage() {
  const { user, loading: userLoading, error: userError } = useUser();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Service dialog state
  const [open, setOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(10);
  const [location, setLocation] = useState("Online");
  const [category, setCategory] = useState("tutoring");
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [duration, setDuration] = useState<number>(60);
  const [education, setEducation] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [address, setAddress] = useState("");
  const [pricingModel, setPricingModel] = useState<"per_job" | "per_hour">("per_hour");


  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        // Fetch services via API
        const servicesRes = await fetch("/api/services", { cache: "no-store" });
        if (!servicesRes.ok) throw new Error("Failed to load services");
        const servicesData = await servicesRes.json();
        setServices(servicesData.services ?? []);

        // Fetch bookings via API
        const bookingsRes = await fetch("/api/bookings", { cache: "no-store" });
        if (!bookingsRes.ok) throw new Error("Failed to load bookings");
        const bookingsData = await bookingsRes.json();
        
        if (bookingsData.success) {
          // Combine incoming bookings (where user is provider) and my requests (where user is customer)
          const allBookings = [...(bookingsData.incoming || []), ...(bookingsData.myRequests || [])];
          setBookings(allBookings);
        } else {
          setBookings([]);
        }
      } catch (e: any) {
        toast({ title: "Load failed", description: e.message, variant: "destructive" });
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [toast]);

  const activeServices = services.filter((s) => s.status === "active");
  const pausedServices = services.filter((s) => s.status === "paused");
  
  // Separate bookings by type
  const [incomingBookings, setIncomingBookings] = useState<Booking[]>([]);
  const [myRequests, setMyRequests] = useState<Booking[]>([]);
  
  // Update booking arrays when bookings change
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const bookingsRes = await fetch("/api/bookings", { cache: "no-store" });
        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          if (bookingsData.success) {
            setIncomingBookings(bookingsData.incoming || []);
            setMyRequests(bookingsData.myRequests || []);
          }
        }
      } catch (e) {
        console.error("Failed to fetch bookings:", e);
      }
    };
    
    if (user) {
      fetchBookings();
    }
  }, [user]);

  // Show loading state while user data is being fetched
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error state if no user data
  if (!userLoading && (!user || userError)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">
            {userError === 'Profile not found. Please complete your profile setup.' 
              ? 'Please complete your profile setup to continue.'
              : 'Unable to load user data. Please try logging in again.'}
          </p>
          <Button 
            onClick={() => window.location.href = userError === 'Profile not found. Please complete your profile setup.' ? '/profile' : '/login'} 
            className="mt-4"
          >
            {userError === 'Profile not found. Please complete your profile setup.' ? 'Complete Profile' : 'Go to Login'}
          </Button>
        </div>
      </div>
    );
  }

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPrice(10);
    setLocation("Online");
    setCategory("tutoring");
    setStatus("active");
    setDuration(60);
    setEducation("");
    setQualifications("");
    setAddress("");
    setPricingModel("per_hour");
    setEditingService(null);
  };

  const openEditDialog = (service: Service) => {
    setEditingService(service);
    setTitle(service.title);
    setDescription(service.description);
    setPrice(service.price);
    setLocation(service.location);
    setCategory(service.category);
    setStatus(service.status);
    setDuration(service.duration || 60);
    setEducation(service.education || "");
    setQualifications(service.qualifications || "");
    setAddress(service.address || "");
    setPricingModel(service.pricing_model || "per_hour");
    setOpen(true);
  };

  async function handleCreateService() {
    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) throw new Error("You must be signed in to create a service.");

      const isEditing = editingService !== null;
      const url = "/api/services";
      const method = isEditing ? "PUT" : "POST";
      const body = isEditing 
        ? { 
            id: editingService.id, 
            title, 
            description, 
            price: Number(price), 
            location, 
            category, 
            status,
            duration: Number(duration),
            education: education.trim() || null,
            qualifications: qualifications.trim() || null,
            address: address.trim() || null,
            pricing_model: pricingModel
          }
        : { 
            title, 
            description, 
            price: Number(price), 
            location, 
            category, 
            status,
            duration: Number(duration),
            education: education.trim() || null,
            qualifications: qualifications.trim() || null,
            address: address.trim() || null,
            pricing_model: pricingModel
          };

      // Persist service via API (server validates & RLS protects)
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Failed to ${isEditing ? 'update' : 'create'} service`);
      }

      const { service } = await res.json();
      
      if (isEditing) {
        setServices((prev) => prev.map(s => s.id === service.id ? service : s));
        toast({ title: "Service updated", description: `"${service.title}" has been updated.` });
      } else {
        setServices((prev) => [service, ...prev]);
        toast({ title: "Service added", description: `"${service.title}" is now ${service.status}.` });
      }
      
      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast({ title: `Could not ${editingService ? 'update' : 'add'} service`, description: e.message, variant: "destructive" });
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!confirm("Are you sure you want to delete this service?")) return;
    
    try {
      const res = await fetch("/api/services", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: serviceId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to delete service");
      }

      setServices((prev) => prev.filter(s => s.id !== serviceId));
      toast({ title: "Service deleted", description: "The service has been removed." });
    } catch (e: any) {
      toast({ title: "Could not delete service", description: e.message, variant: "destructive" });
    }
  }

  return (
    <DashboardLayout user={user}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Teen Hustle</h1>
              <p className="text-gray-600">Manage your services, bookings, and earnings</p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="orange">
                  <Plus className="w-4 h-4 mr-2" /> Add New Service
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto mx-auto p-8">
                <DialogHeader className="text-center pb-6">
                  <DialogTitle className="text-2xl font-bold text-gray-800">{editingService ? 'Edit Service' : 'Add a Service'}</DialogTitle>
                  <p className="text-sm text-gray-600 mt-2">Fill in the details below to {editingService ? 'update your service' : 'create your new service'}</p>
                </DialogHeader>
                
                <div className="space-y-8">
                  {/* Basic Information Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title" className="text-sm font-medium">Service Title *</Label>
                        <Input 
                          id="title" 
                          value={title} 
                          onChange={(e) => setTitle(e.target.value)} 
                          placeholder="e.g., Math Tutoring" 
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Category *</Label>
                        <Select value={category} onValueChange={(v : any ) => setCategory(v)}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select a category" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tutoring">Tutoring</SelectItem>
                            <SelectItem value="pet_care">Pet Care</SelectItem>
                            <SelectItem value="lawn_care">Lawn Care</SelectItem>
                            <SelectItem value="cleaning">Cleaning</SelectItem>
                            <SelectItem value="tech_support">Tech Support</SelectItem>
                            <SelectItem value="delivery">Delivery</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
                      <Textarea 
                        id="description" 
                        value={description} 
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} 
                        placeholder="Describe what you offer, your experience, availability, and what makes you unique..." 
                        rows={3}
                        className="w-full resize-none"
                      />
                    </div>
                  </div>

                  {/* Pricing & Duration Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Pricing & Duration
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-medium">Price (USD) *</Label>
                        <Input 
                          id="price" 
                          type="number" 
                          min={0} 
                          value={price} 
                          onChange={(e) => setPrice(Number(e.target.value))} 
                          placeholder="25"
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Pricing Model *</Label>
                        <Select value={pricingModel} onValueChange={(v: any) => setPricingModel(v)}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_hour">Per Hour</SelectItem>
                            <SelectItem value="per_job">Per Job</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-sm font-medium">Duration (minutes) *</Label>
                        <Input 
                          id="duration" 
                          type="number" 
                          min={15} 
                          value={duration} 
                          onChange={(e) => setDuration(Number(e.target.value))} 
                          placeholder="60"
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Location & Status Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      Location & Status
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="location" className="text-sm font-medium">Location *</Label>
                        <Input 
                          id="location" 
                          value={location} 
                          onChange={(e) => setLocation(e.target.value)} 
                          placeholder="Online / Local Area / Address" 
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm font-medium">Specific Address (Optional)</Label>
                        <Input 
                          id="address" 
                          value={address} 
                          onChange={(e) => setAddress(e.target.value)} 
                          placeholder="123 Main St, City, State" 
                          className="w-full"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Status *</Label>
                      <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                        <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Background & Qualifications Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-300 pb-3 flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      Background & Qualifications
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="education" className="text-sm font-medium">Education/Background (Optional)</Label>
                        <Textarea 
                          id="education" 
                          value={education} 
                          onChange={(e) => setEducation(e.target.value)} 
                          placeholder="High school student, college courses, certifications..." 
                          rows={3}
                          className="w-full resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="qualifications" className="text-sm font-medium">Qualifications/Skills (Optional)</Label>
                        <Textarea 
                          id="qualifications" 
                          value={qualifications} 
                          onChange={(e) => setQualifications(e.target.value)} 
                          placeholder="Years of experience, special skills, certifications..." 
                          rows={3}
                          className="w-full resize-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                  <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }} className="px-6">
                    Cancel
                  </Button>
                  <Button onClick={handleCreateService} variant="orange" className="px-6">
                    {editingService ? 'Update Service' : 'Save Service'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><TrendingUp className="w-6 h-6 text-green-600" /></div>
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-2xl font-bold text-gray-900">$85</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center"><Calendar className="w-6 h-6 text-gray-600" /></div>
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">$320</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center"><DollarSign className="w-6 h-6 text-purple-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Total Earned</p>
                <p className="text-2xl font-bold text-gray-900">$1250</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center"><Clock className="w-6 h-6 text-yellow-600" /></div>
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">$45</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="services" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="services">My Services ({services.length})</TabsTrigger>
            <TabsTrigger value="incoming">Incoming ({incomingBookings.length})</TabsTrigger>
            <TabsTrigger value="my-requests">My Requests ({myRequests.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="services" className="mt-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">My Services</h2>
                <div className="flex gap-2">
                  <Badge variant="secondary">Active: {activeServices.length}</Badge>
                  <Badge variant="outline">Paused: {pausedServices.length}</Badge>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 bg-white rounded-xl border">Loading…</div>
              ) : services.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {services.map((s) => <ServiceCard key={s.id} service={s} onEdit={openEditDialog} onDelete={handleDeleteService} />)}  
                </div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Plus className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No services yet</h3>
                  <p className="text-gray-600 mb-4">Start your teen hustle by adding your first service</p>
                  <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Add Your First Service</Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="incoming" className="mt-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Incoming Bookings</h2>
                <p className="text-sm text-gray-600">Requests for your services</p>
              </div>
              {incomingBookings.length > 0 ? (
                <div className="space-y-4">{incomingBookings.map((b) => <BookingCard key={b.id} booking={b} />)}</div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No incoming bookings yet</h3>
                  <p className="text-gray-600">When customers book your services, they'll appear here</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my-requests" className="mt-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">My Requests</h2>
                <p className="text-sm text-gray-600">Services you've requested</p>
              </div>
              {myRequests.length > 0 ? (
                <div className="space-y-4">{myRequests.map((b) => <BookingCard key={b.id} booking={b} />)}</div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No requests yet</h3>
                  <p className="text-gray-600">When you book services from other providers, they'll appear here</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}