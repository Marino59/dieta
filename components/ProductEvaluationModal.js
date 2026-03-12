'use client';

import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';

export default function ProductEvaluationModal({ productData, onClose, onConfirm }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Lock body scroll
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    if (!mounted || !productData) return null;

    const macros = productData.macros || {
        calories: productData.calories || 0,
        protein: productData.protein || 0,
        carbs: productData.carbs || 0,
        fat: productData.fat || 0
    };

    const handleAddMeal = () => {
        if (onConfirm) {
            onConfirm({
                name: productData.name,
                calories: macros.calories,
                protein: macros.protein,
                carbs: macros.carbs,
                fat: macros.fat,
                quantity: 100,
                created_at: new Date()
            });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col h-[100dvh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-10 border-b-8 border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onClose}
                    className="w-20 h-20 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition active:scale-95 flex items-center justify-center"
                >
                    <X size={48} />
                </button>
                <span className="text-white font-black uppercase tracking-[0.3em] text-3xl italic text-center leading-tight">
                    VALUTAZIONE<br />PRODOTTO
                </span>
                <div className="w-20" />
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                <div className="flex flex-col gap-12 max-w-5xl mx-auto mt-12">
                    
                    {/* Health Score / Grade */}
                    <div className="flex flex-col items-center gap-6">
                        <div className={`size-64 rounded-[4rem] flex flex-col items-center justify-center shadow-2xl border-8 ${
                            productData.healthScore > 75 ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400' : 
                            productData.healthScore > 50 ? 'bg-amber-950/30 border-amber-500/50 text-amber-400' : 
                            'bg-red-950/30 border-red-500/50 text-red-400'
                        }`}>
                            <span className="text-9xl font-black">{productData.healthScore}</span>
                            <span className="text-2xl font-black uppercase tracking-[0.5em] opacity-60">SCORE</span>
                        </div>
                        <h2 className="text-7xl font-black text-white uppercase tracking-tighter text-center leading-none">
                            {productData.name}
                        </h2>
                    </div>

                    {/* Macros Grid */}
                    <div className="grid grid-cols-2 gap-6 sm:gap-8">
                        <MacroBox label="CALORIE" val={Math.round(macros.calories)} unit="kcal" color="text-white" border="bg-slate-900 border-slate-800" h="h-56" size="text-7xl" />
                        <MacroBox label="PROTEINE" val={Math.round(macros.protein)} unit="g" color="text-blue-400" border="bg-blue-950/30 border-blue-900/50" h="h-56" size="text-7xl" />
                        <MacroBox label="CARB." val={Math.round(macros.carbs)} unit="g" color="text-emerald-400" border="bg-emerald-950/30 border-emerald-900/50" h="h-56" size="text-7xl" />
                        <MacroBox label="GRASSI" val={Math.round(macros.fat)} unit="g" color="text-amber-400" border="bg-amber-950/30 border-amber-900/50" h="h-56" size="text-7xl" />
                    </div>
                    <p className="text-center text-slate-500 font-black italic text-2xl uppercase tracking-[0.3em]">Valori per 100g</p>

                    {/* AI Feedback */}
                    <div className="space-y-8">
                        <div className="bg-blue-600/10 border-4 border-blue-500/30 rounded-[3rem] p-10 shadow-2xl">
                            <h3 className="text-blue-400 font-black text-4xl uppercase tracking-widest mb-6 flex items-center gap-4 italic">
                                <span className="material-symbols-outlined text-5xl">smart_toy</span>
                                IL PARERE DEL COACH
                            </h3>
                            <p className="text-white text-3xl font-bold leading-relaxed">{productData.advice}</p>
                        </div>

                        {/* Pros & Cons */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-emerald-500/10 rounded-[3rem] p-10 border-4 border-emerald-500/30">
                                <h4 className="text-emerald-400 font-black text-3xl mb-6 flex items-center gap-4 uppercase italic">
                                    <Check size={32} strokeWidth={4} /> PRO
                                </h4>
                                <ul className="space-y-4">
                                    {(productData.pros || []).map((pro, i) => (
                                        <li key={i} className="text-white/90 text-2xl font-bold flex items-start gap-3">
                                            <span className="mt-2.5 size-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                            {pro}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-red-500/10 rounded-[3rem] p-10 border-4 border-red-500/30">
                                <h4 className="text-red-400 font-black text-3xl mb-6 flex items-center gap-4 uppercase italic">
                                    <X size={32} strokeWidth={4} /> CONTRO
                                </h4>
                                <ul className="space-y-4">
                                    {(productData.cons || []).map((con, i) => (
                                        <li key={i} className="text-white/90 text-2xl font-bold flex items-start gap-3">
                                            <span className="mt-2.5 size-2.5 rounded-full bg-red-400 flex-shrink-0" />
                                            {con}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Final Actions */}
                    <div className="pb-32 mt-8 flex flex-col gap-6">
                        <button
                            onClick={handleAddMeal}
                            className="w-full h-44 rounded-[3.5rem] bg-indigo-600 text-white font-black text-6xl tracking-tighter shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-6 border-8 border-indigo-500 hover:bg-indigo-500"
                        >
                            <span className="material-symbols-outlined text-6xl">add_task</span>
                            AGGIUNGI ALLA DIETA
                        </button>
                        
                        <button
                            onClick={onClose}
                            className="w-full h-32 rounded-[3.5rem] bg-slate-800 text-slate-300 font-black text-4xl tracking-tighter shadow-xl active:scale-95 transition-all flex items-center justify-center gap-6 border-4 border-slate-700 hover:bg-slate-700"
                        >
                            TORNA ALLO SCANNER
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}

function MacroBox({ label, val, unit, color, border, h, size }) {
    return (
        <div className={`flex flex-col items-center justify-center ${h} rounded-[3rem] border-4 ${border} transition hover:scale-[1.02] shadow-2xl bg-slate-900/50`}>
            <span className={`leading-none font-black ${color} ${size} drop-shadow-lg`}>{val || 0}</span>
            <span className={`text-3xl font-black opacity-80 mt-2 tracking-widest ${color}`}>{unit}</span>
            <span className="text-xl font-black text-slate-500 tracking-[0.4em] mt-4 uppercase italic">{label}</span>
        </div>
    );
}
