import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Springer Capital | Institutional Compliance Document Review",
  description: "Enterprise compliance review, document verification, and audit trail platform for Wealth Advisory",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
