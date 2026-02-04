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
        <div className="hidden">
            {/* OTP Section Disabled per request (Login only via Email/Pass) */}
        </div>
    );
}
