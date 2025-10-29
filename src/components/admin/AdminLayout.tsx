"use client";

import { ReactNode } from "react";
import { Shield } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#96cbc3]/10 via-[#ff725a]/10 to-white flex flex-col">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-[#434c9d] to-[#ff725a] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">TeenOp Admin</h1>
                <p className="text-xs text-white/80">Administrative Portal</p>
              </div>
            </div>
            <div className="text-xs text-white/80">
              Secure Admin Access
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-gray-600">
              © 2024 TeenOp Admin Portal. All rights reserved.
            </div>
            <div className="text-xs text-gray-600">
              Secure • Encrypted • Monitored
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
