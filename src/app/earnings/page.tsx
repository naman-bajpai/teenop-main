"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  CreditCard,
  Building2,
  ChevronRight,
  Info,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface EarningsStats {
  totalEarned: number;
  thisWeekEarned: number;
  thisMonthEarned: number;
  pendingEarnings: number;
}

interface StripeAccountStatus {
  hasAccount: boolean;
  accountStatus: {
    id: string;
    type?: 'express' | 'standard';
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    requirements: any;
    loginUrl: string | null;
  } | null;
}

interface Withdrawal {
  id: string;
  amount: number;
  platform_fee: number;
  total_earnings: number;
  status: string;
  stripe_transfer_id: string;
  created_at: string;
  processed_at: string | null;
  failure_reason: string | null;
}

export default function EarningsPage() {
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  const [earningsStats, setEarningsStats] = useState<EarningsStats>({
    totalEarned: 0,
    thisWeekEarned: 0,
    thisMonthEarned: 0,
    pendingEarnings: 0,
  });
  
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingAccount, setRefreshingAccount] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('stripe_error');
    const success = params.get('stripe_success');
    const code = params.get('code');
    const state = params.get('state');
    
    if (code && state && !success && !error) {
      toast({ title: "Processing Connection", description: "Please wait while we complete the connection..." });
      setTimeout(() => fetchAccountStatus(0, true), 2000);
    }
    
    if (error) {
      toast({ title: "Stripe Connection Error", description: decodeURIComponent(error), variant: "destructive", duration: 10000 });
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => fetchAccountStatus(0, true), 1000);
    }
    
    if (success === 'true') {
      toast({ title: "Account Connected!", description: "Your payment account has been successfully set up." });
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => fetchAccountStatus(0, true), 500);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && user) {
      fetchEarningsData();
      fetchAccountStatus();
      fetchWithdrawals();
      fetchWithdrawalRequests();
    }
  }, [user, userLoading]);

  async function fetchEarningsData(forceRefresh = false) {
    try {
      const fetchOptions = forceRefresh ? { cache: 'no-store' as RequestCache } : {};
      const res = await fetch("/api/earnings", fetchOptions);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setEarningsStats(data.stats);
      }
    } catch (error) { console.error("Error fetching earnings:", error); }
    finally { setLoading(false); }
  }

  async function fetchAccountStatus(retryCount = 0, showLoading = false, forceRefresh = false) {
    if (showLoading) setRefreshingAccount(true);
    try {
      const fetchOptions = forceRefresh ? { method: 'GET', cache: 'no-store' as RequestCache } : { method: 'GET' };
      const res = await fetch("/api/stripe/connect/setup", fetchOptions);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAccountStatus(data);
          setRefreshingAccount(false);
          if (data.message) toast({ title: "Account Disconnected", description: data.message });
          return;
        }
      }
      if (retryCount < 3) setTimeout(() => fetchAccountStatus(retryCount + 1, false, forceRefresh), 1000 * (retryCount + 1));
      else setRefreshingAccount(false);
    } catch (error) {
      if (retryCount < 3) setTimeout(() => fetchAccountStatus(retryCount + 1, false, forceRefresh), 1000 * (retryCount + 1));
      else setRefreshingAccount(false);
    }
  }

  async function fetchWithdrawals(forceRefresh = false) {
    try {
      const fetchOptions = forceRefresh ? { cache: 'no-store' as RequestCache } : {};
      const res = await fetch("/api/earnings/withdraw", fetchOptions);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setWithdrawals(data.withdrawals || []);
      }
    } catch (error) { console.error("Error fetching withdrawals:", error); }
  }

  async function handleStripeConnectSetup() {
    try {
      const res = await fetch("/api/stripe/connect/setup", { method: "POST", headers: { "Content-Type": "application/json" } });
      const responseText = await res.text();
      if (!res.ok) {
        let err: any = {};
        try { err = JSON.parse(responseText); } catch (e) { err = { error: `Server error: ${res.status}` }; }
        throw new Error(err.error || "Failed to create payment account");
      }
      const data = JSON.parse(responseText);
      if (data.success && data.authUrl) window.location.href = data.authUrl;
      else throw new Error(data.error || "Failed to get authorization URL");
    } catch (e: any) {
      toast({ title: "Setup Failed", description: e.message, variant: "destructive" });
    }
  }

  async function handleStripeConnectLogin() {
    try {
      const res = await fetch("/api/stripe/connect/setup", { cache: 'no-store' as RequestCache });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.accountStatus?.loginUrl) window.open(data.accountStatus.loginUrl, "_blank");
        else if (data.success && data.accountStatus?.type === 'standard') {
          toast({ title: "Standard Account", description: "Log in to Stripe Dashboard directly." });
          window.open("https://dashboard.stripe.com", "_blank");
        } else toast({ title: "Not Ready", description: "Please complete setup first.", variant: "destructive" });
      }
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  }

  async function fetchWithdrawalRequests(forceRefresh = false) {
    try {
      const fetchOptions = forceRefresh ? { cache: 'no-store' as RequestCache } : {};
      const res = await fetch("/api/withdrawal-requests", fetchOptions);
      if (res.ok) {
        const data = await res.json();
        if (data.success) setWithdrawalRequests(data.withdrawalRequests || []);
      }
    } catch (error) { console.error("Error fetching requests:", error); }
  }

  function getStatusBadge(status: string) {
    const s = status.toLowerCase();
    return (
      <Badge variant="outline" className={cn(
        "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-none",
        s === "completed" ? "bg-green-50 text-green-700" :
        s === "processing" ? "bg-blue-50 text-blue-700" :
        s === "failed" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700"
      )}>
        {status}
      </Badge>
    );
  }

  if (userLoading || loading) {
    return (
      <DashboardLayout user={user}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#434c9d] border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#434c9d]/10 rounded-xl"><Wallet className="w-5 h-5 text-[#434c9d]" /></div>
            <h1 className="page-title text-gray-900">Earnings & Payouts</h1>
          </div>
          <p className="text-gray-500 font-medium ml-12">Manage your revenue and track your transaction history.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm transition-all hover:shadow-md group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-green-50 rounded-2xl group-hover:bg-green-100 transition-colors"><DollarSign className="w-6 h-6 text-green-600" /></div>
                <TrendingUp className="w-5 h-5 text-gray-200" />
              </div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Balance</div>
              <div className="text-4xl font-black text-gray-900">${earningsStats.totalEarned.toFixed(2)}</div>
            </div>

            <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm transition-all hover:shadow-md group">
              <div className="flex items-center justify-between mb-6">
                <div className="p-3 bg-blue-50 rounded-2xl group-hover:bg-blue-100 transition-colors"><Clock className="w-6 h-6 text-blue-600" /></div>
                <div className="text-[10px] font-bold text-blue-400 bg-blue-50 px-2 py-1 rounded-full uppercase">Pending</div>
              </div>
              <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Incoming</div>
              <div className="text-4xl font-black text-gray-900">${earningsStats.pendingEarnings.toFixed(2)}</div>
            </div>

            <div className="bg-[#fafafa] rounded-[32px] p-6 border border-gray-100 sm:col-span-2">
              <div className="flex items-center gap-2 mb-4 text-[#434c9d]">
                <Info className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Quick Guide</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-gray-500 leading-relaxed">
                <p>1. Services are booked & paid by the buyer.</p>
                <p>2. Mark service as completed to trigger transfer.</p>
                <p>3. Funds arrive in Stripe within 1-2 days.</p>
                <p>4. Payout to your bank from the Stripe dashboard.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#434c9d]/5 rounded-full -mr-16 -mt-16" />
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-[#434c9d]" />
              Payout Account
            </h3>

            {!accountStatus?.hasAccount ? (
              <div className="space-y-6">
                <p className="text-sm text-gray-500 leading-relaxed">Connect your account to Stripe to enable payouts to your bank account.</p>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
                  <p className="text-sm text-amber-900 leading-relaxed">
                    If you are a teen, confirm that any bank account connected through Stripe is legally owned by your parent or guardian and that you have their permission to use it for TeenOp payouts.
                  </p>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    If you do not have a bank account in your own name, link a parent&apos;s or guardian&apos;s bank account instead so payouts are sent to an account that can be lawfully used for your earnings.
                  </p>
                </div>
                <Button onClick={handleStripeConnectSetup} className="w-full bg-[#434c9d] hover:bg-[#434c9d]/90 rounded-2xl h-14 font-bold shadow-lg shadow-[#434c9d]/20">
                  Connect Stripe
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
                  {accountStatus.accountStatus?.chargesEnabled && accountStatus.accountStatus?.payoutsEnabled ? (
                    <Badge className="bg-green-50 text-green-700 border-none px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Active</Badge>
                  ) : (
                    <Badge className="bg-yellow-50 text-yellow-700 border-none px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Action Req.</Badge>
                  )}
                </div>
                <Button variant="outline" onClick={handleStripeConnectLogin} className="w-full h-14 rounded-2xl border-2 border-gray-100 font-bold text-gray-700 hover:bg-gray-50 transition-all">
                  Go to Dashboard <ChevronRight className="w-4 h-4 ml-2 opacity-30" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-xl"><Building2 className="w-5 h-5 text-gray-500" /></div>
              Transaction History
            </h3>
          </div>

          <div className="overflow-x-auto">
            {(withdrawals.length > 0 || withdrawalRequests.length > 0) ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="py-4 px-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date</th>
                    <th className="py-4 px-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                    <th className="py-4 px-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Amount</th>
                    <th className="py-4 px-8 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {withdrawals.map((w) => (
                    <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-5 px-8 text-sm font-bold text-gray-900">{new Date(w.created_at).toLocaleDateString()}</td>
                      <td className="py-5 px-8 text-xs font-medium text-gray-500">Direct Transfer</td>
                      <td className="py-5 px-8 text-sm font-black text-gray-900 text-right">${w.amount.toFixed(2)}</td>
                      <td className="py-5 px-8">{getStatusBadge(w.status)}</td>
                    </tr>
                  ))}
                  {withdrawalRequests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-5 px-8 text-sm font-bold text-gray-900">{new Date(r.created_at).toLocaleDateString()}</td>
                      <td className="py-5 px-8 text-xs font-medium text-gray-500">Admin Request</td>
                      <td className="py-5 px-8 text-sm font-black text-gray-900 text-right">${(r.amount || 0).toFixed(2)}</td>
                      <td className="py-5 px-8">{getStatusBadge(r.status || 'pending')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-20 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto mb-4"><Clock className="w-8 h-8 text-gray-200" /></div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">No transactions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
