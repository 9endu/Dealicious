"use client";
import { useState, useEffect } from "react";
import { ShoppingBag, ShoppingCart, Tag, Gift, CreditCard, Truck } from "lucide-react";

const FACTS = [
    "The first online transaction was a Sting CD sold in 1994.",
    "Coupons were invented by Coca-Cola in 1887.",
    "Over 60% of people abandon their shopping carts due to shipping costs.",
    "Cyber Monday is the busiest online shopping day of the year.",
    "The most expensive domain name ever sold was Cars.com for $872 million.",
    "Amazon started as an online bookstore in a garage.",
    "90% of consumers read online reviews before visiting a business.",
    "The first credit card was issued by Diners Club in 1950.",
    "Free shipping is the #1 incentive for online shoppers.",
    "Mobile commerce accounts for over 70% of total ecommerce traffic."
];

const ICONS = [ShoppingBag, ShoppingCart, Tag, Gift, CreditCard, Truck];

export default function CreativeLoader({ fullScreen = false }: { fullScreen?: boolean }) {
    const [factIndex, setFactIndex] = useState(0);
    const [iconIndex, setIconIndex] = useState(0);

    useEffect(() => {
        const factInterval = setInterval(() => {
            setFactIndex((prev) => (prev + 1) % FACTS.length);
        }, 3000);

        const iconInterval = setInterval(() => {
            setIconIndex((prev) => (prev + 1) % ICONS.length);
        }, 1500);

        return () => {
            clearInterval(factInterval);
            clearInterval(iconInterval);
        };
    }, []);

    const CurrentIcon = ICONS[iconIndex];

    const containerClasses = fullScreen
        ? "fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-950/90 backdrop-blur-md"
        : "flex flex-col items-center justify-center py-20";

    return (
        <div className={containerClasses}>
            <div className="relative mb-8">
                {/* Pulsing Background */}
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />

                {/* Animated Icon */}
                <div className="relative bg-gradient-to-br from-primary to-indigo-600 p-5 rounded-2xl shadow-xl shadow-primary/30 animate-bounce-slight transition-all duration-500 transform">
                    <CurrentIcon className="w-10 h-10 text-white" />
                </div>
            </div>

            <div className="max-w-md text-center px-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent mb-2">
                    Finding the best deals...
                </h3>

                <div className="h-16 flex items-center justify-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium animate-fade-in key={factIndex}">
                        <span className="text-primary mr-2">Did you know?</span>
                        {FACTS[factIndex]}
                    </p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="w-48 h-1 bg-gray-200 dark:bg-gray-800 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-primary animate-progress-indeterminate" />
            </div>
        </div>
    );
}
