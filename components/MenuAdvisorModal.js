'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, Loader2, Star, AlertTriangle, ChefHat, RefreshCw } from 'lucide-react';
import { analyzeMenuImage } from '@/lib/ai';

export default function MenuAdvisorModal({ onClose, profile, caloriesConsumed = 0 }) {
    const [step, setStep] = useState('capture'); // 'capture' | 'analyzing' | 'results' | 'error'
    const [result, setResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [previewSrc, setPreviewSrc] = useState(null);
    const fileInputRef = useRef(null);

    const remaining = (profile?.targetCalories || 2000) - caloriesConsumed;

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                const MAX = 1024;
                if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
                else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL('image/jpeg', 0.8);
                setPreviewSrc(compressed);
                runAnalysis(compressed);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    const runAnalysis = async (base64Full) => {
        setStep('analyzing');
        try {
            const base64Data = base64Full.split(',')[1];
            const data = await analyzeMenuImage(base64Data, profile, caloriesConsumed);
            setResult(data);
            setStep('results');
        } catch (err) {
            setErrorMsg(err.message || 'Errore sconosciuto.');
            setStep('error');
        }
    };

    const reset = () => {
        setStep('capture');
        setResult(null);
        setPreviewSrc(null);
        setErrorMsg('');
        // reset file input so same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const healthColor = (score) => {
        if (score >= 70) return '#22c55e';
        if (score >= 40) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-[#0d1a0d]"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-safe pt-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <ChefHat className="text-green-400" size={28} strokeWidth={2.5} />
                    <div>
                        <h2 className="text-white font-black text-2xl tracking-tight">Consulente Menu</h2>
                        <p className="text-green-400 text-sm font-bold">
                            {remaining > 0 ? `${remaining} kcal rimanenti oggi` : 'Budget calorico esaurito'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-transform"
                >
                    <X className="text-white" size={22} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                <AnimatePresence mode="wait">

                    {/* STEP: CAPTURE */}
                    {step === 'capture' && (
                        <motion.div key="capture"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center gap-6"
                        >
                            <input
                                type="file" accept="image/*" capture="environment"
                                ref={fileInputRef} className="hidden"
                                onChange={handleFileSelect}
                            />
                            <p className="text-slate-300 text-center text-lg font-semibold leading-relaxed">
                                Fotografa la carta del ristorante e ti dirò cosa ordinare in base alle tue calorie e al tuo obiettivo.
                            </p>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full aspect-square max-w-sm rounded-[3rem] flex flex-col items-center justify-center gap-6 border-4 border-dashed border-green-500/40 bg-green-500/10 active:scale-95 transition-all"
                            >
                                <div className="p-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-2xl shadow-green-500/40">
                                    <Camera size={80} color="white" strokeWidth={2.5} />
                                </div>
                                <span className="text-5xl font-black text-white tracking-tighter">FOTOGRAFA MENU</span>
                                <span className="text-2xl text-green-400 font-bold uppercase tracking-widest">o carica dalla galleria</span>
                            </button>
                        </motion.div>
                    )}

                    {/* STEP: ANALYZING */}
                    {step === 'analyzing' && (
                        <motion.div key="analyzing"
                            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center gap-8 py-16"
                        >
                            {previewSrc && (
                                <img src={previewSrc} alt="menu" className="w-48 h-48 object-cover rounded-[2rem] opacity-50 shadow-2xl" />
                            )}
                            <Loader2 className="text-green-400 animate-spin" size={72} strokeWidth={2} />
                            <div className="text-center">
                                <p className="text-white font-black text-4xl tracking-tighter">ANALISI IN CORSO</p>
                                <p className="text-green-400 font-bold text-lg mt-2">Il nutrizionista sta studiando il menu...</p>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP: RESULTS */}
                    {step === 'results' && result && (
                        <motion.div key="results"
                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col gap-5"
                        >
                            {/* Best Choice Banner */}
                            <div className="rounded-[2.5rem] p-5 bg-gradient-to-br from-yellow-400 to-amber-500 shadow-2xl shadow-amber-500/40 border-4 border-white/30">
                                <div className="flex items-center gap-3 mb-2">
                                    <Star size={28} className="text-white fill-white" />
                                    <span className="text-white font-black text-2xl uppercase tracking-tight">Scelta migliore</span>
                                </div>
                                <p className="text-white font-black text-4xl tracking-tighter">{result.bestChoice}</p>
                            </div>

                            {/* Recommendations */}
                            <p className="text-slate-400 font-black text-lg uppercase tracking-widest px-1">✅ Consigliati</p>
                            {result.recommendations?.map((item, i) => (
                                <motion.div key={i}
                                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.08 }}
                                    className="rounded-[2rem] p-5 bg-white/5 border border-white/10 flex flex-col gap-2"
                                >
                                    <div className="flex items-center justify-between">
                                        <p className="text-white font-black text-2xl tracking-tight flex-1 pr-2">{item.dish}</p>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className="text-white/60 font-bold text-sm">~{item.estimatedCalories} kcal</span>
                                            <span className="text-xs font-black px-2 py-0.5 rounded-full text-white"
                                                  style={{ backgroundColor: healthColor(item.healthScore) }}>
                                                {item.healthScore}/100
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-base leading-snug">{item.reason}</p>
                                </motion.div>
                            ))}

                            {/* Avoid list */}
                            {result.avoidList?.length > 0 && (
                                <>
                                    <p className="text-slate-400 font-black text-lg uppercase tracking-widest px-1 mt-2">❌ Da evitare</p>
                                    <div className="rounded-[2rem] p-5 bg-red-500/10 border border-red-500/30 flex flex-col gap-2">
                                        {result.avoidList.map((dish, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                                                <span className="text-red-300 font-bold text-lg">{dish}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Summary */}
                            {result.summary && (
                                <div className="rounded-[2rem] p-5 bg-blue-500/10 border border-blue-500/20">
                                    <p className="text-blue-300 text-base leading-relaxed font-medium italic">💬 {result.summary}</p>
                                </div>
                            )}

                            {/* Retry */}
                            <button
                                onClick={reset}
                                className="w-full h-16 rounded-[1.5rem] border-2 border-white/20 bg-white/5 flex items-center justify-center gap-3 text-white font-black text-lg active:scale-95 transition-all mt-2"
                            >
                                <RefreshCw size={20} /> Fotografa un altro menu
                            </button>
                        </motion.div>
                    )}

                    {/* STEP: ERROR */}
                    {step === 'error' && (
                        <motion.div key="error"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-6 py-16 text-center"
                        >
                            <AlertTriangle className="text-red-400" size={64} />
                            <p className="text-white font-black text-3xl">Analisi fallita</p>
                            <p className="text-slate-300 text-lg leading-relaxed">{errorMsg}</p>
                            <button onClick={reset}
                                className="mt-4 px-8 py-4 rounded-[1.5rem] bg-green-500 text-white font-black text-xl active:scale-95 transition-all flex items-center gap-3"
                            >
                                <RefreshCw size={20} /> Riprova
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </motion.div>
    );
}
