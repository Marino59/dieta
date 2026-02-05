'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
    const modalContent = (
        <div
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
        >
            <div className="bg-slate-900/90 border border-slate-700/50 w-full max-w-lg max-h-[85vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/30">
                    <div>
                        <h3 className="text-xl font-bold text-white tracking-tight">Modifica Pasto</h3>
                        <p className="text-slate-400 text-xs font-medium">Aggiorna i dettagli nutrizionali</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2.5 bg-slate-800/80 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/50"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">

                    {/* Main Title & Quantity */}
                    <div className="text-center space-y-4">
                        <div className="text-2xl font-bold text-white leading-tight">{mealData.name}</div>

                        <div className="flex items-center justify-center gap-6 bg-slate-800/30 p-3 rounded-2xl border border-slate-700/30 mx-auto max-w-[280px]">
                            <button
                                onClick={() => handleQuantityChange(-50)}
                                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition active:scale-95 border border-slate-700"
                            >
                                <Minus size={20} />
                            </button>
                            <div className="flex flex-col items-center min-w-[80px]">
                                <span className="text-3xl font-black text-blue-400">{quantity}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">GRAMMI</span>
                            </div>
                            <button
                                onClick={() => handleQuantityChange(50)}
                                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-white transition active:scale-95 border border-slate-700"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>

                    {/* DateTime Section */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
                            <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block tracking-wider">Data</label>
                            <input
                                type="date"
                                value={selectedDateStr}
                                onChange={e => setSelectedDateStr(e.target.value)}
                                className="w-full bg-slate-700/50 text-white text-sm font-medium rounded-lg px-2 py-1 outline-none cursor-pointer [color-scheme:dark]"
                            />
                        </div>
                        <div className="bg-slate-800/40 p-3 rounded-2xl border border-slate-700/30">
                            <label className="text-[10px] text-slate-400 font-bold uppercase mb-2 block tracking-wider">Ora</label>
                            <input
                                type="time"
                                value={selectedTimeStr}
                                onChange={e => setSelectedTimeStr(e.target.value)}
                                className="w-full bg-slate-700/50 text-white text-sm font-medium rounded-lg px-2 py-1 outline-none cursor-pointer [color-scheme:dark]"
                            />
                        </div>
                    </div>

                    {/* Macros Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        <MacroBox label="KCAL" val={Math.round((mealData.calories / 100) * quantity)} color="text-white" border="bg-slate-800/50 border-slate-700" />
                        <MacroBox label="PROT" val={Math.round((mealData.protein / 100) * quantity)} color="text-blue-400" border="bg-blue-500/10 border-blue-500/20" />
                        <MacroBox label="CARB" val={Math.round((mealData.carbs / 100) * quantity)} color="text-emerald-400" border="bg-emerald-500/10 border-emerald-500/20" />
                        <MacroBox label="GRAS" val={Math.round((mealData.fat / 100) * quantity)} color="text-amber-400" border="bg-amber-500/10 border-amber-500/20" />
                    </div>

                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-700/50 bg-slate-800/30 flex flex-col gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold text-lg shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
                    >
                        {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <Check size={24} strokeWidth={3} />}
                        {isLoading ? 'SALVATAGGIO...' : 'SALVA MODIFICHE'}
                    </button>

                    <button
                        onClick={onCancel}
                        className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium py-2"
                    >
                        Annulla
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}

function MacroBox({ label, val, color, border }) {
    return (
        <div className={`flex flex-col items-center justify-center py-3 rounded-2xl border ${border} transition hover:scale-105`}>
            <span className="text-[9px] font-black text-slate-500 tracking-widest mb-0.5">{label}</span>
            <span className={`text-sm font-black ${color}`}>{val}</span>
        </div>
    );
}
