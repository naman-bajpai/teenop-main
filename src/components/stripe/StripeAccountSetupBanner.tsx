"use client";

import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowUpRight,
  CheckCircle,
  CreditCard,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StripeAccountSetupBannerProps = {
  loading?: boolean;
  hasAccount: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  onConnect: () => void;
  onManage: () => void;
  className?: string;
};

export function StripeAccountSetupBanner({
  loading = false,
  hasAccount,
  chargesEnabled = false,
  payoutsEnabled = false,
  onConnect,
  onManage,
  className,
}: StripeAccountSetupBannerProps) {
  const isFullyVerified = hasAccount && chargesEnabled && payoutsEnabled;

  return (
    <div
      className={cn(
        "w-full rounded-[28px] border border-[#2f3678]/30 bg-gradient-to-br from-[#eef0f8] via-white to-[#e8ebf6] p-6 sm:p-8 shadow-sm",
        className
      )}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#2f3678] flex items-center justify-center shrink-0 shadow-md shadow-[#2f3678]/25">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1e2454]">
                Stripe account {hasAccount ? "(connected)" : "(required)"}
              </h2>
              <p className="mt-1 text-sm font-semibold text-[#434c9d] leading-relaxed">
                Manage payouts and keep your account in good standing before listing services or withdrawing earnings.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2f3678]/40 bg-[#2f3678] px-4 py-3.5 shadow-sm">
            <p className="text-sm font-bold text-white leading-relaxed">
              Important: Please enter all required information in Stripe and allow your browser to show pop-ups.
              If you skip fields or block pop-ups, your account may be restricted and you may be unable to list services on TeenOp.
            </p>
          </div>

          {hasAccount && (
            <div>
              {isFullyVerified ? (
                <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Stripe verified — charges and payouts enabled
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-bold text-[#2f3678]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Stripe setup incomplete — finish all steps in Stripe
                </div>
              )}
            </div>
          )}

          {!hasAccount && (
            <ul className="text-xs sm:text-sm font-medium text-[#3d4578] space-y-2 list-disc pl-5">
              <li>For industry, choose the closest category to your service.</li>
              <li>
                For website, enter <span className="font-bold text-[#1e2454]">www.teenop.com</span>.
              </li>
              <li>Describe the services you will offer in the product description.</li>
              <li>After connecting your bank, select Manual Payouts in Stripe.</li>
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 shrink-0 w-full lg:w-auto lg:min-w-[240px]">
          {loading ? (
            <Button disabled className="h-12 rounded-2xl font-black w-full border-[#2f3678]/20">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking Stripe…
            </Button>
          ) : hasAccount ? (
            <Button
              onClick={onManage}
              className="h-12 rounded-2xl font-black w-full bg-[#2f3678] hover:bg-[#252d5c] text-white shadow-lg shadow-[#2f3678]/30"
            >
              Manage Stripe Account
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={onConnect}
              className="h-12 rounded-2xl font-black w-full bg-[#2f3678] hover:bg-[#252d5c] text-white shadow-lg shadow-[#2f3678]/30"
            >
              Connect with Stripe
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
