"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { User as UserIcon, CreditCard, ShieldCheck, Settings, LogOut, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

import { useAuth } from "@/context/AuthContext";

export default function ProfilePage() {
    const router = useRouter();
    const { logout, user: authUser, loading: authLoading } = useAuth();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // If auth is still loading, wait
        if (authLoading) return;

        // If no user in auth context, redirect to login
        if (!authUser && !localStorage.getItem('token')) {
            router.push("/login");
            return;
        }

        // If we have authUser from context, use it immediately for instant load
        if (authUser) {
            setUser(authUser);
            setLoading(false);
        }

        // We can still fetch latest to ensure freshness, or rely on Context refresh
        // For now, let's redundant fetch only if context missing or to refresh score
        const fetchUser = async () => {
            const userId = localStorage.getItem("user_id") || authUser?.id; // Note: authUser.id might correspond to 'uid' field depending on Data map
            // In AuthContext 'uid' is mapped? No, looking at auth.py it returns id=uid.
            // In AuthContext, UserData type has 'uid' but checks response from /users/{uid} which returns 'id'.
            // Let's use authUser.uid (mapped in Context type) or 'id' if response has it.
            // Check AuthContext.tsx type definition: type UserData = { uid: string ... }
            // But api /users/{uid} returns { id: ... } 

            // Actually, let's fix the variable name confusion.
            // Ideally we just use what context gives.

            // If we have authUser, we are good.
            if (authUser) return;

            // Fallback fetch if context is empty but token exists (edge case)
            if (userId) {
                try {
                    const res = await api.get(`/users/${userId}`);
                    setUser(res.data);
                } catch (error) {
                    console.error("Failed to fetch profile", error);
                } finally {
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        fetchUser();
    }, [router, authUser, authLoading]);

    const handleVerify = async (type: "email" | "phone") => {
        const otp = prompt(`Enter OTP sent to your ${type} (Simulated: Enter 1234):`);
        if (!otp) return;

        try {
            const res = await api.post("/users/verify", {
                user_id: user.id,
                type,
                otp
            });

            alert(`Verified! New Trust Score: ${res.data.new_trust_score}`);

            // Refresh user data
            const userRes = await api.get(`/users/${user.id}`);
            setUser(userRes.data);

        } catch (error: any) {
            alert(error.response?.data?.detail || "Verification failed");
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
            <main className="max-w-md mx-auto p-4 space-y-6">
                <div className="flex flex-col items-center py-8">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 p-1 mb-4">
                        <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 border-4 border-transparent overflow-hidden flex items-center justify-center text-3xl font-bold text-gray-700 dark:text-gray-200">
                            {(user?.full_name || user?.username || "M")?.[0]?.toUpperCase()}
                        </div>
                    </div>
                    {/* Show Full Name primarily */}
                    <h2 className="text-xl font-bold">{user?.full_name || "Member"}</h2>
                    {user?.username && <p className="text-sm text-gray-500">@{user.username}</p>}

                    <div className="flex items-center gap-1 text-green-500 font-medium text-sm mt-1">
                        <ShieldCheck className="w-4 h-4" /> Trust Score: {user?.trust_score}
                    </div>
                </div>

                {/* Verification Status */}
                <div className="bg-white dark:bg-paper rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-4">
                    <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider">Verification</h3>

                    {/* Phone */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${user?.is_phone_verified ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                                {user?.is_phone_verified ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-sm font-medium">Phone Number</p>
                                <p className="text-xs text-gray-500">{user?.phone}</p>
                            </div>
                        </div>
                        {!user?.is_phone_verified && (
                            <button
                                onClick={() => handleVerify("phone")}
                                className="text-xs font-bold text-primary bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100"
                            >
                                Verify (+20)
                            </button>
                        )}
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${user?.is_email_verified ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"}`}>
                                {user?.is_email_verified ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="text-sm font-medium">Email Address</p>
                                <p className="text-xs text-gray-500">{user?.email || "Not added"}</p>
                            </div>
                        </div>
                        {!user?.is_email_verified && user?.email && (
                            <button
                                onClick={() => handleVerify("email")}
                                className="text-xs font-bold text-primary bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100"
                            >
                                Verify (+10)
                            </button>
                        )}
                    </div>
                </div>

                {/* Wallet Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-2xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-xs mb-1">Wallet Balance</p>
                        <h3 className="text-3xl font-bold mb-4">₹ {user?.wallet?.balance || "0.0"}</h3>

                        <div className="flex gap-3">
                            <button className="flex-1 bg-white/20 hover:bg-white/30 transition-colors py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
                                Add Money
                            </button>
                            <button className="flex-1 bg-white/10 hover:bg-white/20 transition-colors py-2 rounded-lg text-sm font-medium backdrop-blur-sm">
                                Withdraw
                            </button>
                        </div>
                    </div>
                </div>

                {/* Menu */}
                <div className="bg-white dark:bg-paper rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
                    <MenuItem icon={UserIcon} label="Personal Details" />
                    <MenuItem icon={CreditCard} label="Payment Methods" />
                    <MenuItem icon={Settings} label="Settings" />
                    <MenuItem icon={LogOut} label="Log Out" className="text-red-500" onClick={handleLogout} />
                </div>
            </main>
            <Navbar />
        </div>
    );
}

function MenuItem({ icon: Icon, label, className = "", onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-left ${className}`}
        >
            <Icon className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-sm">{label}</span>
        </button>
    )
}
