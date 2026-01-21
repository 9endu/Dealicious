"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Shield, CheckCircle, Clock, Lock, QrCode } from "lucide-react";
import clsx from "clsx";
import api from "@/lib/api";
import CreativeLoader from "@/components/CreativeLoader";

interface Member {
    user_id: string;
    status: string;
}

interface Offer {
    id: string;
    title: string;
    price: number;
    offer_image?: string;
    verification_score: number;
}

interface Group {
    id: string;
    offer: Offer;
    target_size: number;
    current_size: number;
    status: string; // FORMING, LOCKED, FUNDED, DELIVERED
    receiver_id: string;
    members: Member[];
    // Mock fields for now as they aren't in backend yet
    otp?: string;
}

export default function GroupPage({ params }: { params: { id: string } }) {
    const [group, setGroup] = useState<Group | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [otpVisible, setOtpVisible] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [joinModalOpen, setJoinModalOpen] = useState(false);
    const [joinAddress, setJoinAddress] = useState({ street: "", city: "", state: "", pincode: "" });
    const [verifyOtp, setVerifyOtp] = useState("");
    const [verifyingMember, setVerifyingMember] = useState("");


    useEffect(() => {
        const uid = localStorage.getItem('user_id');
        setCurrentUserId(uid);
        fetchGroup();
    }, [params.id]);

    const fetchGroup = async () => {
        try {
            console.log("Fetching group:", params.id);
            const res = await api.get(`/groups/${params.id}`);
            console.log("Group Data:", res.data);
            setGroup(res.data);
        } catch (err) {
            console.error(err);
            setError("Failed to load group details.");
        } finally {
            setLoading(false);
        }
    };

    // Status Badge Logic
    const renderStatus = () => {
        if (!group) return null;
        if (group.status === 'FORMING') return <span className="text-yellow-500">Forming</span>;
        if (group.status === 'FUNDED') return <span className="text-blue-500">Ordered</span>;
        if (group.status === 'DELIVERED') return <span className="text-green-500">Arrived</span>;
        return <span className="text-gray-500">{group.status}</span>;
    };

    const handleJoinClick = () => {
        setJoinModalOpen(true);
    };

    const confirmJoin = async () => {
        if (!joinAddress.street || !joinAddress.city || !joinAddress.pincode || !joinAddress.state) {
            alert("Please enter full address including State");
            return;
        }

        // SIMULATED PAYMENT DEMO
        // No real Razorpay call to avoid config barriers

        if (!confirm(`Demo Payment: Pay ₹${((group!.offer.price / group!.target_size)).toFixed(2)}?`)) return;

        try {
            // Simulate Network Delay
            await new Promise(r => setTimeout(r, 1000));

            await api.post(`/groups/${group!.id}/join`, {
                payment_id: "demo_pay_" + Math.random().toString(36).substring(7),
                address_details: joinAddress
            });

            setJoinModalOpen(false);
            fetchGroup();
            alert("Payment Simulated & Joined Successfully!");

        } catch (e: any) {
            console.error(e);
            const msg = e.response?.data?.detail || e.message || "Unknown Error";
            alert("Join Failed: " + msg);
        }

    };


    // Receiver Actions
    const confirmOrder = async () => {
        if (!confirm("Have you placed the order? Funds will be locked.")) return;
        try {
            await api.post(`/groups/${group!.id}/confirm_order`);
            fetchGroup();
        } catch (e) { alert("Error confirming order"); }
    };

    const confirmArrival = async () => {
        if (!confirm("Has the package arrived? OTPs will be generated.")) return;
        try {
            await api.post(`/groups/${group!.id}/confirm_arrival`);
            fetchGroup();
        } catch (e) { alert("Error confirming arrival"); }
    };

    const verifyHandoff = async () => {
        try {
            await api.post(`/groups/${group!.id}/verify_handoff`, {
                otp: verifyOtp,
                member_id: verifyingMember
            });
            alert("Verified!");
            setVerifyingMember("");
            setVerifyOtp("");
            fetchGroup();
        } catch (e) { alert("Invalid OTP"); }
    }


    if (loading) return <CreativeLoader />;
    if (error || !group) return (
        <div className="min-h-screen flex items-center justify-center text-red-500">
            {error || "Group not found"}
        </div>
    );

    const isMember = group.members?.some(m => m.user_id === currentUserId) ?? false;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
            <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
            <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-md overflow-hidden">
                    {group.offer.offer_image && <img src={group.offer.offer_image} className="w-full h-full object-cover" />}
                </div>
                <h1 className="font-semibold text-sm line-clamp-1">{group.offer.title}</h1>
            </header>

            <main className="max-w-md mx-auto p-4 space-y-6">

                {/* Status Card */}
                <div className="bg-white dark:bg-paper rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-xs text-gray-400">Status</p>
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                {renderStatus()}
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400">Receiver</p>
                            <div className="font-medium flex items-center gap-1">
                                {/* Use receiver_id logic if we had user names, mocking 'Host' for now */}
                                Host <Shield className="w-3 h-3 text-green-500" />
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Funds Collected</span>
                            {/* Simple logic: joined / target */}
                            <span>{Math.round((group.current_size / group.target_size) * 100)}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-green-500 transition-all duration-1000`}
                                style={{ width: `${(group.current_size / group.target_size) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Area */}
                {group.status === 'FORMING' && !isMember && (
                    <div className="bg-white dark:bg-paper rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <h3 className="font-bold mb-2">Join Group Buy</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Pay ₹{(group.offer.price).toLocaleString()} to lock your slot.
                            Funds are held in Escrow.
                        </p>
                        <button
                            onClick={handleJoinClick}
                            className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-indigo-600 transition-colors"
                        >
                            Pay & Join
                        </button>
                    </div>
                )}

                {/* Join Modal */}
                {joinModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm space-y-4">
                            <h3 className="font-bold text-lg">Confirm Details</h3>
                            <div className="space-y-3">
                                <input className="w-full p-2 border rounded-lg dark:bg-slate-800" placeholder="Street Address"
                                    value={joinAddress.street} onChange={e => setJoinAddress({ ...joinAddress, street: e.target.value })} />
                                <div className="flex gap-2">
                                    <input className="w-full p-2 border rounded-lg dark:bg-slate-800" placeholder="City"
                                        value={joinAddress.city} onChange={e => setJoinAddress({ ...joinAddress, city: e.target.value })} />
                                    <input className="w-full p-2 border rounded-lg dark:bg-slate-800" placeholder="Pincode"
                                        value={joinAddress.pincode} onChange={e => setJoinAddress({ ...joinAddress, pincode: e.target.value })} />
                                </div>
                                <input className="w-full p-2 border rounded-lg dark:bg-slate-800" placeholder="State"
                                    value={joinAddress.state} onChange={e => setJoinAddress({ ...joinAddress, state: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setJoinModalOpen(false)} className="flex-1 py-2 text-gray-500">Cancel</button>
                                <button onClick={confirmJoin} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium">Proceed to Pay</button>
                            </div>
                        </div>
                    </div>
                )}


                {group.status === 'FORMING' && isMember && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
                        <h3 className="font-bold text-green-700 dark:text-green-400 mb-2">You have joined!</h3>
                        <p className="text-sm text-green-600 dark:text-green-300">
                            Waiting for {group.target_size - group.current_size} more people to join.
                        </p>
                    </div>
                )}

                {group.status === 'FUNDED' && (
                    <div className="bg-indigo-600 rounded-2xl p-6 text-white text-center shadow-lg shadow-indigo-500/20">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        <h3 className="font-bold text-lg">Waiting for Delivery</h3>
                        <p className="text-sm opacity-80 mb-4">
                            Receiver has placed the order. You will be notified when it arrives.
                        </p>
                        {/* Receiver Actions */}
                        {group.receiver_id === currentUserId && (
                            <div className="mt-4 space-y-3">
                                <button onClick={confirmOrder} className="w-full bg-white text-indigo-600 py-2 rounded-lg font-bold text-sm">
                                    I have Placed the Order
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {group.status === 'ORDERED' && group.receiver_id === currentUserId && (
                    <div className="bg-white dark:bg-paper rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <h3 className="font-bold">Order Verification</h3>
                        <p className="text-sm text-gray-500 mb-4">Confirm when package arrives at your location.</p>
                        <button onClick={confirmArrival} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold">
                            Package Received
                        </button>
                    </div>
                )}


                {/* OTP Section (Visible when Delivered) */}
                {group.status === 'DELIVERED' && (
                    <div className="bg-white dark:bg-paper rounded-2xl p-6 border border-gray-200 dark:border-gray-800 text-center">
                        <QrCode className="w-10 h-10 mx-auto text-gray-800 dark:text-gray-200 mb-3" />
                        <h3 className="font-bold">Delivery Code</h3>
                        <p className="text-xs text-gray-400 mb-4">Show this to host to collect your item.</p>

                        {otpVisible ? (
                            <div className="text-4xl font-mono font-bold tracking-widest text-primary">
                                {group.otp || "WAIT"}
                            </div>
                        ) : (
                            <button
                                onClick={() => setOtpVisible(true)}
                                className="bg-gray-100 dark:bg-gray-800 px-6 py-2 rounded-lg text-sm font-medium"
                            >
                                Reveal OTP
                            </button>
                        )}
                    </div>
                )}

                {/* Timeline / Members */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-500 uppercase">Members</h3>
                    {group.members?.map((m, i) => (
                        <div key={i} className="flex items-center justify-between bg-white dark:bg-paper p-3 rounded-xl border border-gray-50 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                    {/* Ideally fetch user name, using index or ID substring for now */}
                                    {m.user_id.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-medium text-sm">
                                    {m.user_id === currentUserId ? "You" : `User ${m.user_id.substring(0, 4)}`}
                                </span>
                            </div>
                            <span className={clsx("text-xs px-2 py-1 rounded",
                                m.status === 'PAID' || m.status === 'JOINED' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            )}>
                                {m.status}
                            </span>
                            {/* Receiver Verify OTP Input */}
                            {group.status === 'DELIVERED' && group.receiver_id === currentUserId && m.user_id !== currentUserId && m.status !== 'DELIVERED_CONFIRMED' && (
                                <div className="ml-2">
                                    {verifyingMember === m.user_id ? (
                                        <div className="flex gap-1">
                                            <input className="w-16 text-xs p-1 border rounded" placeholder="OTP"
                                                value={verifyOtp} onChange={e => setVerifyOtp(e.target.value)} />
                                            <button onClick={verifyHandoff} className="bg-green-500 text-white text-xs px-2 rounded">✓</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setVerifyingMember(m.user_id)} className="text-xs text-blue-500 underline">Verify</button>
                                    )}
                                </div>
                            )}

                        </div>
                    ))}
                </div>

            </main>
            <Navbar />
        </div>
    );
}
