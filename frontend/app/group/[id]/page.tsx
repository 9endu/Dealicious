"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { Shield, CheckCircle, Clock, Lock, QrCode, CreditCard, ShoppingBag } from "lucide-react";
import clsx from "clsx";
import api from "@/lib/api";
import CreativeLoader from "@/components/CreativeLoader";
import GroupChat from "@/components/GroupChat";

interface Member {
    user_id: string;
    full_name?: string;
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
        if (group.status === 'FORMING') return <span className="text-yellow-500 font-bold">Forming</span>;
        if (group.status === 'LOCKED') return <span className="text-orange-500 font-bold">Locked (Pay Now)</span>;
        if (group.status === 'FUNDED') return <span className="text-blue-500 font-bold">Ordered</span>;
        if (group.status === 'DELIVERED') return <span className="text-green-500 font-bold">Arrived</span>;
        if (group.status === 'COMPLETED') return <span className="text-gray-500 font-bold">Completed</span>;
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

        try {
            // Join first usually, then pay. 
            // Depending on backend logic, 'join' endpoint might require just address.
            // But let's assume we join first.
            await api.post(`/groups/${group!.id}/join`, {
                payment_id: "pending", // Payment is separate in new logic?
                address_details: joinAddress
            });

            setJoinModalOpen(false);
            fetchGroup();
            alert("Joined Successfully! Waiting for group to fill.");

        } catch (e: any) {
            console.error(e);
            const msg = e.response?.data?.detail || e.message || "Unknown Error";
            alert("Join Failed: " + msg);
        }
    };

    const handlePayment = async () => {
        // RAZORPAY DEMO
        const amount = (group!.offer.price / group!.target_size);

        const options = {
            key: "rzp_test_DIYFt...", // Dummy key
            amount: amount * 100,
            currency: "INR",
            name: "Dealicious Group Buy",
            description: `Share for ${group!.offer.title}`,
            image: "https://via.placeholder.com/150",
            handler: async function (response: any) {
                // On Success
                // alert(response.razorpay_payment_id);
                try {
                    await api.post(`/groups/${group!.id}/pay`);
                    fetchGroup();
                    alert("Payment Successful!");
                } catch (e) {
                    alert("Backend update failed");
                }
            },
            prefill: {
                name: "User",
                email: "user@example.com",
                contact: "9999999999"
            },
            theme: {
                color: "#4F46E5"
            }
        };

        // We can't really load Razorpay script easily in React without a wrapper or hook,
        // So for this demo we will just simulate the success call directly for the user 'click'.

        const userConfirmed = confirm(`[RAZORPAY DEMO]\n\nPay ₹${amount.toFixed(2)} securely via Razorpay?\n\n(Click OK to simulate success)`);

        if (userConfirmed) {
            try {
                await new Promise(r => setTimeout(r, 1500)); // Fake network
                await api.post(`/groups/${group!.id}/pay`);
                fetchGroup();
                alert("Payment Processed Successfully!");
            } catch (e: any) {
                alert("Payment Failed: " + (e.response?.data?.detail || "Unknown"));
            }
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
    // Current user member object
    const myMember = group.members?.find(m => m.user_id === currentUserId);
    const hasPaid = myMember?.status === 'PAID' || myMember?.status === 'DELIVERED' || myMember?.status === 'DELIVERED_CONFIRMED';

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
            <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 px-4 h-16 flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden border border-gray-200">
                    {group.offer.offer_image && <img src={group.offer.offer_image} className="w-full h-full object-cover" />}
                </div>
                <div>
                    <h1 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base line-clamp-1">{group.offer.title}</h1>
                    <p className="text-xs text-start text-gray-500 font-mono">ID: {group.id.substring(0, 6)}</p>
                </div>
            </header>

            <main className="max-w-2xl mx-auto p-4 space-y-6">

                {/* Status Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Status</p>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                {renderStatus()}
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Receiver</p>
                            <div className="font-medium flex items-center justify-end gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                                <Shield className="w-3.5 h-3.5" />
                                Host
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2 mb-2">
                        <div className="flex justify-between text-xs text-gray-500 font-medium">
                            <span>Funds Pool</span>
                            {/* Simple logic: joined / target */}
                            <span>{Math.round((group.current_size / group.target_size) * 100)}% Funded</span>
                        </div>
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out`}
                                style={{ width: `${(group.current_size / group.target_size) * 100}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Area */}

                {group.status === 'FORMING' && !isMember && (
                    <div className="bg-indigo-600 text-white rounded-3xl p-6 shadow-lg shadow-indigo-500/30 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="font-bold text-xl mb-1">Join this Group Buy</h3>
                            <p className="text-indigo-100 text-sm mb-6 max-w-xs">
                                Commit to buy at ₹{(group.offer.price).toLocaleString()} to unlock the deal.
                            </p>
                            <button
                                onClick={handleJoinClick}
                                className="w-full bg-white text-indigo-600 py-3.5 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center gap-2"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                Join Group
                            </button>
                        </div>
                    </div>
                )}

                {/* PAYMENT STAGE */}
                {group.status === 'LOCKED' && isMember && !hasPaid && (
                    <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-3xl p-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-orange-900 dark:text-orange-100">Payment Required</h3>
                                <p className="text-sm text-orange-700 dark:text-orange-300">Group is full. Please pay your share.</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-orange-100 dark:border-orange-900/50 mb-4">
                            <span className="text-gray-500 text-sm">Your Share</span>
                            <span className="font-bold text-lg">₹{(group.offer.price / group.target_size).toFixed(2)}</span>
                        </div>

                        <button
                            onClick={handlePayment}
                            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:scale-[1.02] transition-transform"
                        >
                            Pay via Razorpay
                        </button>
                    </div>
                )}

                {/* Join Modal */}
                {joinModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
                            <h3 className="font-bold text-xl text-center">Confirm Detail</h3>
                            <div className="space-y-3">
                                <input className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 ring-indigo-500 outline-none transition-all" placeholder="Street Address"
                                    value={joinAddress.street} onChange={e => setJoinAddress({ ...joinAddress, street: e.target.value })} />
                                <div className="flex gap-2">
                                    <input className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 ring-indigo-500 outline-none" placeholder="City"
                                        value={joinAddress.city} onChange={e => setJoinAddress({ ...joinAddress, city: e.target.value })} />
                                    <input className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 ring-indigo-500 outline-none" placeholder="Pincode"
                                        value={joinAddress.pincode} onChange={e => setJoinAddress({ ...joinAddress, pincode: e.target.value })} />
                                </div>
                                <input className="w-full p-3 bg-gray-50 dark:bg-slate-800 border-none rounded-xl focus:ring-2 ring-indigo-500 outline-none" placeholder="State"
                                    value={joinAddress.state} onChange={e => setJoinAddress({ ...joinAddress, state: e.target.value })} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setJoinModalOpen(false)} className="flex-1 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
                                <button onClick={confirmJoin} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30">Join Group</button>
                            </div>
                        </div>
                    </div>
                )}


                {group.status === 'FORMING' && isMember && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800 flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                            <h3 className="font-bold text-green-700 dark:text-green-400 text-sm">You have joined!</h3>
                            <p className="text-xs text-green-600 dark:text-green-300">
                                Waiting for {group.target_size - group.current_size} more people.
                            </p>
                        </div>
                    </div>
                )}

                {hasPaid && group.status !== 'DELIVERED' && group.status !== 'COMPLETED' && (
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800 flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                            <h3 className="font-bold text-green-700 dark:text-green-400 text-sm">Payment Confirmed</h3>
                            <p className="text-xs text-green-600 dark:text-green-300">
                                Funds are held in escrow until delivery.
                            </p>
                        </div>
                    </div>
                )}

                {group.status === 'FUNDED' && (
                    <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-6 text-white text-center shadow-lg shadow-indigo-500/20">
                        <Clock className="w-10 h-10 mx-auto mb-3 opacity-90" />
                        <h3 className="font-bold text-xl mb-1">Waiting for Delivery</h3>
                        <p className="text-indigo-100 text-sm mb-6 max-w-xs mx-auto">
                            Receiver is placing the order. You will be notified when it arrives.
                        </p>
                        {/* Receiver Actions */}
                        {group.receiver_id === currentUserId && (
                            <div className="mt-4">
                                <button onClick={confirmOrder} className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold shadow-md">
                                    I have Placed the Order
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {group.status === 'ORDERED' && group.receiver_id === currentUserId && (
                    <div className="bg-white dark:bg-paper rounded-2xl p-6 border-l-4 border-green-500 shadow-sm">
                        <h3 className="font-bold text-gray-900">Order Verification</h3>
                        <p className="text-sm text-gray-500 mb-4">Confirm when package arrives at your location.</p>
                        <button onClick={confirmArrival} className="w-full bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700">
                            Package Received
                        </button>
                    </div>
                )}


                {/* OTP Section (Visible when Delivered) */}
                {group.status === 'DELIVERED' && isMember && group.receiver_id !== currentUserId && (
                    <div className="bg-white dark:bg-paper rounded-2xl p-8 border border-gray-200 dark:border-gray-800 text-center shadow-sm">
                        <QrCode className="w-12 h-12 mx-auto text-gray-900 dark:text-gray-100 mb-4" />
                        <h3 className="font-bold text-xl">Your Delivery Code</h3>
                        <p className="text-sm text-gray-500 mb-6">Show this to the host to collect your share.</p>

                        {otpVisible ? (
                            <div className="text-5xl font-mono font-bold tracking-[0.2em] text-indigo-600 mb-2">
                                {group.otp || "8492"}
                            </div>
                        ) : (
                            <button
                                onClick={() => setOtpVisible(true)}
                                className="bg-gray-100 dark:bg-gray-800 px-8 py-3 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                                Tap to Reveal Code
                            </button>
                        )}
                    </div>
                )}

                {/* Chat Section */}
                {isMember && (
                    <div className="pt-4">
                        <GroupChat groupId={group.id} currentUserId={currentUserId || ""} isMember={isMember} />
                    </div>
                )}


                {/* Timeline / Members */}
                <div className="space-y-4 pt-6">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 uppercase tracking-wide">Group Members ({group.members?.length})</h3>
                    {group.members?.map((m, i) => (
                        <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br ${m.user_id === currentUserId ? 'from-indigo-100 to-blue-100 text-indigo-600' : 'from-gray-100 to-gray-200 text-gray-600'}`}>
                                    {m.user_id.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <span className="font-bold text-sm block text-gray-900 dark:text-gray-100">
                                        {m.user_id === currentUserId ? "You" : (m.full_name || `User ${m.user_id.substring(0, 4)}`)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                        Joined {new Date().toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <span className={clsx("text-xs px-2.5 py-1 rounded-full font-medium",
                                    m.status === 'PAID' || m.status === 'DELIVERED_CONFIRMED' ? "bg-green-50 text-green-700 border border-green-100" : "bg-gray-50 text-gray-500 border border-gray-100"
                                )}>
                                    {m.status}
                                </span>
                            </div>

                            {/* Receiver Verify OTP Input */}
                            {group.status === 'DELIVERED' && group.receiver_id === currentUserId && m.user_id !== currentUserId && m.status !== 'DELIVERED_CONFIRMED' && (
                                <div className="ml-2">
                                    {verifyingMember === m.user_id ? (
                                        <div className="flex gap-1 animate-in slide-in-from-right-5 fade-in">
                                            <input className="w-20 text-xs p-2 border rounded-lg outline-none focus:ring-1 bg-gray-50" placeholder="Enter OTP"
                                                value={verifyOtp} onChange={e => setVerifyOtp(e.target.value)} />
                                            <button onClick={verifyHandoff} className="bg-green-500 text-white text-xs px-3 rounded-lg font-bold shadow-md hover:bg-green-600">✓</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setVerifyingMember(m.user_id)} className="text-xs font-semibold text-indigo-600 hover:underline">Verify</button>
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
