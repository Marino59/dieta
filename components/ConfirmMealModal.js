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
            <div className="p-8 border-b-4 border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onCancel}
                    className="w-20 h-20 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition active:scale-95 flex items-center justify-center"
                >
                    <X size={48} />
                </button>
                <span className="text-white font-black uppercase tracking-[0.3em] text-3xl italic">CONFERMA PASTO</span>
                <div className="w-20" /> {/* Spacer for centering */}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="flex flex-col gap-12 max-w-xl mx-auto">

                    {/* Main Title & Quantity */}
                    {/* Main Title & Quantity */}
                    <div className="text-center space-y-12 mt-12">
                        <textarea
                            value={mealData.name}
                            readOnly
                            className="w-full bg-transparent text-6xl sm:text-8xl font-black text-white text-center outline-none resize-none overflow-hidden uppercase tracking-tighter"
                            rows={mealData.name.length > 15 ? 3 : 2}
                            style={{ lineHeight: '1.0' }}
                        />

                        <div className="flex items-center justify-center gap-8 sm:gap-12">
                            <button
                                onClick={() => handleQuantityChange(-50)}
                                className="w-28 h-28 rounded-[2rem] bg-slate-800 flex items-center justify-center text-white active:scale-90 transition shadow-2xl shadow-black/40 border-2 border-white/10"
                            >
                                <Minus size={56} strokeWidth={3} />
                            </button>

                            <div className="flex flex-col items-center min-w-[220px]">
                                <span className="text-[10rem] sm:text-[12rem] font-black text-blue-400 tracking-tighter leading-none shadow-blue-500/10 drop-shadow-2xl">{quantity}</span>
                                <span className="text-3xl text-slate-500 font-black uppercase tracking-[0.4em] mt-4">GRAMMI</span>
                            </div>

                            <button
                                onClick={() => handleQuantityChange(50)}
                                className="w-28 h-28 rounded-[2rem] bg-slate-800 flex items-center justify-center text-white active:scale-90 transition shadow-2xl shadow-black/40 border-2 border-white/10"
                            >
                                <Plus size={56} strokeWidth={3} />
                            </button>
                        </div>
                    </div>

                    {/* Macros Grid - 2x2 for better visibility */}
                    <div className="grid grid-cols-2 gap-6 sm:gap-8">
                        <MacroBox label="CALORIE" val={Math.round((mealData.calories / 100) * quantity)} unit="kcal" color="text-white" border="bg-slate-900 border-slate-800" h="h-64 sm:h-72" size="text-8xl sm:text-9xl" />
                        <MacroBox label="PROTEINE" val={Math.round((mealData.protein / 100) * quantity)} unit="g" color="text-blue-400" border="bg-blue-950/30 border-blue-900/50" h="h-64 sm:h-72" size="text-8xl sm:text-9xl" />
                        <MacroBox label="CARB." val={Math.round((mealData.carbs / 100) * quantity)} unit="g" color="text-emerald-400" border="bg-emerald-950/30 border-emerald-900/50" h="h-64 sm:h-72" size="text-8xl sm:text-9xl" />
                        <MacroBox label="GRASSI" val={Math.round((mealData.fat / 100) * quantity)} unit="g" color="text-amber-400" border="bg-amber-950/30 border-amber-900/50" h="h-64 sm:h-72" size="text-8xl sm:text-9xl" />
                    </div>

                    {/* DateTime Section - Enhanced with ORA button */}
                    <div className="flex flex-col gap-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-slate-900 p-8 rounded-[2.5rem] border-2 border-slate-800 flex flex-col gap-4 shadow-inner">
                                <span className="text-xl font-black text-slate-500 tracking-[0.3em] text-center uppercase italic">GIORNO</span>
                                <input
                                    type="date"
                                    value={selectedDateStr}
                                    onChange={e => setSelectedDateStr(e.target.value)}
                                    className="bg-transparent text-white text-5xl font-black outline-none w-full text-center"
                                />
                            </div>
                            <div className="bg-slate-900 p-8 rounded-[2.5rem] border-2 border-slate-800 flex flex-col gap-4 shadow-inner">
                                <span className="text-xl font-black text-slate-500 tracking-[0.3em] text-center uppercase italic">ORA</span>
                                <input
                                    type="time"
                                    value={selectedTimeStr}
                                    onChange={e => setSelectedTimeStr(e.target.value)}
                                    className="bg-transparent text-white text-5xl font-black outline-none w-full text-center"
                                />
                            </div>
                        </div>
                        <button
                            onClick={setNow}
                            className="bg-blue-600/10 text-blue-400 border-4 border-blue-500/20 p-10 rounded-[2.5rem] font-black text-4xl flex items-center justify-center gap-6 active:scale-95 transition-all mb-12 shadow-2xl"
                        >
                            <RefreshCw size={48} strokeWidth={3} />
                            IMPOSTA ORA ORA
                        </button>
                    </div>

                    {/* Integrated Confirmation Button - Moving it inside the scroll flow to avoid overlay issues */}
                    <div className="pb-32">
                        <button
                            onClick={handleSave}
                            disabled={isLoading}
                            className="w-full h-40 rounded-[3rem] bg-white text-black font-black text-6xl tracking-tighter shadow-[0_20px_60px_-15px_rgba(255,255,255,0.3)] active:scale-95 transition-all flex items-center justify-center gap-6 disabled:opacity-50 border-8 border-white/20"
                        >
                            {isLoading ? <Loader2 className="animate-spin w-20 h-20" /> : <Check size={64} strokeWidth={5} />}
                            {isLoading ? 'INVIO...' : 'CONFERMA'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );


}

function MacroBox({ label, val, unit, color, border, h, size }) {
    return (
        <div className={`flex flex-col items-center justify-center ${h} rounded-[3rem] border-4 ${border} transition hover:scale-[1.02] shadow-2xl`}>
            <span className={`leading-none font-black ${color} ${size} drop-shadow-lg`}>{val}</span>
            <span className={`text-3xl font-black opacity-80 mt-4 tracking-widest ${color}`}>{unit}</span>
            <span className="text-xl font-black text-slate-500 tracking-[0.4em] mt-6 uppercase italic">{label}</span>
        </div>
    );
}
