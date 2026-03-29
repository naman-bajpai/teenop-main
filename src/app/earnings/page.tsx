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
  ArrowUpRight,
  History,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
        "text-[10px] font-black uppercase tracking-widest px-2.5 py-1 border-none",
        s === "completed" ? "bg-emerald-50 text-emerald-700" :
        s === "processing" ? "bg-blue-50 text-blue-700" :
        s === "failed" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-600"
      )}>
        {status}
      </Badge>
    );
  }

  if (userLoading || loading) {
    return (
      <DashboardLayout user={user}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-900" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        {/* Header Section */}
        <div className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-4"
          >
            <div className="h-8 w-8 rounded-xl bg-slate-900 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Financial Hub</span>
          </motion.div>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-900">Earnings & Payouts</h1>
              <p className="mt-4 text-lg font-medium text-slate-500 max-w-2xl">
                Track your revenue, manage your Stripe connection, and monitor your transaction history in real-time.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Stats Area */}
          <div className="lg:col-span-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Total Balance Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-[40px] border border-slate-200 bg-white p-10 shadow-sm transition-all hover:shadow-md"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                      <TrendingUp className="w-3 h-3" />
                      Available
                    </div>
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Total Balance</p>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tight">
                    ${earningsStats.totalEarned.toFixed(2)}
                  </h2>
                </div>
              </motion.div>

              {/* Pending Balance Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="relative overflow-hidden rounded-[40px] border border-slate-200 bg-white p-10 shadow-sm transition-all hover:shadow-md"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-50" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-8">
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
                      Available
                    </div>
                  </div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Available to Withdraw</p>
                  <h2 className="text-5xl font-black text-slate-900 tracking-tight">
                    ${earningsStats.pendingEarnings.toFixed(2)}
                  </h2>
                </div>
              </motion.div>
            </div>

            {/* Transaction History Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-[40px] border border-slate-200 bg-white overflow-hidden shadow-sm"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                    <History className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-xl font-black text-slate-900">Transaction History</h3>
                </div>
              </div>

              <div className="overflow-x-auto">
                {(withdrawals.length > 0 || withdrawalRequests.length > 0) ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                        <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Description</th>
                        <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Amount</th>
                        <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {withdrawals.map((w) => (
                        <tr key={w.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="py-6 px-8 text-sm font-bold text-slate-900">{new Date(w.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td className="py-6 px-8">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-emerald-400" />
                              <span className="text-sm font-semibold text-slate-600">Stripe Transfer</span>
                            </div>
                          </td>
                          <td className="py-6 px-8 text-base font-black text-slate-900 text-right">${w.amount.toFixed(2)}</td>
                          <td className="py-6 px-8">{getStatusBadge(w.status)}</td>
                        </tr>
                      ))}
                      {withdrawalRequests.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/30 transition-colors group">
                          <td className="py-6 px-8 text-sm font-bold text-slate-900">{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                          <td className="py-6 px-8">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-blue-400" />
                              <span className="text-sm font-semibold text-slate-600">Withdrawal Request</span>
                            </div>
                          </td>
                          <td className="py-6 px-8 text-base font-black text-slate-900 text-right">${(r.amount || 0).toFixed(2)}</td>
                          <td className="py-6 px-8">{getStatusBadge(r.status || 'pending')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="py-24 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                      <Clock className="w-10 h-10 text-slate-200" />
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-300">No transactions recorded</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Sidebar Area */}
          <div className="lg:col-span-4 space-y-8">
            {/* Stripe Connection Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="rounded-[40px] border border-slate-200 bg-slate-900 p-8 text-white shadow-xl shadow-slate-900/10"
            >
              <div className="flex items-center gap-3 mb-8">
                <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-black">Payout Method</h3>
              </div>

              <p className="text-sm font-medium text-slate-400 leading-relaxed mb-8">
                Connect Stripe once, then approved withdrawals are transferred automatically to your payout account.
              </p>

              {!accountStatus?.hasAccount ? (
                <div className="space-y-6">
                  <Button 
                    onClick={handleStripeConnectSetup} 
                    className="w-full h-14 rounded-2xl bg-white text-slate-900 font-black hover:bg-slate-100 transition-all shadow-lg"
                  >
                    Connect with Stripe
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/10">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-500">Stripe Status</span>
                    {accountStatus.accountStatus?.chargesEnabled && accountStatus.accountStatus?.payoutsEnabled ? (
                      <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-amber-400">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Pending</span>
                      </div>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={handleStripeConnectLogin} 
                    className="w-full h-14 rounded-2xl border-2 border-white/10 bg-transparent font-black text-white hover:bg-white/5 transition-all"
                  >
                    Manage Stripe Account
                    <ExternalLink className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Help/Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[40px] border border-slate-200 bg-slate-50 p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                  <Info className="w-5 h-5 text-slate-400" />
                </div>
                <h3 className="text-lg font-black text-slate-900">How it works</h3>
              </div>
              
              <div className="space-y-6">
                {[
                  { step: "01", title: "Service Booked", desc: "Buyer pays for your service upfront." },
                  { step: "02", title: "Withdrawal Request", desc: "Request a payout once funds are available." },
                  { step: "03", title: "Admin Approval", desc: "Approved requests trigger an automatic Stripe transfer." },
                  { step: "04", title: "Bank Deposit", desc: "Stripe pays out to your connected bank account." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-xs font-black text-slate-300 mt-1">{item.step}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.title}</p>
                      <p className="text-xs font-medium text-slate-500 leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
