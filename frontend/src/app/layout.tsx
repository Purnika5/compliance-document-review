import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "@/app/globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ChatbotWidget } from "@/components/ui/chatbot-widget";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Springer Capital | Institutional Compliance Document Review",
  description: "Enterprise compliance review, document uploading, verification, and audit trail platform",
};

/**
 * DOCU: Provides the shared HTML shell, Outfit typography, and metadata for the application.
 * Last Updated Date: September 21, 2026
 * @param children - Rendered route content.
 * @returns The root document layout.
 * @author Keith
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body
        className={`${outfit.className} min-h-screen bg-white text-[#183028] antialiased selection:bg-[#C5E86C] selection:text-[#183028] font-sans`}
        suppressHydrationWarning
      >
        {children}
        <ToastProvider />
        <ChatbotWidget />
      </body>
    </html>
  );
}
