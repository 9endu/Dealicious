"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";

type UserData = {
    uid: string;
    email: string | null;
    phone: string | null;
    full_name: string | null;

    // Verification Flags
    is_email_verified: boolean;
    is_phone_verified: boolean;

    trust_score: number;
    kyc_level: string;

    // ... other fields
};

type AuthContextType = {
    user: UserData | null;
    loading: boolean;
    firebaseUser: FirebaseUser | null;
    refreshUser: () => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    firebaseUser: null,
    refreshUser: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserData | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    const fetchUserData = async (uid: string, token: string) => {
        try {
            // We call /users/me or /users/{uid}
            // But we need to make sure the user doc exists.
            // If just signed up, maybe sync runs first?
            // Let's rely on /users/me which reads from token or db
            const res = await api.get(`/users/${uid}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(res.data);
        } catch (error) {
            console.error("Error fetching user data", error);
        }
    };

    const refreshUser = async () => {
        if (auth.currentUser) {
            const token = await auth.currentUser.getIdToken(true); // Force refresh
            await fetchUserData(auth.currentUser.uid, token);
        }
    }

    const logout = async () => {
        try {
            await auth.signOut();
            setUser(null);
            setFirebaseUser(null);
            router.push("/login"); // or "/"
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setFirebaseUser(currentUser);
            if (currentUser) {
                const token = await currentUser.getIdToken();
                await fetchUserData(currentUser.uid, token);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Protection Logic
    useEffect(() => {
        if (loading) return;

        const publicPaths = ["/", "/login", "/signup", "/verify-account"];

        // If user is logged in
        if (user) {
            // Check verification
            if (!user.is_email_verified || !user.is_phone_verified) {
                if (pathname !== "/verify-account") {
                    router.push("/verify-account");
                }
            } else {
                // If Verified, prevent access to /verify-account?
                if (pathname === "/verify-account") {
                    router.push("/dashboard");
                    // Or "/" if dashboard not main? User said "home deals page". 
                    // Assuming "/" is landing, dashboard is deals? 
                    // Or "/" BECOMES deals if logged in?
                    // Plan said: "then only can he go to the main home deals page"
                }
            }
        }
        // If NOT logged in, restrict access to protected pages
        else if (!loading && !user) {
            if (!publicPaths.includes(pathname)) {
                // router.push("/login"); // Optional: Enforce login for everything else
                // For now, let's stick to the verification requirement.
            }
        }

    }, [user, loading, pathname, router]);


    return (
        <AuthContext.Provider value={{ user, loading, firebaseUser, refreshUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
