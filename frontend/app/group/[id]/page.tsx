"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Shield, CheckCircle, Clock, Lock, QrCode } from "lucide-react";
import clsx from "clsx";

// Mock Data
const MOCK_GROUP = {
    id: "1",
    title: "Sony WH-1000XM5",
    price: 19999,
    targetSize: 4,
    currentSize: 4,
    status: "FUNDED", // FORMING, LOCKED, FUNDED, DELIVERED
    myStatus: "PAID", // JOINED, PAID, DELIVERED
    otp: "8921",
    receiver: {
        name: "Rahul S.",
        trustScore: 92,
        dist: "0.5km away"
    },
    members: [
        { name: "You", status: "PAID" },
        { name: "Rahul S.", status: "PAID" },
        { name: "Amit K.", status: "PAID" },
        { name: "Sneha", status: "PAID" }
    ]
};

export default function GroupPage({ params }: { params: { id: string } }) {
    const [otpVisible, setOtpVisible] = useState(false);

    // Status Badge Logic
    const renderStatus = () => {
        if (MOCK_GROUP.status === 'FORMING') return <span className="text-yellow-500">Forming</span>;
        if (MOCK_GROUP.status === 'FUNDED') return <span className="text-blue-500">Ordered</span>;
        if (MOCK_GROUP.status === 'DELIVERED') return <span className="text-green-500">Arrived</span>;
    };

    const handlePayment = async () => {
        // 1. Create Order
        // In real implementation, this calls backend to get order_id
        // const res = await api.post(`/groups/${params.id}/pay`);
        // const { order_id, amount, currency } = res.data;

        // Mocking for now as we don't have a razorpay key in env
        const options = {
            key: "YOUR_RAZORPAY_KEY_ID", // Enter Key ID here
            amount: MOCK_GROUP.price * 100,
            currency: "INR",
            name: "Dealicious",
            description: "Payment for Group Buy",
            handler: function (response: any) {
                alert("Payment Successful: " + response.razorpay_payment_id);
                // Call backend to verify and update status
            },
            prefill: {
                name: "User Name",
                email: "user@example.com",
                contact: "9999999999"
            },
            theme: {
                color: "#6366f1"
            }
        };

        const rzp1 = new (window as any).Razorpay(options);
        rzp1.open();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 pb-24">
            <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
            <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-gray-800 px-4 h-14 flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-md"></div>
                <h1 className="font-semibold text-sm line-clamp-1">{MOCK_GROUP.title}</h1>
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
                                {MOCK_GROUP.receiver.name} <Shield className="w-3 h-3 text-green-500" />
                            </div>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Funds Collected</span>
                            <span>{MOCK_GROUP.status === 'FUNDED' ? '100%' : '50%'}</span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className={`h-full bg-green-500 transition-all duration-1000 ${MOCK_GROUP.status === 'FUNDED' ? 'w-full' : 'w-1/2'}`} />
                        </div>
                    </div>
                </div>

                {/* Action Area */}
                {MOCK_GROUP.status === 'FORMING' && (
                    <div className="bg-white dark:bg-paper rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                        <h3 className="font-bold mb-2">Pay your share</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Pay ₹{(MOCK_GROUP.price / MOCK_GROUP.targetSize).toLocaleString()} to lock your slot.
                            Funds are held in Escrow.
                        </p>
                        <button
                            onClick={handlePayment}
                            className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:bg-indigo-600 transition-colors"
                        >
                            Pay with Razorpay
                        </button>
                    </div>
                )}

                {MOCK_GROUP.status === 'FUNDED' && (
                    <div className="bg-indigo-600 rounded-2xl p-6 text-white text-center shadow-lg shadow-indigo-500/20">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-80" />
                        <h3 className="font-bold text-lg">Waiting for Delivery</h3>
                        <p className="text-sm opacity-80 mb-4">
                            Receiver has placed the order. You will be notified when it arrives.
                        </p>
                    </div>
                )}

                {/* OTP Section (Visible when Delivered) */}
                <div className="bg-white dark:bg-paper rounded-2xl p-6 border border-gray-200 dark:border-gray-800 text-center">
                    <QrCode className="w-10 h-10 mx-auto text-gray-800 dark:text-gray-200 mb-3" />
                    <h3 className="font-bold">Delivery Code</h3>
                    <p className="text-xs text-gray-400 mb-4">Show this to {MOCK_GROUP.receiver.name} to collect your item.</p>

                    {otpVisible ? (
                        <div className="text-4xl font-mono font-bold tracking-widest text-primary">
                            {MOCK_GROUP.otp}
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

                {/* Timeline / Members */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-sm text-gray-500 uppercase">Members</h3>
                    {MOCK_GROUP.members.map((m, i) => (
                        <div key={i} className="flex items-center justify-between bg-white dark:bg-paper p-3 rounded-xl border border-gray-50 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xs font-bold text-gray-600">
                                    {m.name[0]}
                                </div>
                                <span className="font-medium text-sm">{m.name}</span>
                            </div>
                            <span className={clsx("text-xs px-2 py-1 rounded",
                                m.status === 'PAID' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                            )}>
                                {m.status}
                            </span>
                        </div>
                    ))}
                </div>

            </main>
            <Navbar />
        </div>
    );
}
