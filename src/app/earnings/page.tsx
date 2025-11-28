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
} from "lucide-react";
import { useUser } from "@/hooks/useUser";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [refreshingAccount, setRefreshingAccount] = useState(false);

  // Check URL parameters for Stripe callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('stripe_error');
    const success = params.get('stripe_success');
    const code = params.get('code'); // OAuth code from Stripe
    const state = params.get('state'); // User ID from Stripe
    
    // Log all URL parameters for debugging
    console.log('Earnings page URL parameters:', {
      hasError: !!error,
      hasSuccess: !!success,
      hasCode: !!code,
      hasState: !!state,
      allParams: Object.fromEntries(params.entries())
    });
    
    // If we have code/state but no success/error, the callback might not have been called
    if (code && state && !success && !error) {
      console.warn('OAuth code received but callback may not have processed it');
      toast({
        title: "Processing Stripe Connection",
        description: "Please wait while we complete the connection...",
      });
      // The callback should have handled this, but if we're here, something went wrong
      setTimeout(() => {
        fetchAccountStatus(0, true);
      }, 2000);
    }
    
    if (error) {
      console.error('Stripe connection error from URL:', error);
      toast({
        title: "Stripe Connection Error",
        description: decodeURIComponent(error),
        variant: "destructive",
        duration: 10000,
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      // Refresh account status to see current state
      setTimeout(() => {
        fetchAccountStatus(0, true);
      }, 1000);
    }
    
    if (success === 'true') {
      console.log('Stripe connection success detected');
      toast({
        title: "Stripe Account Connected!",
        description: "Your payment account has been successfully set up.",
      });
      // Clean up URL and refresh account status with a small delay to ensure DB update is complete
      window.history.replaceState({}, '', window.location.pathname);
      // Wait a moment for the database update to propagate, then fetch with retries
      setTimeout(() => {
        fetchAccountStatus(0, true);
      }, 500);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && user) {
      // Log user ID for debugging
      console.log('🔍 Current User ID:', user.id);
      console.log('🔍 Debug URL:', `/api/stripe/connect/debug?userId=${user.id}`);
      
      fetchEarningsData();
      fetchAccountStatus();
      fetchWithdrawals();
    }
  }, [user, userLoading]);

  async function fetchEarningsData() {
    try {
      const res = await fetch("/api/earnings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEarningsStats(data.stats);
        }
      }
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccountStatus(retryCount = 0, showLoading = false) {
    if (showLoading) {
      setRefreshingAccount(true);
    }
    try {
      console.log(`Fetching account status (attempt ${retryCount + 1})...`);
      const res = await fetch("/api/stripe/connect/setup", { 
        method: 'GET',
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log("Account status response:", data);
        if (data.success) {
          setAccountStatus(data);
          setRefreshingAccount(false);
          console.log("Account status updated:", {
            hasAccount: data.hasAccount,
            accountId: data.accountStatus?.id
          });
          
          // Show message if account was cleared (invalid account)
          if (data.message) {
            toast({
              title: "Account Disconnected",
              description: data.message,
              variant: "default",
            });
          }
          
          return;
        } else {
          console.warn("Account status response not successful:", data);
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        console.error("Failed to fetch account status:", {
          status: res.status,
          statusText: res.statusText,
          error: errorData
        });
      }
      
      // If account not found and we haven't retried, wait a bit and retry (in case DB update is still propagating)
      if (retryCount < 3) {
        const delay = 1000 * (retryCount + 1); // Wait 1s, 2s, 3s
        console.log(`Retrying account status fetch in ${delay}ms...`);
        setTimeout(() => {
          fetchAccountStatus(retryCount + 1, false);
        }, delay);
      } else {
        console.error("Max retries reached for account status fetch");
        setRefreshingAccount(false);
      }
    } catch (error) {
      console.error("Error fetching account status:", error);
      // Retry on network errors
      if (retryCount < 3) {
        const delay = 1000 * (retryCount + 1);
        setTimeout(() => {
          fetchAccountStatus(retryCount + 1, false);
        }, delay);
      } else {
        setRefreshingAccount(false);
      }
    }
  }

  async function fetchWithdrawals() {
    try {
      const res = await fetch("/api/earnings/withdraw", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWithdrawals(data.withdrawals || []);
        }
      }
    } catch (error) {
      console.error("Error fetching withdrawals:", error);
    }
  }

  async function handleStripeConnectSetup() {
    try {
      const res = await fetch("/api/stripe/connect/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      // Get response text first to handle empty or malformed JSON
      const responseText = await res.text();
      console.log("Stripe Connect setup response:", {
        status: res.status,
        statusText: res.statusText,
        responseText: responseText.substring(0, 500)
      });

      if (!res.ok) {
        let err: any = {};
        try {
          err = JSON.parse(responseText);
        } catch (parseError) {
          // If JSON parsing fails, create a meaningful error
          err = {
            error: `Server returned ${res.status}: ${res.statusText}`,
            responseText: responseText || "Empty response"
          };
        }
        
        console.error("Stripe Connect setup error:", err);
        
        // Build detailed error message
        let errorMessage = err.error || "Failed to create payment account";
        
        // If there are details/instructions, include them
        if (err.details) {
          if (err.details.instructions && Array.isArray(err.details.instructions)) {
            errorMessage += "\n\n" + err.details.instructions.join("\n");
          }
          if (err.details.currentUrl) {
            errorMessage += `\n\nCurrent URL: ${err.details.currentUrl}`;
          }
          if (err.details.originalUrl) {
            errorMessage += `\nOriginal URL: ${err.details.originalUrl}`;
          }
        }
        
        // If account already exists, show different message
        if (err.error === "Stripe Connect account already exists" && err.accountId) {
          errorMessage = `You already have a Stripe Connect account linked. Account ID: ${err.accountId}`;
        }
        
        // If there are debug instructions, include them
        if (err.debug && err.debug.instructions) {
          errorMessage += "\n\n" + err.debug.instructions.join("\n");
        }
        
        throw new Error(errorMessage);
      }

      const data = JSON.parse(responseText);
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || "Failed to get authorization URL");
      }
    } catch (e: any) {
      console.error("Stripe Connect setup exception:", e);
      toast({
        title: "Could not set up payment account",
        description: e.message || "An unexpected error occurred",
        variant: "destructive",
        duration: 10000, // Show for 10 seconds to read longer messages
      });
    }
  }

  async function handleStripeConnectLogin() {
    try {
      const res = await fetch("/api/stripe/connect/setup", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.accountStatus?.loginUrl) {
          window.open(data.accountStatus.loginUrl, "_blank");
        } else {
          toast({
            title: "Account not ready",
            description: "Please complete your account setup first.",
            variant: "destructive",
          });
        }
      }
    } catch (e: any) {
      toast({
        title: "Could not access payment account",
        description: e.message,
        variant: "destructive",
      });
    }
  }

  async function handleWithdrawMoney() {
    setWithdrawing(true);
    try {
      const res = await fetch("/api/earnings/withdraw", {
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
          title: "Withdrawal successful",
          description: data.message || `$${data.amount.toFixed(2)} has been transferred to your account.`,
        });
        setWithdrawDialogOpen(false);
        // Refresh data
        fetchEarningsData();
        fetchWithdrawals();
      }
    } catch (e: any) {
      toast({
        title: "Could not withdraw money",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setWithdrawing(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 shadow-sm"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "processing":
        return <Badge className="bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 shadow-sm"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case "failed":
        return <Badge className="bg-gradient-to-r from-red-100 to-rose-100 text-red-700 shadow-sm"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge className="bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 shadow-sm">{status}</Badge>;
    }
  }

  if (userLoading || loading) {
    return (
      <DashboardLayout user={user}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-[#434c9d]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="p-6 max-w-7xl mx-auto bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[#434c9d] to-[#96cbc3] bg-clip-text text-transparent mb-3">
            Earnings & Account
          </h1>
          <p className="text-gray-500 text-lg">Manage your earnings, withdrawals, and payment account</p>
        </div>

        {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-blue-300" />
            </div>
            <p className="text-sm text-gray-500 mb-1 font-medium">Total Earned</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              ${earningsStats.totalEarned.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-50 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <Clock className="w-5 h-5 text-green-300" />
            </div>
            <p className="text-sm text-gray-500 mb-1 font-medium">This Week</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent">
              ${earningsStats.thisWeekEarned.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-50 rounded-xl">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <Clock className="w-5 h-5 text-purple-300" />
            </div>
            <p className="text-sm text-gray-500 mb-1 font-medium">This Month</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
              ${earningsStats.thisMonthEarned.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl">
                <Wallet className="w-6 h-6 text-orange-600" />
              </div>
              <Clock className="w-5 h-5 text-orange-300" />
            </div>
            <p className="text-sm text-gray-500 mb-1 font-medium">Pending</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent">
              ${earningsStats.pendingEarnings.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Payment Account Section */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Account</h2>
                <p className="text-sm text-gray-500">Manage your Stripe Connect account</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10 rounded-xl">
                <CreditCard className="w-8 h-8 text-[#434c9d]" />
              </div>
            </div>

            {!accountStatus?.hasAccount ? (
              <div className="space-y-5">
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Account Not Set Up</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Set up your payment account to receive withdrawals
                      </p>
                    </div>
                    {refreshingAccount && (
                      <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleStripeConnectSetup}
                    className="flex-1 bg-gradient-to-r from-[#434c9d] to-[#96cbc3] hover:from-[#434c9d]/90 hover:to-[#96cbc3]/90 text-white shadow-md hover:shadow-lg transition-all"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Set Up Payment Account
                  </Button>
                  <Button
                    onClick={() => fetchAccountStatus(0, true)}
                    variant="outline"
                    disabled={refreshingAccount}
                    className="px-4 shadow-sm hover:shadow-md transition-all"
                  >
                    {refreshingAccount ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : accountStatus.accountStatus ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Account Status</span>
                    {accountStatus.accountStatus.chargesEnabled && accountStatus.accountStatus.payoutsEnabled ? (
                      <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 shadow-sm">
                        <CheckCircle className="w-3 h-3 mr-1" />Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-700 shadow-sm">
                        <AlertCircle className="w-3 h-3 mr-1" />Setup Required
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Details Submitted</span>
                    {accountStatus.accountStatus.detailsSubmitted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Payouts Enabled</span>
                    {accountStatus.accountStatus.payoutsEnabled ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>

                {accountStatus.accountStatus.loginUrl && (
                  <Button
                    onClick={handleStripeConnectLogin}
                    variant="outline"
                    className="w-full shadow-sm hover:shadow-md transition-all"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage Account in Stripe
                  </Button>
                )}

                {!accountStatus.accountStatus.detailsSubmitted && (
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-blue-900 font-medium">
                      Complete your account setup to enable payouts
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Withdrawal Section */}
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Withdrawals</h2>
                <p className="text-sm text-gray-500">Withdraw your earnings</p>
              </div>
              <div className="p-3 bg-gradient-to-br from-green-100 to-emerald-100 rounded-xl">
                <Wallet className="w-8 h-8 text-green-600" />
              </div>
            </div>

            {earningsStats.pendingEarnings > 0 ? (
              <div className="space-y-5">
                <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 p-6 rounded-xl shadow-sm">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Available for Withdrawal
                  </p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    ${earningsStats.pendingEarnings.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Platform fee: 10% (${(earningsStats.pendingEarnings * 0.1).toFixed(2)})
                  </p>
                </div>

                <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                      disabled={!accountStatus?.hasAccount || !accountStatus?.accountStatus?.payoutsEnabled}
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Withdraw Money
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Withdrawal</DialogTitle>
                      <DialogDescription>
                        Withdraw your pending earnings to your connected bank account
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Total Earnings:</span>
                          <span className="font-medium">${earningsStats.pendingEarnings.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Platform Fee (10%):</span>
                          <span className="font-medium">-${(earningsStats.pendingEarnings * 0.1).toFixed(2)}</span>
                        </div>
                        <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between font-semibold">
                          <span className="text-gray-900">You'll Receive:</span>
                          <span className="text-green-600">
                            ${(earningsStats.pendingEarnings * 0.9).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 shadow-sm">
                        <p className="text-xs text-blue-900 font-medium">
                          Funds will be transferred to your connected bank account within 2-5 business days.
                        </p>
                      </div>
                      <Button
                        onClick={handleWithdrawMoney}
                        disabled={withdrawing}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        {withdrawing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <Wallet className="w-4 h-4 mr-2" />
                            Confirm Withdrawal
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {(!accountStatus?.hasAccount || !accountStatus?.accountStatus?.payoutsEnabled) && (
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 shadow-sm">
                    <p className="text-xs text-gray-700 font-medium">
                      {!accountStatus?.hasAccount
                        ? "Set up your payment account to withdraw money"
                        : "Complete your account setup to enable withdrawals"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 font-medium">No pending earnings available</p>
              </div>
            )}
          </div>
        </div>

        {/* Withdrawal History */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mt-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal History</h2>
              <p className="text-sm text-gray-500">View your past withdrawals</p>
            </div>
            <div className="p-3 bg-gradient-to-br from-[#434c9d]/10 to-[#96cbc3]/10 rounded-xl">
              <Building2 className="w-8 h-8 text-[#434c9d]" />
            </div>
          </div>

          {withdrawals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Date</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Amount</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Platform Fee</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Total Earnings</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Transfer ID</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal, index) => (
                    <tr 
                      key={withdrawal.id} 
                      className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100/50 transition-colors ${
                        index !== withdrawals.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <td className="py-4 px-4 text-sm text-gray-900 font-medium">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-4 text-sm font-semibold text-gray-900">
                        ${withdrawal.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        ${withdrawal.platform_fee.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        ${withdrawal.total_earnings.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {getStatusBadge(withdrawal.status)}
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-500 font-mono text-xs">
                        {withdrawal.stripe_transfer_id.substring(0, 20)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No withdrawal history yet</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

