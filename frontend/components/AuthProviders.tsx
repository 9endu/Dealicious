"use client";
import React, { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import {
    RecaptchaVerifier,
    signInWithPhoneNumber,
    signInWithCustomToken
} from "firebase/auth";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Loader2, Phone, Mail } from "lucide-react";
import clsx from "clsx";

declare global {
    interface Window {
        recaptchaVerifier: any;
        confirmationResult: any;
    }
}

type AuthMode = "PHONE" | "EMAIL";

export default function AuthProviders() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState<AuthMode | null>(null);

    // Inputs
    const [inputValue, setInputValue] = useState(""); // Phone or Email
    const [otp, setOtp] = useState("");

    // State
    const [step, setStep] = useState<"INPUT" | "OTP">("INPUT");
    const [verificationId, setVerificationId] = useState(""); // For Phone Only

    // Cleanup
    useEffect(() => {
        setInputValue("");
        setOtp("");
        setStep("INPUT");
        setVerificationId("");
    }, [mode]);

    // Initialize Recaptcha for Phone
    useEffect(() => {
        if (!window.recaptchaVerifier && mode === "PHONE" && step === "INPUT") {
            try {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => { },
                    'expired-callback': () => { }
                });
            } catch (e) {
                console.error("Recaptcha Init Error", e);
            }
        }
    }, [mode, step]);

    const syncUser = async (user: any) => {
        try {
            const token = await user.getIdToken();
            const payload: any = {};
            if (user.email) payload.email = user.email;
            if (user.phoneNumber) payload.phone = user.phoneNumber;

            await api.post("/users/sync", payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            localStorage.setItem("token", token);
            localStorage.setItem("user_id", user.uid);
            router.push("/dashboard");
        } catch (error) {
            console.error("Sync Error:", error);
            router.push("/dashboard");
        }
    };

    // --- Phone Logic ---
    const sendPhoneOtp = async () => {
        setLoading(true);
        try {
            const appVerifier = window.recaptchaVerifier;
            const confirmationResult = await signInWithPhoneNumber(auth, inputValue, appVerifier);
            window.confirmationResult = confirmationResult;
            setVerificationId(confirmationResult.verificationId);
            setStep("OTP");
        } catch (error: any) {
            console.error(error);
            alert("SMS Failed: " + error.message);
            // Reset recaptcha if needed
            if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
        } finally {
            setLoading(false);
        }
    };

    const verifyPhoneOtp = async () => {
        setLoading(true);
        try {
            const result = await window.confirmationResult.confirm(otp);
            await syncUser(result.user);
        } catch (error: any) {
            console.error(error);
            alert("Invalid SMS OTP");
        } finally {
            setLoading(false);
        }
    };

    // --- Email Logic ---
    const sendEmailOtp = async () => {
        setLoading(true);
        try {
            await api.post("/auth/email/send", { email: inputValue });
            setStep("OTP");
            alert(`OTP sent to ${inputValue}`);
        } catch (error: any) {
            console.error(error);
            alert("Email Failed: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const verifyEmailOtp = async () => {
        setLoading(true);
        try {
            const res = await api.post("/auth/email/verify", { email: inputValue, otp });
            // Backend returns custom token
            const { token } = res.data;
            const userCredential = await signInWithCustomToken(auth, token);
            await syncUser(userCredential.user);
        } catch (error: any) {
            console.error(error);
            alert("Invalid Email OTP: " + (error.response?.data?.detail || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (!inputValue) return;
        if (mode === "PHONE") {
            step === "INPUT" ? sendPhoneOtp() : verifyPhoneOtp();
        } else {
            step === "INPUT" ? sendEmailOtp() : verifyEmailOtp();
        }
    };

    return (
        <div className="flex flex-col gap-4 mt-6">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-900 px-2 text-slate-400">Or continue with OTP</span>
                </div>
            </div>

            {/* Mode Selection */}
            {!mode && (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setMode("EMAIL")}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                    >
                        <Mail className="w-5 h-5 text-indigo-400" />
                        Email OTP
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode("PHONE")}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all"
                    >
                        <Phone className="w-5 h-5 text-indigo-400" />
                        Phone OTP
                    </button>
                </div>
            )}

            {/* Input Form */}
            {mode && (
                <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700 transition-all">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-sm font-semibold text-gray-300">
                            {mode === "PHONE" ? "Phone Authentication" : "Email Authentication"}
                        </h3>
                        <button
                            onClick={() => setMode(null)}
                            className="text-xs text-indigo-400 hover:underline"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>

                    {step === "INPUT" ? (
                        <>
                            <input
                                type={mode === "PHONE" ? "tel" : "email"}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder={mode === "PHONE" ? "+91 9876543210" : "name@example.com"}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                            {mode === "PHONE" && <div id="recaptcha-container"></div>}
                        </>
                    ) : (
                        <input
                            type="text"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-widest text-center text-lg"
                            placeholder="• • • • • •"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                        />
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className={clsx(
                            "w-full text-white font-medium py-2 rounded-lg transition-all",
                            loading ? "bg-slate-600 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500"
                        )}
                    >
                        {loading ? <Loader2 className="animate-spin md:mx-auto" /> : (
                            step === "INPUT" ? "Send Code" : "Verify & Sign In"
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}
