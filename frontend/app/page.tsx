"use client";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Users, Zap } from "lucide-react";

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col">
            {/* Nav */}
            <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Dealicious
                </h1>
                <Link
                    href="/login"
                    className="text-sm font-medium hover:text-indigo-300 transition-colors"
                >
                    Login
                </Link>
            </nav>

            {/* Hero */}
            <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
                <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-1000">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Live across 50+ Colleges
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
                        Group Buying, <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                            Reimagined.
                        </span>
                    </h1>

                    <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        Join forces with students nearby to unlock wholesale prices on everything from electronics to sneakers. Secure, Verified, and Intelligent.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                        <Link
                            href="/signup"
                            className="bg-white text-slate-950 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                        >
                            Get Started
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link
                            href="/login"
                            className="bg-slate-800 text-white border border-slate-700 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-700 transition-all flex items-center justify-center"
                        >
                            Log In
                        </Link>
                    </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-24 max-w-6xl w-full px-4">
                    <FeatureCard
                        icon={<Users className="w-6 h-6 text-blue-400" />}
                        title="Crowd Power"
                        desc="Pool orders with neighbors to hit MOQs and slash prices."
                    />
                    <FeatureCard
                        icon={<ShieldCheck className="w-6 h-6 text-green-400" />}
                        title="AI Verified"
                        desc="Advanced fraud detection ensures every group member is legitimate."
                    />
                    <FeatureCard
                        icon={<Zap className="w-6 h-6 text-yellow-400" />}
                        title="Instant Savings"
                        desc="Deals unlock automatically when the group target is met."
                    />
                </div>
            </main>

            {/* Footer */}
            <footer className="py-8 text-center text-gray-500 text-sm">
                &copy; 2024 Dealicious. Built for Students.
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
    return (
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl text-left hover:bg-slate-800/50 transition-colors">
            <div className="mb-4 bg-slate-950/50 w-12 h-12 rounded-lg flex items-center justify-center border border-slate-800">
                {icon}
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
            <p className="text-gray-400 leading-relaxed">{desc}</p>
        </div>
    )
}
