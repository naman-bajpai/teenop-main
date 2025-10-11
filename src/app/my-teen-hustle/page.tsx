
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
};

export type Booking = {
  id: string;
  service_id: string;
  service_title: string;
  customer_name: string;
  date: string; // ISO
  time_label: string; // e.g. "3:00 PM"
  status: "pending" | "confirmed" | "completed";
  price: number;
  message: string;
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

function ServiceCard({ service }: { service: Service }) {
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
            <div className="flex items-center gap-2"><DollarSign className="w-4 h-4" /><span className="font-semibold">${service.price}</span></div>
            <div className="flex items-center gap-2"><MapPin className="w-4 h-4" />{service.location}</div>
            <div className="flex items-center gap-2"><Star className="w-4 h-4" />{service.rating ? `${service.rating}/5` : "—"}</div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4" />{service.total_bookings} bookings</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" />View</Button>
            <Button variant="outline" size="sm"><Edit className="w-4 h-4 mr-1" />Edit</Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700"><Trash2 className="w-4 h-4 mr-1" />Delete</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: Booking }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{booking.service_title}</h3>
          <p className="text-sm text-gray-600">Requested by {booking.customer_name}</p>
        </div>
        <Badge className={getStatusColor(booking.status)}>
          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
        </Badge>
      </div>
      <p className="text-gray-700 mb-4">{booking.message}</p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="w-4 h-4" />{new Date(booking.date).toLocaleDateString()} at {booking.time_label}</div>
        <div className="flex items-center gap-2 text-sm text-gray-600"><DollarSign className="w-4 h-4" /><span className="font-semibold">${booking.price}</span></div>
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
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();
  const router = useRouter();

  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userLoading, setUserLoading] = useState(true);

  // Add Service dialog state
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number>(10);
  const [location, setLocation] = useState("Online");
  const [category, setCategory] = useState("tutoring");
  const [status, setStatus] = useState<"active" | "paused">("active");

  // Load user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          router.push('/login');
          return;
        }

        if (!session) {
          router.push('/login');
          return;
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          console.error('Profile error:', profileError);
          router.push('/login');
          return;
        }

        setUser(profile);
      } catch (error) {
        console.error('Error loading user:', error);
        router.push('/login');
      } finally {
        setUserLoading(false);
      }
    };

    loadUser();
  }, [supabase, router]);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // fetch services via API to avoid exposing RLS mistakes in client
        const res = await fetch("/api/services", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load services");
        const data = await res.json();
        setServices(data.services ?? []);

        // (Optional) fetch bookings (stubbed)
        setBookings([]);
      } catch (e: any) {
        toast({ title: "Load failed", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [toast]);

  const activeServices = services.filter((s) => s.status === "active");
  const pausedServices = services.filter((s) => s.status === "paused");

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
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Unable to load user data. Please try logging in again.</p>
          <Button 
            onClick={() => router.push('/login')} 
            className="mt-4"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  async function handleCreateService() {
    try {
      const userRes = await supabase.auth.getUser();
      const user = userRes.data.user;
      if (!user) throw new Error("You must be signed in to create a service.");

      // Persist service via API (server validates & RLS protects)
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          price: Number(price),
          location,
          category,
          status,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to create service");
      }

      const { service } = await res.json();
      setServices((prev) => [service, ...prev]);
      setOpen(false);
      setTitle(""); setDescription(""); setPrice(10); setLocation("Online"); setCategory("tutoring"); setStatus("active");
      toast({ title: "Service added", description: `“${service.title}” is now ${service.status}.` });
    } catch (e: any) {
      toast({ title: "Could not add service", description: e.message, variant: "destructive" });
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add a Service</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Math Tutoring" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} placeholder="What's included, your experience, availability…" rows={5} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="price">Price (USD)</Label>
                        <Input id="price" type="number" min={0} value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={(v : any ) => setCategory(v)}>
                          <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="tutoring">Tutoring</SelectItem>
                            <SelectItem value="pet_care">Pet Care</SelectItem>
                            <SelectItem value="delivery">Delivery</SelectItem>
                            <SelectItem value="yard_work">Yard Work</SelectItem>
                            <SelectItem value="tech_help">Tech Help</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Online / Local Area / Address" />
                      </div>
                      <div className="space-y-1">
                        <Label>Status</Label>
                        <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateService} variant="orange">Save Service</Button>
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services">My Services ({services.length})</TabsTrigger>
            <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
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
                  {services.map((s) => <ServiceCard key={s.id} service={s} />)}
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

          <TabsContent value="bookings" className="mt-6">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
              </div>
              {bookings.length > 0 ? (
                <div className="space-y-4">{bookings.map((b) => <BookingCard key={b.id} booking={b} />)}</div>
              ) : (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings yet</h3>
                  <p className="text-gray-600">Bookings for your services will appear here</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}