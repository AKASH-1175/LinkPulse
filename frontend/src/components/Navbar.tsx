"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Zap, BarChart3, PlusCircle, Activity } from "lucide-react";
import { Suspense } from "react";

function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-2 sm:gap-3">
      <Link
        href="/"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          pathname === "/"
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <PlusCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Shorten</span>
      </Link>

      <Link
        href="/dashboard"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          pathname.startsWith("/dashboard")
            ? "bg-white/10 text-white"
            : "text-slate-400 hover:text-white hover:bg-white/5"
        }`}
      >
        <BarChart3 className="w-4 h-4" />
        <span>Dashboard</span>
      </Link>

      {/* Cloud Badge */}
      <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium ml-2">
        <Activity className="w-3.5 h-3.5 animate-pulse" />
        <span>Edge Ready</span>
      </div>
    </nav>
  );
}

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#090d16]/80 border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Link<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Pulse</span>
            <span className="text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Serverless
            </span>
          </span>
        </Link>

        {/* Navigation Items in Suspense boundary */}
        <Suspense fallback={<div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />}>
          <NavLinks />
        </Suspense>
      </div>
    </header>
  );
}
