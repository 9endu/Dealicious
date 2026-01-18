"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import OfferCard from "@/components/OfferCard";
import api from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
    const router = useRouter();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [offers, setOffers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
        } else {
            setIsAuthorized(true);
            fetchOffers();
        }
    }, [router]);

    const fetchOffers = async () => {
        try {
            const res = await api.get("/offers/");
            setOffers(res.data);
        } catch (error) {
            console.error("Failed to fetch offers", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-4 h-14 flex items-center justify-between">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    Dealicious
                </h1>
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800" />
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">

                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                ) : offers.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <p>No active deals found.</p>
                        <p className="text-sm">Be the first to post!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {offers.map(offer => (
                            <OfferCard key={offer.id} offer={offer} />
                        ))}
                    </div>
                )}
            </main>

            <Navbar />
        </div>
    );
}
