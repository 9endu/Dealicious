"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User, Package } from "lucide-react";
import clsx from "clsx";

export default function Navbar() {
    const pathname = usePathname();

    const NavItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
        const isActive = pathname === href;
        return (
            <Link href={href} className="flex flex-col items-center justify-center w-full space-y-1">
                <Icon
                    className={clsx(
                        "w-6 h-6 transition-colors",
                        isActive ? "text-primary dark:text-primary" : "text-gray-500 dark:text-gray-400"
                    )}
                />
                <span className={clsx(
                    "text-xs font-medium",
                    isActive ? "text-primary dark:text-primary" : "text-gray-500 dark:text-gray-400"
                )}>
                    {label}
                </span>
            </Link>
        );
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe">
            <div className="flex items-center justify-around h-16 max-w-md mx-auto">
                <NavItem href="/dashboard" icon={Home} label="Feed" />
                <NavItem href="/post" icon={PlusCircle} label="Post" />
                <NavItem href="/groups" icon={Package} label="My Groups" />
                <NavItem href="/profile" icon={User} label="Profile" />
            </div>
        </nav>
    );
}
