import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "LinkPulse — Serverless URL Shortener & Click Analytics",
  description:
    "Fast, serverless URL shortener with real-time click tracking, device analytics, and custom link lifetimes powered by FastAPI and Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col selection:bg-indigo-500 selection:text-white antialiased">
        <Navbar />
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          <p>
            LinkPulse &copy; 2026 &bull; Built with FastAPI, Next.js, and Supabase PostgreSQL.
          </p>
        </footer>
      </body>
    </html>
  );
}
