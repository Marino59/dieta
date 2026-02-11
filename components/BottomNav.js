'use client';

import { usePathname, useRouter } from 'next/navigation';

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        {
            name: 'Dashboard',
            path: '/',
            icon: 'home',
            filled: pathname === '/'
        },
        {
            name: 'Ricette',
            path: '/ricette',
            icon: 'menu_book',
            filled: pathname === '/ricette'
        },
        {
            name: 'Premi',
            path: '/premi',
            icon: 'emoji_events',
            filled: pathname === '/premi'
        },
        {
            name: 'Impostazioni',
            path: '/profile',
            icon: 'settings',
            filled: pathname === '/profile'
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-background-dark/90 backdrop-blur-lg border-t border-border-light/30 dark:border-white/10 px-6 py-3 pb-8 flex justify-between items-center z-20 max-w-md mx-auto">
            {navItems.map((item) => (
                <button
                    key={item.path}
                    onClick={() => router.push(item.path)}
                    className={`flex flex-col items-center transition-colors ${item.filled ? 'text-primary' : 'text-text-secondary'
                        }`}
                >
                    <span
                        className="material-symbols-outlined"
                        style={{ fontVariationSettings: item.filled ? "'FILL' 1" : "'FILL' 0" }}
                    >
                        {item.icon}
                    </span>
                    <span className="text-[10px] font-medium mt-1">{item.name}</span>
                </button>
            ))}
        </div>
    );
}
