"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { ShieldCheck, MapPin, Users, IndianRupee } from "lucide-react";
import CreativeLoader from "@/components/CreativeLoader";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function PostOffer() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        product_url: "",
        title: "",
        price: "",
        // location: "", // Replace simple string with structured
        street: "",
        city: "",
        state: "",
        pincode: "",
        target_size: "2"

    });
    // AI Match States
    const [matchData, setMatchData] = useState<any>(null); // { duplicate_of, similar_offers, created_id }
    const [showMatchModal, setShowMatchModal] = useState(false);

    const splitPrice = formData.price ? (parseFloat(formData.price) / parseInt(formData.target_size)).toFixed(0) : "0";

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // 1. Create Offer
            const offerRes = await api.post("/offers/", {
                product_url: formData.product_url,
                title: formData.title,
                price: parseFloat(formData.price),
                location: `${formData.street}, ${formData.city}`, // Fallback string
                address_details: {
                    street: formData.street,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.pincode
                }
            });


            // 2. Create Group

            // CHECK FOR AI MATCHES
            if (offerRes.data.duplicate_of || (offerRes.data.similar_offers && offerRes.data.similar_offers.length > 0)) {
                setMatchData({
                    duplicate_of: offerRes.data.duplicate_of,
                    matched_group_id: offerRes.data.matched_group_id,
                    similar_offers: offerRes.data.similar_offers,
                    created_id: offerRes.data.id,
                    matching_reason: offerRes.data.matching_reason
                });
                setShowMatchModal(true);
                return; // Stop here, let user decide in Modal
            }

            // 2. Create Group (If no match found, proceed normally)
            await api.post("/groups/", {
                offer_id: offerRes.data.id,
                target_size: parseInt(formData.target_size),
                address_details: {
                    street: formData.street,
                    city: formData.city,
                    state: formData.state,
                    pincode: formData.pincode
                }
            });

            const gid = offerRes.data.id; // Just redirecting to dashboard for now
            // Ideally we get the GROUP ID from group response, but waiting for that call
            // Since we returned early above, this flow is safe.

            router.push("/dashboard");
        } catch (e: any) {
            console.error(e);
            alert("Failed to create post: " + (e.response?.data?.detail || e.message));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
            <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 px-4 h-14 flex items-center justify-center">
                <h1 className="font-semibold text-lg">Post New Deal</h1>
            </header>

            <main className="max-w-md mx-auto p-4">
                {isLoading && <CreativeLoader fullScreen={true} />}
                <form onSubmit={handleCreate} className={isLoading ? "hidden" : "space-y-6"}>

                    {/* Product Link */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Product Link</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                required
                                placeholder="https://amazon.in/..."
                                className="flex-1 bg-white dark:bg-paper border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                value={formData.product_url}
                                onChange={(e) => setFormData({ ...formData, product_url: e.target.value })}
                            />
                            <button
                                type="button"
                                onClick={() => {
                                    if (!formData.product_url) {
                                        alert("Please enter a product URL first.");
                                        return;
                                    }
                                    window.open(`https://flash.co/${formData.product_url}`, '_blank');
                                }}
                                className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold px-4 py-3 rounded-xl hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors whitespace-nowrap"
                            >
                                Analyze Prices
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 ml-1">
                            Click analyze to compare prices on Flash.co before posting.
                        </p>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Deal Title</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Sony Headphones - Bulk Order"
                            className="w-full bg-white dark:bg-paper border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Total Price (₹)</label>
                            <div className="relative">
                                <IndianRupee className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    placeholder="Total Amount"
                                    className="w-full bg-white dark:bg-paper border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Group Size</label>
                            <div className="relative">
                                <Users className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                                <select
                                    className="w-full bg-white dark:bg-paper border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/50 appearance-none"
                                    value={formData.target_size}
                                    onChange={(e) => setFormData({ ...formData, target_size: e.target.value })}
                                >
                                    {[2, 3, 4, 5, 10].map(n => (
                                        <option key={n} value={n}>{n} People</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Address Fields */}
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Address for Delivery</label>

                        {/* Street */}
                        <div className="relative">
                            <MapPin className="w-4 h-4 absolute left-3 top-3.5 text-gray-400" />
                            <input
                                type="text"
                                required
                                placeholder="Street Address / Building"
                                className="w-full bg-white dark:bg-paper border border-gray-200 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                value={formData.street}
                                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                required
                                placeholder="City"
                                className="w-full bg-white dark:bg-paper border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                            />
                            <input
                                type="text"
                                required
                                placeholder="Pincode"
                                className="w-full bg-white dark:bg-paper border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                                value={formData.pincode}
                                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                            />
                        </div>

                        <input
                            type="text"
                            required
                            placeholder="State"
                            className="w-full bg-white dark:bg-paper border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary/50"
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        />
                    </div>


                    {/* Summary Card */}
                    {formData.price && (
                        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                            <div className="text-sm text-indigo-900 dark:text-indigo-200">
                                Per Person Cost
                            </div>
                            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                ₹{splitPrice}
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary text-white font-semibold py-4 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.98] flex justify-center"
                    >
                        Post Deal
                    </button>

                    <div className="text-center text-xs text-gray-400 px-8">
                        <span className="flex items-center justify-center gap-1 mb-1">
                            <ShieldCheck className="w-3 h-3" /> Manually Verified
                        </span>
                        By posting, you agree to organize the order for the group.
                    </div>
                </form>
            </main>

            <Navbar />

            {/* Match Modal */}
            {showMatchModal && matchData && (
                <MatchModal
                    data={matchData}
                    onClose={() => setShowMatchModal(false)}
                    onJoin={async (offerId: string) => {
                        // User chose to join existing offer

                        // 1. Delete the duplicate they just created (optional cleanup)
                        try {
                            // api.delete(`/offers/${matchData.created_id}`); 
                        } catch (e) { }

                        // 2. Redirect to that offer/group
                        if (matchData.matched_group_id && matchData.duplicate_of === offerId) {
                            router.push(`/group/${matchData.matched_group_id}`);
                            return;
                        }

                        // Check similar offers
                        const sim = matchData.similar_offers?.find((o: any) => o.id === offerId);
                        if (sim && sim.group_id) {
                            router.push(`/group/${sim.group_id}`);
                            return;
                        }

                        // Fallback
                        router.push("/dashboard");
                    }}
                    onContinue={async () => {
                        // User ignored warning, create group anyway
                        try {
                            await api.post("/groups/", {
                                offer_id: matchData.created_id,
                                target_size: parseInt(formData.target_size),
                                address_details: {
                                    street: formData.street,
                                    city: formData.city,
                                    state: formData.state,
                                    pincode: formData.pincode
                                }
                            });
                            router.push("/dashboard");
                        } catch (e) {
                            alert("Failed to create group");
                        }
                    }}
                />
            )}
        </div>
    );
}

function MatchModal({ data, onClose, onJoin, onContinue }: any) {
    const isDuplicate = !!data.duplicate_of;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-4 mx-auto">
                        <Users className="w-6 h-6 text-indigo-600" />
                    </div>

                    <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
                        {isDuplicate ? "Duplicate Deal Found!" : "Similar Deal Found"}
                    </h3>

                    <p className="text-sm text-center text-gray-500 mb-6">
                        {isDuplicate
                            ? "This exact product is already being bought by a group. Joining them is faster/cheaper!"
                            : "We found a similar active group. Did you mean this?"}
                    </p>

                    {/* Similar/Duplicate Item Card */}
                    {data.similar_offers?.slice(0, 1).map((offer: any) => (
                        <div key={offer.id} className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl mb-6 border border-gray-100 dark:border-gray-700">
                            <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{offer.title}</p>
                            <p className="text-xs text-gray-500 mt-1">Match Score: {(offer.score * 100).toFixed(0)}%</p>
                        </div>
                    ))}
                    {isDuplicate && (
                        <div className="bg-red-50 p-2 rounded text-xs text-red-600 mb-4 text-center">
                            Reason: {data.matching_reason}
                        </div>
                    )}

                    <div className="space-y-3">
                        <button
                            onClick={() => onJoin(data.duplicate_of || data.similar_offers[0].id)}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
                        >
                            Yes, Join Existing Group
                        </button>

                        <button
                            onClick={onContinue}
                            className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                        >
                            No, Create My Own
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
