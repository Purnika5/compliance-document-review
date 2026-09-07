import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Springer Capital | Institutional Compliance Document Review",
  description: "Enterprise compliance review, document verification, and audit trail platform for Wealth Advisory",
};

/**
 * DOCU: Provides the shared HTML shell and metadata for the application.
 * Last Updated Date: September 3, 2026
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
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
