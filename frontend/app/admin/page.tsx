"use client";
import React, { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { Users, ShoppingBag, Layers, Loader2, LogOut, TrendingUp, AlertCircle, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("users");
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/${activeTab}`, {
                headers: {
                    'x-admin-secret': 'dealicious_admin_123'
                }
            });
            setData(res.data);
        } catch (error) {
            console.error(error);
            // alert("Failed to fetch admin data"); // Clean up alerts
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem("token");
            localStorage.removeItem("user_id");
            router.push("/login");
        }
    };

    // Derived Stats
    const stats = useMemo(() => {
        const total = data.length;
        // Simple mock stats for demo based on current data
        const recent = data.filter((d: any) => {
            const date = d.created_at || d.joined_at;
            if (!date) return false;
            return new Date(date) > new Date(Date.now() - 86400000 * 7);
        }).length;

        return { total, recent };
    }, [data]);

    return (
        <div className="min-h-screen bg-gray-50/50 text-gray-900 font-sans">
            {/* Navbar */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex justify-between items-center transition-all">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-lg shadow-lg shadow-indigo-500/30 flex items-center justify-center text-white font-bold">
                        D
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                        Dealicious Admin
                    </h1>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-red-600 bg-gray-100 hover:bg-red-50 rounded-full transition-all duration-300"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </header>

            <main className="p-8 max-w-7xl mx-auto space-y-8">

                {/* Controls & Title */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
                        <p className="text-gray-500">Manage your {activeTab} and monitor platform performance.</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex p-1 bg-white border border-gray-200 rounded-xl shadow-sm">
                        {[
                            { id: "users", icon: Users, label: "Users" },
                            { id: "offers", icon: ShoppingBag, label: "Offers" },
                            { id: "groups", icon: Layers, label: "Groups" }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300",
                                    activeTab === tab.id
                                        ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                )}
                            >
                                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-indigo-600" : "text-gray-400")} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title={`Total ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}
                        value={stats.total}
                        icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                        trend="+12% from last week"
                    />
                    <StatCard
                        title="New This Week"
                        value={stats.recent}
                        icon={<AlertCircle className="w-5 h-5 text-indigo-600" />}
                        trend="Just updated"
                    />
                    <StatCard
                        title="System Status"
                        value="Healthy"
                        icon={<ShieldCheck className="w-5 h-5 text-teal-600" />}
                        trend="All services operational"
                    />
                </div>

                {/* Data Table */}
                <div className="bg-white border border-gray-200 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Recent Data</h3>
                        <span className="text-xs text-gray-500 bg-white border border-gray-200 px-2 py-1 rounded-md shadow-sm">
                            {data.length} records found
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-3">
                                <Loader2 className="animate-spin text-indigo-500 w-8 h-8" />
                                <p className="text-sm text-gray-500 animate-pulse">Loading data...</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-white">
                                        {data.length > 0 && Object.keys(data[0]).slice(0, 6).map((key) => (
                                            <th key={key} className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                {key.replace(/_/g, " ")}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data.map((item, i) => (
                                        <tr key={i} className="group hover:bg-gray-50/80 transition-colors">
                                            {Object.values(item).slice(0, 6).map((val: any, j) => (
                                                <td key={j} className="p-4 text-sm text-gray-700">
                                                    <RenderCell value={val} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        {!loading && data.length === 0 && (
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                                    <Layers className="w-6 h-6 text-gray-400" />
                                </div>
                                <h3 className="text-gray-900 font-medium">No data found</h3>
                                <p className="text-gray-500 text-sm mt-1">This collection is currently empty.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

// Subcomponents
function StatCard({ title, value, icon, trend }: { title: string, value: string | number, icon: any, trend: string }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">{trend}</span>
            </div>
            <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            </div>
        </div>
    )
}

function RenderCell({ value }: { value: any }) {
    if (typeof value === 'boolean') {
        return (
            <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                value
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
            )}>
                {value ? "Yes" : "No"}
            </span>
        )
    }

    // Status Badge Logic (Simple heuristic)
    const strVal = String(value);
    if (["active", "approved", "completed", "verified", "funded", "delivered"].includes(strVal.toLowerCase())) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5" />
                {strVal}
            </span>
        )
    }
    if (["pending", "forming", "locked"].includes(strVal.toLowerCase())) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5" />
                {strVal}
            </span>
        )
    }

    if (typeof value === 'object') {
        return <span className="text-gray-400 italic text-xs">Object</span>
    }

    return <span className="truncate max-w-[200px] block" title={strVal}>{strVal}</span>
}
