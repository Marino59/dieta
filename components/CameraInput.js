import { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, ScanBarcode, Edit2, Send, X as CloseIcon } from 'lucide-react';

import BarcodeScanner from './BarcodeScanner';
import { analyzeFoodImage, analyzeFoodText } from '@/lib/ai';
import { addMeal } from '@/lib/firestore';
import { getProductFromBarcode } from '@/lib/openfoodfacts';

export default function CameraInput({ onMealAdded, onMealIdentified, hideButtons, defaultDate, initialMode }) {
    const [activeTab, setActiveTab] = useState(initialMode || 'text'); // 'text', 'camera', 'barcode'

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [pendingMeal, setPendingMeal] = useState(null);
    const [pendingImage, setPendingImage] = useState(null);
    const [textDescription, setTextDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);
    const [isScanning, setIsScanning] = useState(false); // Valid only if activeTab is 'barcode' and we are scanning

    // Auto-trigger logic handled via activeTab
    useEffect(() => {
        if (activeTab === 'barcode') {
            setIsScanning(true);
        } else {
            setIsScanning(false);
        }

        // Auto-open camera when tab is selected
        if (activeTab === 'camera' && !pendingMeal && !isAnalyzing) {
            // Small timeout to ensure render
            setTimeout(() => {
                fileInputRef.current?.click();
            }, 100);
        }
    }, [activeTab, pendingMeal, isAnalyzing]);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Resize and compress image
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimension 1024px
                const MAX_SIZE = 1024;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height = Math.round((height * MAX_SIZE) / width);
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width = Math.round((width * MAX_SIZE) / height);
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Compress to JPEG with 0.7 quality
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setPendingImage(compressedBase64); // Save explicitly
                analyzeImage(compressedBase64);
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    };

    const analyzeImage = async (base64Image) => {
        setIsAnalyzing(true);
        try {
            // Let's strip the prefix here to be safe
            const base64Data = base64Image.split(',')[1] || base64Image;

            const data = await analyzeFoodImage(base64Data);
            // setPendingMeal(data); // REMOVED
            onMealIdentified(data, base64Image); // Call Parent
            setIsAnalyzing(false);
        } catch (error) {
            console.error(error);
            alert('Errore durante l\'analisi dell\'immagine. Riprova o usa l\'inserimento manuale.');
            setIsAnalyzing(false);
        }
    };

    const handleTextSubmit = async () => {
        if (!textDescription.trim()) return;
        setIsAnalyzing(true);
        try {
            console.log("Analyzing text:", textDescription);
            const data = await analyzeFoodText(textDescription, defaultDate || new Date());
            console.log("Analysis result:", data);

            if (!data) throw new Error("No data returned");

            // Prioritize date extracted by AI (YYYY-MM-DD)
            let finalDate = defaultDate ? new Date(defaultDate) : new Date();

            if (data.date) {
                const [y, m, d] = data.date.split('-').map(Number);
                finalDate.setFullYear(y, m - 1, d);
            }

            // If AI extracted a time (HH:MM), prioritize it
            if (data.time && /^\d{2}:\d{2}$/.test(data.time)) {
                const [hours, minutes] = data.time.split(':').map(Number);
                finalDate.setHours(hours, minutes, 0, 0);
            }

            // setPendingMeal({...}); // REMOVED
            onMealIdentified({
                ...data,
                date: finalDate
            }, null); // Call Parent, no image for text

            setTextDescription("");
        } catch (error) {
            console.error("Text analysis failed:", error);
            alert(`Errore AI: ${error.message || 'Riprova con una descrizione più semplice'}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleBarcodeDetected = async (code) => {
        setIsScanning(false);
        setIsAnalyzing(true);
        try {
            const data = await getProductFromBarcode(code);
            // setPendingMeal(data); // REMOVED
            onMealIdentified(data, null); // Call Parent
        } catch (error) {
            console.error(error);
            alert("Prodotto non trovato o errore di scansione.");
        } finally {
            setIsAnalyzing(false);
        }
    };



    return (
        <div className="w-full flex flex-col items-center">
            {/* Hidden Input for Camera - Always rendered */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileSelect}
            />

            {/* Top Navigation Tabs */}
            <div className="grid grid-cols-3 w-full gap-6 mb-12">
                <button
                    onClick={() => setActiveTab('camera')}
                    className={`aspect-square rounded-[2.5rem] flex flex-col items-center justify-center transition-all ${activeTab === 'camera' ? 'shadow-2xl scale-105 z-10 border-4 border-white' : 'opacity-60 hover:opacity-100 scale-100 bg-slate-100 dark:bg-slate-800'}`}
                    style={{
                        background: activeTab === 'camera' ? 'linear-gradient(135deg, #13ec13 0%, #0ea50e 100%)' : '',
                        color: activeTab === 'camera' ? 'white' : '#618961'
                    }}
                >
                    <span className="text-[5rem] drop-shadow-lg mb-2">📸</span>
                    <span className="text-xl font-black tracking-tighter uppercase mt-2">Foto</span>
                </button>

                <button
                    onClick={() => setActiveTab('text')}
                    className={`aspect-square rounded-[2.5rem] flex flex-col items-center justify-center transition-all ${activeTab === 'text' ? 'shadow-2xl scale-105 z-10 border-4 border-white' : 'opacity-60 hover:opacity-100 scale-100 bg-slate-100 dark:bg-slate-800'}`}
                    style={{
                        background: activeTab === 'text' ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' : '',
                        color: activeTab === 'text' ? 'white' : '#1e40af'
                    }}
                >
                    <span className="text-[5rem] drop-shadow-lg mb-2">✍️</span>
                    <span className="text-xl font-black tracking-tighter uppercase mt-2">Testo</span>
                </button>

                <button
                    onClick={() => setActiveTab('barcode')}
                    className={`aspect-square rounded-[2.5rem] flex flex-col items-center justify-center transition-all ${activeTab === 'barcode' ? 'shadow-2xl scale-105 z-10 border-4 border-white' : 'opacity-60 hover:opacity-100 scale-100 bg-slate-100 dark:bg-slate-800'}`}
                    style={{
                        background: activeTab === 'barcode' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : '',
                        color: activeTab === 'barcode' ? 'white' : '#92400e'
                    }}
                >
                    <span className="text-[5rem] drop-shadow-lg mb-2">🤳</span>
                    <span className="text-xl font-black tracking-tighter uppercase mt-2">Codice</span>
                </button>
            </div>


            {/* Analysis Loading State */}
            {
                isAnalyzing && (
                    <div className="w-full mb-12 h-48 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl flex flex-col items-center justify-center gap-6 animate-pulse border-4 border-blue-500/30">
                        <Loader2 className="w-20 h-20 text-blue-500 animate-spin" strokeWidth={3} />
                        <span className="text-4xl font-black text-[#111811] dark:text-white italic">ANALISI AI...</span>
                    </div>
                )
            }

            {/* Content Area */}
            <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-700">

                {/* CAMERA MODE */}
                {activeTab === 'camera' && (
                    <div className="flex flex-col items-center">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-[4/3] rounded-[3.5rem] flex flex-col items-center justify-center border-4 border-dashed border-green-500/30 bg-green-500/10 hover:bg-green-500/20 active:scale-95 transition-all group shadow-xl"
                        >
                            <div className="p-10 rounded-full bg-gradient-to-br from-[#13ec13] to-[#0ea50e] shadow-2xl shadow-green-500/40 mb-8 group-hover:scale-110 transition-transform duration-500 border-4 border-white/40">
                                <Camera size={80} color="white" strokeWidth={2.5} />
                            </div>
                            <span className="text-4xl font-black text-[#0ea50e] italic">SCATTA ORA</span>
                            <span className="text-xl text-[#618961] mt-4 font-bold uppercase tracking-widest opacity-60">CARICA DALLA GALLERIA</span>
                        </button>
                    </div>
                )}

                {/* TEXT MODE */}
                {activeTab === 'text' && (
                    <div className="flex flex-col w-full gap-8">
                        <textarea
                            autoFocus
                            placeholder="Cosa hai mangiato?&#10;Es: 2 uova strapazzate con pane tostato..."
                            className="w-full h-80 bg-white dark:bg-slate-900 border-4 border-blue-500/30 rounded-[3rem] p-10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none shadow-2xl text-4xl font-bold leading-relaxed"
                            value={textDescription}
                            onChange={(e) => setTextDescription(e.target.value)}
                        />
                        <button
                            onClick={handleTextSubmit}
                            disabled={!textDescription.trim()}
                            className="w-full h-28 rounded-[2.5rem] font-black text-4xl tracking-tighter shadow-2xl shadow-blue-500/30 active:scale-95 transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-indigo-600 border-4 border-white/20 uppercase"
                        >
                            🚀 ANALIZZA PASTO
                        </button>
                    </div>
                )}

                {/* BARCODE MODE */}
                {activeTab === 'barcode' && (
                    <div className="rounded-[4rem] overflow-hidden border-8 border-amber-500/30 bg-black relative aspect-square shadow-2xl">
                        <BarcodeScanner
                            onDetected={handleBarcodeDetected}
                            onClose={() => setActiveTab('text')} // Fallback if they close it
                        />
                        <div className="absolute inset-0 pointer-events-none border-[12px] border-amber-500/50 rounded-[4rem] z-10"></div>
                        <div className="absolute bottom-10 left-0 right-0 text-center z-20">
                            <span className="bg-amber-500/90 text-white px-8 py-4 rounded-3xl text-2xl font-black backdrop-blur-md shadow-xl border-2 border-white/20 uppercase tracking-tighter">
                                Inquadra il codice
                            </span>
                        </div>
                    </div>
                )}
            </div>



            {/* Confirmation Modal */}
            {
                pendingMeal && (
                    <ConfirmMealModal
                        mealData={pendingMeal}
                        onConfirm={handleConfirmMeal}
                        onCancel={() => { setPendingMeal(null); setPendingImage(null); }}
                        isLoading={isSaving}
                        defaultDate={defaultDate}
                    />
                )
            }
        </div >
    );
}
