"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import OfferCard from "@/components/OfferCard";
import api from "@/lib/api";
import CreativeLoader from "@/components/CreativeLoader";
import { Archive } from "lucide-react";

export default function MyGroupsPage() {
    const router = useRouter();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyGroups();
    }, []);

    const fetchMyGroups = async () => {
        try {
            // Using the endpoint checking user membership
            const res = await api.get("/groups/me/list");
            setGroups(res.data);
        } catch (error) {
            console.error("Failed to fetch my groups", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
            <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 px-4 h-14 flex items-center justify-center">
                <h1 className="text-lg font-bold">My Groups</h1>
            </header>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                {loading ? (
                    <CreativeLoader />
                ) : groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-4">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                            <Archive className="w-8 h-8 opacity-50" />
                        </div>
                        <p>You haven't joined any groups yet.</p>
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="text-indigo-600 font-semibold hover:underline"
                        >
                            Browse Deals
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {groups.map(group => (
                            <div key={group.id} onClick={() => router.push(`/group/${group.id}`)}>
                                {/* Reusing OfferCard but maybe we want a specific GroupCard? 
                                    OfferCard takes 'group' prop so it should work. 
                                    However, OfferCard usually links to /group/[id] anyway.
                                */}
                                <OfferCard group={group} />
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <Navbar />
        </div>
    );
}
