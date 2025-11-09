"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

  // Check URL parameters for Stripe callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('stripe_error');
    const success = params.get('stripe_success');
    
    if (error) {
      toast({
        title: "Stripe Connection Error",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (success === 'true') {
      toast({
        title: "Stripe Account Connected!",
        description: "Your payment account has been successfully set up.",
      });
      // Clean up URL and refresh account status
      window.history.replaceState({}, '', window.location.pathname);
      fetchAccountStatus();
    }
  }, []);

  useEffect(() => {
    if (!userLoading && user) {
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

  async function fetchAccountStatus() {
    try {
      const res = await fetch("/api/stripe/connect/setup", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAccountStatus(data);
        }
      }
    } catch (error) {
      console.error("Error fetching account status:", error);
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

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || "Failed to create payment account");
      }

      const data = await res.json();
      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (e: any) {
      toast({
        title: "Could not set up payment account",
        description: e.message,
        variant: "destructive",
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
        return <Badge className="bg-green-100 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200"><Clock className="w-3 h-3 mr-1" />Processing</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Earnings & Account</h1>
          <p className="text-gray-600">Manage your earnings, withdrawals, and payment account</p>
        </div>

        {/* Earnings Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Total Earned</p>
            <p className="text-2xl font-bold text-gray-900">${earningsStats.totalEarned.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-1">This Week</p>
            <p className="text-2xl font-bold text-gray-900">${earningsStats.thisWeekEarned.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-1">This Month</p>
            <p className="text-2xl font-bold text-gray-900">${earningsStats.thisMonthEarned.toFixed(2)}</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Wallet className="w-6 h-6 text-orange-600" />
              </div>
              <Clock className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-gray-900">${earningsStats.pendingEarnings.toFixed(2)}</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Account Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Payment Account</h2>
                <p className="text-sm text-gray-600">Manage your Stripe Connect account</p>
              </div>
              <CreditCard className="w-8 h-8 text-gray-400" />
            </div>

            {!accountStatus?.hasAccount ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Account Not Set Up</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Set up your payment account to receive withdrawals
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleStripeConnectSetup}
                  className="w-full bg-gradient-to-r from-[#ff725a] to-[#434c9d] hover:from-[#ff725a]/90 hover:to-[#434c9d]/90"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Set Up Payment Account
                </Button>
              </div>
            ) : accountStatus.accountStatus ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Account Status</span>
                    {accountStatus.accountStatus.chargesEnabled && accountStatus.accountStatus.payoutsEnabled ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        <CheckCircle className="w-3 h-3 mr-1" />Active
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                        <AlertCircle className="w-3 h-3 mr-1" />Setup Required
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Details Submitted</span>
                    {accountStatus.accountStatus.detailsSubmitted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Payouts Enabled</span>
                    {accountStatus.accountStatus.payoutsEnabled ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </div>

                {accountStatus.accountStatus.loginUrl && (
                  <Button
                    onClick={handleStripeConnectLogin}
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage Account in Stripe
                  </Button>
                )}

                {!accountStatus.accountStatus.detailsSubmitted && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800">
                      Complete your account setup to enable payouts
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </Card>

          {/* Withdrawal Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Withdrawals</h2>
                <p className="text-sm text-gray-600">Withdraw your earnings</p>
              </div>
              <Wallet className="w-8 h-8 text-gray-400" />
            </div>

            {earningsStats.pendingEarnings > 0 ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    Available for Withdrawal
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${earningsStats.pendingEarnings.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Platform fee: 10% (${(earningsStats.pendingEarnings * 0.1).toFixed(2)})
                  </p>
                </div>

                <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
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
                        <div className="border-t pt-2 flex justify-between font-semibold">
                          <span>You'll Receive:</span>
                          <span className="text-green-600">
                            ${(earningsStats.pendingEarnings * 0.9).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                          Funds will be transferred to your connected bank account within 2-5 business days.
                        </p>
                      </div>
                      <Button
                        onClick={handleWithdrawMoney}
                        disabled={withdrawing}
                        className="w-full bg-green-600 hover:bg-green-700"
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
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                      {!accountStatus?.hasAccount
                        ? "Set up your payment account to withdraw money"
                        : "Complete your account setup to enable withdrawals"}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">No pending earnings available</p>
              </div>
            )}
          </Card>
        </div>

        {/* Withdrawal History */}
        <Card className="p-6 mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Withdrawal History</h2>
              <p className="text-sm text-gray-600">View your past withdrawals</p>
            </div>
            <Building2 className="w-8 h-8 text-gray-400" />
          </div>

          {withdrawals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Amount</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Platform Fee</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total Earnings</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Transfer ID</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">
                        ${withdrawal.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        ${withdrawal.platform_fee.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        ${withdrawal.total_earnings.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getStatusBadge(withdrawal.status)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500 font-mono text-xs">
                        {withdrawal.stripe_transfer_id.substring(0, 20)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No withdrawal history yet</p>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

