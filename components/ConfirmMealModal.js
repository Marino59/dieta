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

    const setNow = () => {
        const now = new Date();
        setSelectedDateStr(now.toISOString().split('T')[0]);
        setSelectedTimeStr(now.toTimeString().slice(0, 5));
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
            <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onCancel}
                    className="p-4 bg-slate-800 rounded-full text-slate-400 hover:text-white transition active:scale-95"
                >
                    <X size={32} />
                </button>
                <span className="text-slate-400 font-bold uppercase tracking-widest text-sm">Conferma Pasto</span>
                <div className="w-12" /> {/* Spacer for centering */}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="flex flex-col gap-12 max-w-xl mx-auto">

                    {/* Main Title & Quantity */}
                    <div className="text-center space-y-10 mt-8">
                        <textarea
                            value={mealData.name}
                            readOnly
                            className="w-full bg-transparent text-5xl sm:text-7xl font-black text-white text-center outline-none resize-none overflow-hidden"
                            rows={mealData.name.length > 20 ? 3 : 2}
                            style={{ lineHeight: '1.1' }}
                        />

                        <div className="flex items-center justify-center gap-6 sm:gap-10">
                            <button
                                onClick={() => handleQuantityChange(-50)}
                                className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center text-white active:scale-90 transition shadow-lg shadow-black/20"
                            >
                                <Minus size={40} />
                            </button>

                            <div className="flex flex-col items-center min-w-[160px]">
                                <span className="text-7xl sm:text-8xl font-black text-blue-400 tracking-tighter">{quantity}</span>
                                <span className="text-lg text-slate-500 font-bold uppercase tracking-[0.3em] mt-2">GRAMMI</span>
                            </div>

                            <button
                                onClick={() => handleQuantityChange(50)}
                                className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center text-white active:scale-90 transition shadow-lg shadow-black/20"
                            >
                                <Plus size={40} />
                            </button>
                        </div>
                    </div>

                    {/* Macros Grid - 2x2 for better visibility */}
                    <div className="grid grid-cols-2 gap-4 sm:gap-6">
                        <MacroBox label="CALORIE" val={Math.round((mealData.calories / 100) * quantity)} unit="kcal" color="text-white" border="bg-slate-900 border-slate-800" h="h-48 sm:h-56" size="text-6xl sm:text-7xl" />
                        <MacroBox label="PROTEINE" val={Math.round((mealData.protein / 100) * quantity)} unit="g" color="text-blue-400" border="bg-blue-950/30 border-blue-900/50" h="h-48 sm:h-56" size="text-6xl sm:text-7xl" />
                        <MacroBox label="CARB." val={Math.round((mealData.carbs / 100) * quantity)} unit="g" color="text-emerald-400" border="bg-emerald-950/30 border-emerald-900/50" h="h-48 sm:h-56" size="text-6xl sm:text-7xl" />
                        <MacroBox label="GRASSI" val={Math.round((mealData.fat / 100) * quantity)} unit="g" color="text-amber-400" border="bg-amber-950/30 border-amber-900/50" h="h-48 sm:h-56" size="text-6xl sm:text-7xl" />
                    </div>

                    {/* DateTime Section - Enhanced with ORA button */}
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-2">
                                <span className="text-xs font-black text-slate-500 tracking-[0.2em] text-center uppercase">GIORNO</span>
                                <input
                                    type="date"
                                    value={selectedDateStr}
                                    onChange={e => setSelectedDateStr(e.target.value)}
                                    className="bg-transparent text-white text-3xl font-black outline-none w-full text-center"
                                />
                            </div>
                            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-2">
                                <span className="text-xs font-black text-slate-500 tracking-[0.2em] text-center uppercase">ORA</span>
                                <input
                                    type="time"
                                    value={selectedTimeStr}
                                    onChange={e => setSelectedTimeStr(e.target.value)}
                                    className="bg-transparent text-white text-3xl font-black outline-none w-full text-center"
                                />
                            </div>
                        </div>
                        <button
                            onClick={setNow}
                            className="bg-blue-600/20 text-blue-400 border border-blue-500/30 p-6 rounded-3xl font-black text-2xl flex items-center justify-center gap-3 active:scale-95 transition-all mb-8"
                        >
                            <RefreshCw size={28} />
                            IMPOSTA ORA ATTUALE
                        </button>
                    </div>

                    {/* Integrated Confirmation Button - Moving it inside the scroll flow to avoid overlay issues */}
                    <div className="pb-20">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="w-full h-28 rounded-[2.5rem] bg-white text-black font-black text-4xl tracking-tight shadow-2xl shadow-white/10 active:scale-[0.98] transition-all flex items-center justify-center gap-4 disabled:opacity-50"
                        >
                            {isLoading ? <Loader2 className="animate-spin w-12 h-12" /> : <Check size={48} strokeWidth={4} />}
                            {isLoading ? 'SALVATAGGIO...' : 'CONFERMA'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );


}

function MacroBox({ label, val, unit, color, border, h, size }) {
    return (
        <div className={`flex flex-col items-center justify-center ${h} rounded-[2rem] border-2 ${border} transition hover:scale-[1.02]`}>
            <span className={`leading-none font-black ${color} ${size}`}>{val}</span>
            <span className={`text-xl font-bold opacity-60 mt-2 ${color}`}>{unit}</span>
            <span className="text-xs font-black text-slate-500 tracking-[0.3em] mt-4 uppercase">{label}</span>
        </div>
    );
}
