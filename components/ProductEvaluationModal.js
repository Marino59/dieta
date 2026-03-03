'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function ProductEvaluationModal({ productData, onClose }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

    if (!mounted) return null;

    const analysis = productData.analysis || '';

    return (
        <div className="fixed inset-0 z-[99999] bg-slate-950 flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b-4 border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
                <button
                    onClick={onClose}
                    className="w-20 h-20 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition active:scale-95 flex items-center justify-center"
                >
                    <X size={48} />
                </button>
                <span className="text-white font-black uppercase tracking-[0.3em] text-2xl italic text-center leading-tight">
                    VALUTAZIONE<br />PRODOTTO
                </span>
                <div className="w-20" />
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="flex flex-col gap-12 max-w-4xl mx-auto mt-12">
                    <div className="text-center space-y-8">
                        <span className="material-symbols-outlined text-[8rem] text-amber-500 mb-4 block drop-shadow-2xl">qr_code_scanner</span>
                        <h2 className="text-5xl font-black text-white uppercase tracking-tighter leading-tight bg-slate-800 p-8 rounded-[3rem] border-4 border-slate-700 shadow-xl">{productData.name}</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-6 sm:gap-8">
                        <MacroBox label="CALORIE" val={Math.round(productData.calories)} unit="kcal" color="text-white" border="bg-slate-900 border-slate-800" h="h-56" size="text-7xl" />
                        <MacroBox label="PROTEINE" val={Math.round(productData.protein)} unit="g" color="text-blue-400" border="bg-blue-950/30 border-blue-900/50" h="h-56" size="text-7xl" />
                        <MacroBox label="CARB." val={Math.round(productData.carbs)} unit="g" color="text-emerald-400" border="bg-emerald-950/30 border-emerald-900/50" h="h-56" size="text-7xl" />
                        <MacroBox label="GRASSI" val={Math.round(productData.fat)} unit="g" color="text-amber-400" border="bg-amber-950/30 border-amber-900/50" h="h-56" size="text-7xl" />
                    </div>
                    <p className="text-center text-slate-500 font-black italic text-2xl uppercase tracking-[0.3em]">Valori per 100g</p>

                    {analysis && (
                        <div className={`border-4 rounded-[3rem] p-10 shadow-xl ${analysis.includes('⚠️') ? 'bg-red-500/10 border-red-500/50' : 'bg-amber-500/10 border-amber-500/30'}`}>
                            <h3 className={`font-black text-4xl mb-8 italic uppercase tracking-wider flex items-center justify-center gap-4 ${analysis.includes('⚠️') ? 'text-red-400' : 'text-amber-400'}`}>
                                <span>{analysis.includes('⚠️') ? '⚠️' : '💡'}</span>
                                {analysis.includes('⚠️') ? 'ATTENZIONE ALLA DIETA' : "IL PARERE DELL'AI"}
                            </h3>
                            <p className="text-white text-4xl font-bold leading-relaxed text-center">{analysis}</p>
                        </div>
                    )}

                    <div className="pb-32 mt-8 space-y-6">
                        <button
                            onClick={onClose}
                            className="w-full h-40 rounded-[3rem] bg-slate-800 text-white font-black text-5xl tracking-tighter shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-6 border-8 border-slate-700 hover:bg-slate-700"
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
