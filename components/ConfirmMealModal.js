'use client';

import { useState, useEffect } from 'react';

import { Check, X, Minus, Plus, Loader2, RefreshCw } from 'lucide-react';
import { updateAnalysisFromText } from '@/lib/ai';

export default function ConfirmMealModal({ mealData, onConfirm, onCancel, isLoading, defaultDate }) {
    const [quantity, setQuantity] = useState(mealData.quantity || 100);
    const [analysis, setAnalysis] = useState(mealData.analysis || '');
    const [mounted, setMounted] = useState(false);

    // Initialize date logic
    const getInitialDate = () => {
        if (mealData.date) return new Date(mealData.date);
        const base = defaultDate ? new Date(defaultDate) : new Date();
        if (defaultDate) {
            const now = new Date();
            base.setHours(now.getHours(), now.getMinutes());
        }
        return base;
    };
    let initialDate = getInitialDate();
    if (isNaN(initialDate.getTime())) initialDate = new Date();

    const [selectedDateStr, setSelectedDateStr] = useState(initialDate.toISOString().split('T')[0]);
    const [selectedTimeStr, setSelectedTimeStr] = useState(initialDate.toTimeString().slice(0, 5));

    // Mount on client side only for Portal
    useEffect(() => {
        setMounted(true);
        // Lock body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    const handleQuantityChange = (delta) => {
        setQuantity(prev => Math.max(10, prev + delta));
    };

    const handleSave = () => {
        if (isLoading) return;
        const [year, month, day] = selectedDateStr.split('-').map(Number);
        const [hours, minutes] = selectedTimeStr.split(':').map(Number);
        const finalDate = new Date(year, month - 1, day, hours, minutes);

        onConfirm({
            ...mealData,
            quantity,
            analysis,
            date: finalDate
        });
    };

    const [isRegenerating, setIsRegenerating] = useState(false);
    const handleRegenerateAnalysis = async () => {
        setIsRegenerating(true);
        try {
            const newAnalysis = await updateAnalysisFromText(mealData.name, quantity);
            setAnalysis(newAnalysis);
        } catch (error) {
            console.error("Failed to regenerate", error);
        } finally {
            setIsRegenerating(false);
        }
    };

    // Render nothing on server
    if (!mounted) return null;

    // The actual modal JSX
    return (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col animate-in zoom-in-95 duration-200">

            {/* Header */}
            <div className="flex-none p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 shadow-md z-10">
                <button
                    onClick={onCancel}
                    className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white transition active:scale-95"
                >
                    <X size={24} />
                </button>
                <span className="text-slate-200 font-bold uppercase tracking-widest text-sm">Conferma Pasto</span>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="flex flex-col gap-10 pb-40 w-full max-w-2xl mx-auto">

                    {/* Meal Name Input */}
                    <div className="w-full text-center px-4">
                        <label className="text-lg font-bold text-slate-500 uppercase tracking-widest mb-4 block">Cosa mangi?</label>
                        <h1 className="text-5xl sm:text-6xl font-black text-white leading-tight break-words shadow-black drop-shadow-xl">
                            {mealData.name}
                        </h1>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center justify-center gap-10 py-6">
                        <button
                            onClick={() => handleQuantityChange(-50)}
                            className="w-24 h-24 rounded-[2rem] bg-slate-800 flex items-center justify-center text-white active:scale-90 transition shadow-xl shadow-black/30"
                        >
                            <Minus size={40} />
                        </button>

                        <div className="flex flex-col items-center min-w-[180px]">
                            <span className="text-8xl font-black text-blue-400 tracking-tighter filter drop-shadow-xl">{quantity}</span>
                            <span className="text-lg text-slate-500 font-bold uppercase tracking-[0.4em] mt-4">GRAMMI</span>
                        </div>

                        <button
                            onClick={() => handleQuantityChange(50)}
                            className="w-24 h-24 rounded-[2rem] bg-slate-800 flex items-center justify-center text-white active:scale-90 transition shadow-xl shadow-black/30"
                        >
                            <Plus size={40} />
                        </button>
                    </div>

                    {/* Macros Grid - Huge */}
                    <div className="grid grid-cols-1 gap-8 px-4">
                        <MacroBox label="CALORIE" val={Math.round((mealData.calories / 100) * quantity)} unit="kcal" color="text-white" border="bg-slate-900 border-slate-800" />
                        <MacroBox label="PROTEINE" val={Math.round((mealData.protein / 100) * quantity)} unit="g" color="text-blue-400" border="bg-blue-950/30 border-blue-900/50" />
                        <MacroBox label="CARBOIDRATI" val={Math.round((mealData.carbs / 100) * quantity)} unit="g" color="text-emerald-400" border="bg-emerald-950/30 border-emerald-900/50" />
                        <MacroBox label="GRASSI" val={Math.round((mealData.fat / 100) * quantity)} unit="g" color="text-amber-400" border="bg-amber-950/30 border-amber-900/50" />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-6 pt-6 px-4">
                        <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 flex flex-col justify-center gap-3">
                            <span className="text-sm text-slate-500 font-bold uppercase text-center tracking-widest">DATA</span>
                            <input
                                type="date"
                                value={selectedDateStr}
                                onChange={e => setSelectedDateStr(e.target.value)}
                                className="bg-transparent text-white text-2xl font-bold outline-none w-full text-center h-12"
                            />
                        </div>
                        <div className="bg-slate-900 p-8 rounded-[2rem] border border-slate-800 flex flex-col justify-center gap-3">
                            <span className="text-sm text-slate-500 font-bold uppercase text-center tracking-widest">ORA</span>
                            <input
                                type="time"
                                value={selectedTimeStr}
                                onChange={e => setSelectedTimeStr(e.target.value)}
                                className="bg-transparent text-white text-2xl font-bold outline-none w-full text-center h-12"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="flex-none p-8 bg-slate-900 border-t border-slate-800 z-20 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full h-24 rounded-[2rem] bg-white text-black font-black text-3xl tracking-wide shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-6 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="animate-spin w-10 h-10" /> : <Check size={40} strokeWidth={4} />}
                        {isLoading ? 'SALVATAGGIO...' : 'CONFERMA'}
                    </button>
                </div>
            </div>
        </div>
    );


}

function MacroBox({ label, val, unit, color, border }) {
    return (
        <div className={`flex flex-row justify-between items-center h-40 px-10 rounded-[2.5rem] border-2 ${border} transition hover:scale-[1.02] shadow-xl`}>
            <span className="text-lg font-black text-slate-500 tracking-[0.25em] uppercase w-32">{label}</span>
            <div className="flex items-baseline gap-3">
                <span className={`leading-none font-black ${color} text-7xl drop-shadow-xl`}>{val}</span>
                <span className={`text-3xl font-bold opacity-60 ${color}`}>{unit}</span>
            </div>
        </div>
    );
}
