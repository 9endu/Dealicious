import { ShieldCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface OfferProps {
    id: string;
    title: string;
    price: number;
    image?: string;
    trustScore: number;
    currentSize: number;
    targetSize: number;
    platform: string;
}

export default function OfferCard({ offer }: { offer: OfferProps }) {
    const progress = (offer.currentSize / offer.targetSize) * 100;

    return (
        <div className="bg-white dark:bg-paper rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden mb-4">
            <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                {offer.image ? (
                    // In real app use Next/Image
                    <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">No Image</div>
                )}
                <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    {offer.trustScore > 80 ? (
                        <><ShieldCheck className="w-3 h-3 text-green-400" /> Verified</>
                    ) : (
                        <><AlertTriangle className="w-3 h-3 text-yellow-400" /> Review</>
                    )}
                </div>
                <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md">
                    {offer.platform}
                </div>
            </div>

            <div className="p-4">
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-2 leading-tight mb-2">
                    {offer.title}
                </h3>

                <div className="flex items-end justify-between mb-4">
                    <div>
                        <span className="text-2xl font-bold text-primary">₹{offer.price.toLocaleString()}</span>
                        <span className="text-sm text-gray-500 line-through ml-2">₹{(offer.price * 1.2).toFixed(0)}</span>
                    </div>
                    <div className="text-xs text-gray-500">per person</div>
                </div>

                <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-xs text-gray-400 uppercase font-medium tracking-wide">
                        <span>Group Progress</span>
                        <span>{offer.currentSize}/{offer.targetSize} Joined</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <Link href={`/group/${offer.id}`} className="block w-full text-center bg-gray-900 dark:bg-white dark:text-gray-900 text-white font-medium py-3 rounded-xl hover:opacity-90 transition-opacity">
                    Join Group Buy
                </Link>
            </div>
        </div>
    );
}
