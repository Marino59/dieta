'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { getWeightHistory, getDailyNutritionHistory } from '@/lib/firestore';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import WeightInput from '@/components/WeightInput';
import ProgressChart from '@/components/ProgressChart';

export default function ChartsPage() {
    const authContext = useAuth();
    const router = useRouter();
    const user = authContext?.user;
    const authLoading = authContext?.loading ?? true;

    const [chartData, setChartData] = useState([]);
    const [loading, setLoading] = useState(true);

    // Auth protection
    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [user, authLoading, router]);

    // Load chart data
    useEffect(() => {
        if (user) {
            loadChartData();
        }
    }, [user]);

    const loadChartData = async () => {
        try {
            setLoading(true);
            const [weights, nutrition] = await Promise.all([
                getWeightHistory(),
                getDailyNutritionHistory(30) // Last 30 days
            ]);

            // Merge data by date
            const dateMap = new Map();

            // Populate from Nutrition
            nutrition.forEach(n => {
                dateMap.set(n.date, { date: n.date, calories: n.calories });
            });

            // Populate/Merge Weight
            weights.forEach(w => {
                const dateStr = w.date.toISOString().split('T')[0];
                const existing = dateMap.get(dateStr) || { date: dateStr };
                dateMap.set(dateStr, { ...existing, weight: w.weight });
            });

            // Convert map to sorted array
            const merged = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
            setChartData(merged);
        } catch (error) {
            console.error("Failed to load chart data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-8 px-4 pt-6 max-w-2xl mx-auto bg-slate-900">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => router.push('/')}
                    className="h-10 w-10 glass-panel rounded-full flex items-center justify-center text-gray-400 hover:text-white transition"
                >
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-2xl font-bold text-white">Grafici e Progressi</h1>
            </div>

            <div className="space-y-8">
                {/* Progress Dashboard Section */}
                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2 px-2">
                        <TrendingUp size={20} className="text-purple-400" />
                        Andamento
                    </h2>

                    <WeightInput onWeightAdded={loadChartData} />

                    <div className="glass-panel p-4 rounded-3xl overflow-hidden">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 text-center">Peso vs Calorie (30gg)</h3>
                        <ProgressChart data={chartData} />
                    </div>
                </section>
            </div>
        </div>
    );
}
