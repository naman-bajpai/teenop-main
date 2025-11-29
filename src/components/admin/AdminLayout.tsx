"use client";

import { ReactNode } from "react";
import { Shield } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-900 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Admin Portal</h1>
                <p className="text-xs text-gray-500">TeenOps Platform Management</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 font-medium">
              Secure Access
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {children}
      </div>

      {/* Admin Footer */}
      <div className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-500">
              © 2024 TeenOps. All rights reserved.
            </div>
            <div className="text-xs text-gray-500">
              Secure • Encrypted • Monitored
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
