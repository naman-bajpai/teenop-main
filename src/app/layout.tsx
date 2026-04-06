import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"
import PageTransition from "@/components/ui/page-transition";

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "TeenOp - Teen Services Platform",
  description: "A platform connecting teens with local services and opportunities",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} antialiased`}>
        <PageTransition>
          {children}
        </PageTransition>
        <Analytics />
      </body>
    </html>
  );
}
