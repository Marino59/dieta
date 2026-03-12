'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const currentView = searchParams.get('view');
    const currentAction = searchParams.get('action');

    const navItems = [
        {
            name: 'HOME',
            path: '/',
            icon: 'home',
            bgActive: 'bg-indigo-600',
            bgInactive: 'bg-indigo-900/20',
            isActive: pathname === '/' && !currentView && !currentAction
        },
        {
            name: 'PESO',
            path: '/?view=weight',
            icon: 'trending_up',
            bgActive: 'bg-emerald-600',
            bgInactive: 'bg-emerald-900/20',
            isActive: currentView === 'weight'
        }
    ];
    return (
        <nav className="fixed bottom-0 left-0 right-0 h-44 bg-white dark:bg-[#0a0f0a]/90 backdrop-blur-3xl border-t-4 border-white/5 flex justify-around items-stretch z-50 shadow-[0_-20px_100px_rgba(0,0,0,0.5)]">
            {navItems.map((item) => (
                <button
                    key={item.name}
                    onClick={() => router.push(item.path)}
                    className={cn(
                        "relative flex-1 flex flex-col items-center justify-center transition-all active:scale-95 gap-1",
                        item.isActive ? "text-white" : "text-[#618961] dark:text-white/30 hover:text-white/50"
                    )}
                >
                    {item.isActive && (
                        <motion.div
                            layoutId="nav-active"
                            className={cn("absolute inset-0 z-0", item.bgActive)}
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                    )}
                    <span
                        className="relative z-10 material-symbols-outlined text-[6rem]"
                        style={{ fontVariationSettings: item.isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                        {item.icon}
                    </span>
                    <span className="relative z-10 text-4xl font-black tracking-tighter uppercase italic">{item.name}</span>
                </button>
            ))}
        </nav>
    );
}
