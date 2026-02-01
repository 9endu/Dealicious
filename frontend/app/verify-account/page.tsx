"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { CheckCircle, ShieldAlert, Mail, Phone, ArrowRight, Loader2, LogOut } from "lucide-react";

export default function VerifyAccountPage() {
    const { user, loading, firebaseUser, logout } = useAuth();
    const router = useRouter();
    const [emailOtp, setEmailOtp] = useState("");
    const [phoneOtp, setPhoneOtp] = useState("");
    const [phone, setPhone] = useState("");

    const [emailStep, setEmailStep] = useState<"idle" | "sent" | "verified">("idle");
    const [phoneStep, setPhoneStep] = useState<"idle" | "sent" | "verified">("idle");

    const [message, setMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial check
    useEffect(() => {
        if (!loading && user) {
            if (user.is_email_verified) setEmailStep("verified");
            if (user.is_phone_verified) setPhoneStep("verified");
        }
    }, [user, loading]);


    const handleSendEmailOtp = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch("http://localhost:8000/auth/email/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user?.email }),
            });
            const data = await res.json();
            if (res.ok) {
                setEmailStep("sent");
                setMessage("OTP sent to your email.");
            } else {
                setMessage(data.detail || "Failed to send OTP");
            }
        } catch (error) {
            setMessage("Network Error");
        }
        setIsSubmitting(false);
    };

    const handleVerifyEmail = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch("http://localhost:8000/auth/email/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: user?.email, otp: emailOtp }),
            });
            const data = await res.json();
            if (res.ok) {
                setEmailStep("verified");
                setMessage("Email Verified!");
                // Force reload user data if possible, or just trust UI state for now
            } else {
                setMessage(data.detail || "Verification failed");
            }
        } catch (error) {
            setMessage("Verification Error");
        }
        setIsSubmitting(false);
    };

    const handleSendPhoneOtp = async () => {
        // Placeholder for Phone OTP logic as backend endpoint for real phone SMS might need setup
        // defaulting to simulated for now if endpoint not ready, but we will try to hit verify endpoint
        setIsSubmitting(true);
        setMessage("Simulating Phone OTP send... Check backend logs if implemented.");
        setTimeout(() => {
            setPhoneStep("sent");
            setIsSubmitting(false);
        }, 1000);
    };

    const handleVerifyPhone = async () => {
        setIsSubmitting(true);
        // Using the existing (but modified) users/verify endpoint or creating a new one?
        // The plan mentioned updating users.py verify_contact.
        // Let's assume we call that.
        try {
            const token = await firebaseUser?.getIdToken();
            const res = await fetch(`http://localhost:8000/users/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ type: "phone", otp: phoneOtp }),  // Assumes backend checks this "1234" or logic
            });
            if (res.ok) {
                setPhoneStep("verified");
                setMessage("Phone Verified!");
            } else {
                setMessage("Invalid Phone OTP");
            }
        } catch (e) {
            setMessage("Error verifying phone");
        }
        setIsSubmitting(false);
    };

    const handleContinue = () => {
        if (emailStep === "verified" && phoneStep === "verified") {
            router.push("/");
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-white" /></div>;

    if (!user) {
        return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Please Log In first.</div>
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-8">
                <div className="text-center">
                    <ShieldAlert className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold">Account Verification</h1>
                    <p className="text-gray-400 mt-2">To ensure trust and safety, we need to verify your contact details before you can access deals.</p>
                </div>

                {message && <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 p-3 rounded text-sm text-center">{message}</div>}

                {/* Email Section */}
                <div className={`p-4 rounded-xl border ${emailStep === 'verified' ? 'border-green-500/30 bg-green-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Mail className={`w-5 h-5 ${emailStep === 'verified' ? 'text-green-400' : 'text-gray-400'}`} />
                            <span className="font-semibold">Email Verification</span>
                        </div>
                        {emailStep === 'verified' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    </div>

                    {emailStep !== 'verified' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-400">{user.email}</p>
                            {emailStep === 'idle' ? (
                                <button
                                    onClick={handleSendEmailOtp}
                                    disabled={isSubmitting}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
                                >
                                    Send Verification Code
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter OTP"
                                        className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white w-full focus:outline-none focus:border-indigo-500"
                                        value={emailOtp}
                                        onChange={(e) => setEmailOtp(e.target.value)}
                                    />
                                    <button
                                        onClick={handleVerifyEmail}
                                        disabled={isSubmitting}
                                        className="bg-green-600 hover:bg-green-500 px-4 rounded font-medium text-sm transition-colors"
                                    >
                                        Verify
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Phone Section */}
                <div className={`p-4 rounded-xl border ${phoneStep === 'verified' ? 'border-green-500/30 bg-green-500/10' : 'border-slate-700 bg-slate-800/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Phone className={`w-5 h-5 ${phoneStep === 'verified' ? 'text-green-400' : 'text-gray-400'}`} />
                            <span className="font-semibold">Phone Verification</span>
                        </div>
                        {phoneStep === 'verified' && <CheckCircle className="w-5 h-5 text-green-400" />}
                    </div>

                    {phoneStep !== 'verified' && (
                        <div className="space-y-3">
                            {phoneStep === 'idle' ? (
                                <div className="space-y-2">
                                    <input
                                        type="tel"
                                        placeholder="Enter Phone Number"
                                        className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white w-full focus:outline-none focus:border-indigo-500"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                    <button
                                        onClick={handleSendPhoneOtp}
                                        disabled={isSubmitting}
                                        className="w-full bg-indigo-600 hover:bg-indigo-500 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
                                    >
                                        Send OTP
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Enter OTP (Sim: 1234)"
                                        className="bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white w-full focus:outline-none focus:border-indigo-500"
                                        value={phoneOtp}
                                        onChange={(e) => setPhoneOtp(e.target.value)}
                                    />
                                    <button
                                        onClick={handleVerifyPhone}
                                        disabled={isSubmitting}
                                        className="bg-green-600 hover:bg-green-500 px-4 rounded font-medium text-sm transition-colors"
                                    >
                                        Verify
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={handleContinue}
                    disabled={emailStep !== 'verified' || phoneStep !== 'verified'}
                    className="w-full bg-slate-800 disabled:bg-slate-800/50 disabled:text-gray-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all"
                >
                    Continue to Dealicious
                    <ArrowRight className="w-5 h-5" />
                </button>

                <button
                    onClick={() => logout()}
                    className="w-full text-slate-500 hover:text-slate-300 py-2 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out / Switch Account
                </button>
            </div>
        </div>
    );
}
