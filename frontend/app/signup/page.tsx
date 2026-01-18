"use client";
import React, { useState } from "react";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowRight } from "lucide-react";

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        full_name: "",
        email: "",
        phone: "",
        password: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, form.email, form.password);
            const user = userCredential.user;
            const token = await user.getIdToken();

            await api.post("/users/sync", {
                full_name: form.full_name,
                phone: form.phone,
                email: form.email
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            localStorage.setItem("token", token);
            localStorage.setItem("user_id", user.uid);
            router.push("/dashboard");

        } catch (error: any) {
            console.error(error);
            alert("Signup Failed: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-indigo-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px]" />
            </div>

            <div className="max-w-md w-full bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                        Dealicious
                    </h1>
                    <h2 className="text-xl font-semibold text-white">Create Account</h2>
                    <p className="text-gray-400 text-sm mt-1">Join the smart buying revolution</p>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                            placeholder="Full Name"
                            value={form.full_name}
                            onChange={e => setForm({ ...form, full_name: e.target.value })}
                        />
                        <input
                            type="email"
                            required
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                            placeholder="Email Address"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                        />
                        <input
                            type="text"
                            required
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                            placeholder="Phone Number"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                        />
                        <input
                            type="password"
                            required
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-white"
                            placeholder="Password"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-white text-slate-950 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <>Get Started <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                        Log In
                    </Link>
                </div>
            </div>
        </div>
    );
}
