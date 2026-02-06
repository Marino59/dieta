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
            {/* DEBUG: Removed condition !pendingMeal && !isAnalyzing */}
            <div className="grid grid-cols-3 w-full gap-4 mb-6">
                <button
                    onClick={() => setActiveTab('camera')}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${activeTab === 'camera' ? 'shadow-xl scale-105 z-10' : 'opacity-80 hover:opacity-100 scale-100'}`}
                    style={{
                        background: activeTab === 'camera' ? 'linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)' : 'rgba(30, 41, 59, 0.5)',
                        border: activeTab === 'camera' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        color: activeTab === 'camera' ? 'white' : '#94a3b8'
                    }}
                >
                    <Camera size={32} strokeWidth={activeTab === 'camera' ? 2 : 1.5} />
                    <span className="text-xs font-bold mt-2 tracking-wider uppercase">Foto</span>
                </button>

                <button
                    onClick={() => setActiveTab('text')}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${activeTab === 'text' ? 'shadow-xl scale-105 z-10' : 'opacity-80 hover:opacity-100 scale-100'}`}
                    style={{
                        background: activeTab === 'text' ? 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)' : 'rgba(30, 41, 59, 0.5)',
                        border: activeTab === 'text' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        color: activeTab === 'text' ? 'white' : '#94a3b8'
                    }}
                >
                    <Edit2 size={32} strokeWidth={activeTab === 'text' ? 2 : 1.5} />
                    <span className="text-xs font-bold mt-2 tracking-wider uppercase">Testo</span>
                </button>

                <button
                    onClick={() => setActiveTab('barcode')}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all ${activeTab === 'barcode' ? 'shadow-xl scale-105 z-10' : 'opacity-80 hover:opacity-100 scale-100'}`}
                    style={{
                        background: activeTab === 'barcode' ? 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' : 'rgba(30, 41, 59, 0.5)',
                        border: activeTab === 'barcode' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                        color: activeTab === 'barcode' ? 'white' : '#94a3b8'
                    }}
                >
                    <ScanBarcode size={32} strokeWidth={activeTab === 'barcode' ? 2 : 1.5} />
                    <span className="text-xs font-bold mt-2 tracking-wider uppercase">Codice</span>
                </button>
            </div>


            {/* Analysis Loading State */}
            {
                isAnalyzing && (
                    <div className="w-full mb-8 h-32 glass-panel rounded-2xl flex flex-col items-center justify-center gap-4 animate-pulse border border-blue-500/30">
                        <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                        <span className="text-xl font-bold text-white">Analisi con AI in corso...</span>
                    </div>
                )
            }

            {/* Content Area */}

            {/* DEBUG: Removed condition !pendingMeal && !isAnalyzing */}
            <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* CAMERA MODE */}
                {activeTab === 'camera' && (
                    <div className="flex flex-col items-center">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-video rounded-3xl flex flex-col items-center justify-center border-2 border-dashed border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all group"
                        >
                            <div className="p-6 rounded-full bg-blue-500 shadow-xl shadow-blue-500/40 mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Camera size={48} color="white" />
                            </div>
                            <span className="text-xl font-bold text-blue-200">Scatta una Foto</span>
                            <span className="text-sm text-blue-400 mt-2">o carica dalla galleria</span>
                        </button>
                    </div>
                )}

                {/* TEXT MODE */}
                {activeTab === 'text' && (
                    <div className="flex flex-col w-full">
                        <textarea
                            autoFocus
                            placeholder="Cosa hai mangiato?&#10;Es: 2 uova strapazzate con pane tostato..."
                            className="w-full h-48 bg-slate-800/50 border-2 border-orange-500/30 rounded-3xl p-6 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none mb-4"
                            style={{ fontSize: '1.5rem', lineHeight: '1.5' }} // Large Text
                            value={textDescription}
                            onChange={(e) => setTextDescription(e.target.value)}
                        />
                        <button
                            onClick={handleTextSubmit}
                            disabled={!textDescription.trim()}
                            className="w-full py-5 rounded-2xl font-black text-xl tracking-wide shadow-xl shadow-orange-500/20 active:scale-95 transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: 'linear-gradient(135deg, #f97316 0%, #fbbf24 100%)' }}
                        >
                            ANALIZZA TESTO
                        </button>
                    </div>
                )}

                {/* BARCODE MODE */}
                {activeTab === 'barcode' && (
                    <div className="rounded-3xl overflow-hidden border-2 border-emerald-500/30 bg-black relative aspect-square">
                        <BarcodeScanner
                            onDetected={handleBarcodeDetected}
                            onClose={() => setActiveTab('text')} // Fallback if they close it
                        />
                        <div className="absolute inset-0 pointer-events-none border-[3px] border-emerald-500/50 rounded-3xl z-10"></div>
                        <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                            <span className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md">
                                Inquadra il codice a barre
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
