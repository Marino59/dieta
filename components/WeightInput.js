'use client';

import { useState } from 'react';
import { addWeightLog } from '@/lib/firestore';
import { Loader2, Check, Scale } from 'lucide-react';

export default function WeightInput({ onWeightAdded }) {
    const [weight, setWeight] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, success

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!weight) return;

        setIsLoading(true);
        try {
            await addWeightLog(weight, date);
            setStatus('success');
            setWeight('');
            if (onWeightAdded) onWeightAdded();

            setTimeout(() => setStatus('idle'), 2000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="glass-panel p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-4 text-emerald-400">
                <Scale size={24} />
                <h3 className="text-xl font-bold uppercase tracking-wider">Registra Peso</h3>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Data</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-slate-800/50 text-white rounded-xl p-3 border border-slate-700 outline-none focus:border-emerald-500/50 transition"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Kg</label>
                        <input
                            type="number"
                            step="0.1"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="0.0"
                            className="bg-slate-800/50 text-white rounded-xl p-3 border border-slate-700 outline-none focus:border-emerald-500/50 transition font-bold text-lg"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || !weight}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <Loader2 className="animate-spin" />
                    ) : status === 'success' ? (
                        <>
                            <Check /> Salvato!
                        </>
                    ) : (
                        'SALVA PESO'
                    )}
                </button>
            </form>
        </div>
    );
}
