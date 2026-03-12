import { useState, useRef, useEffect } from 'react';
import { Camera, Loader2, ScanBarcode, Edit2, Send, X as CloseIcon } from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';
import { analyzeFoodImage, analyzeFoodText, analyzeBarcodeProduct } from '@/lib/ai';
import { addMeal, updateMeal } from '@/lib/firestore';
import { getProductFromBarcode } from '@/lib/openfoodfacts';

export default function CameraInput({ onMealAdded, onMealIdentified, onProductEvaluated, hideButtons, defaultDate, initialMode, profile }) {
    const [activeTab, setActiveTab] = useState(initialMode || 'text'); // 'text', 'camera', 'barcode'

    const [isAnalyzing, setIsAnalyzing] = useState(false);
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
        if (activeTab === 'camera' && !pendingImage && !isAnalyzing) {
            // Small timeout to ensure render
            setTimeout(() => {
                fileInputRef.current?.click();
            }, 100);
        }
    }, [activeTab, pendingImage, isAnalyzing]);

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

                // Max dimension restored to 1024px for much better AI accuracy
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
            const base64Data = base64Image.split(',')[1] || base64Image;
            const data = await analyzeFoodImage(base64Data, profile);
            
            if (onMealIdentified) {
                onMealIdentified(data);
            } else if (onMealAdded) {
                const finalDoc = await addMeal(data);
                onMealAdded(finalDoc);
            }
        } catch (error) {
            console.error("Image analysis failed", error);
            alert("Errore nell'analisi dell'immagine. Riprova.");
        } finally {
            setIsAnalyzing(false);
            setPendingImage(null);
        }
    };

    const handleTextSubmit = async () => {
        if (!textDescription.trim()) return;

        setIsAnalyzing(true);
        try {
            const data = await analyzeFoodText(textDescription, new Date(), profile);
            
            if (onMealIdentified) {
                onMealIdentified(data);
                setTextDescription("");
            } else if (onMealAdded) {
                const finalDoc = await addMeal(data);
                onMealAdded(finalDoc);
                setTextDescription("");
            }
        } catch (error) {
            console.error("Text analysis failed", error);
            alert("Errore nell'analisi del testo. Riprova.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleBarcodeDetected = async (code) => {
        setIsScanning(false);
        setActiveTab(''); // Force scanner UI to disappear immediately
        setIsAnalyzing(true);
        try {
            const data = await getProductFromBarcode(code);
            // Enrich with AI analysis
            try {
                const aiAnalysis = await analyzeBarcodeProduct(data, profile);
                data.analysis = aiAnalysis;
            } catch (aiError) {
                console.error("AI Barcode Analysis fallback:", aiError);
                data.analysis = `⚠️ L'Intelligenza Artificiale è attualmente intasata da troppe richieste simultanee o in pausa tecnica. \n\nI dati del prodotto (calorie, macronutrienti) sono comunque stati recuperati con successo dal database e visualizzati qui sopra. Riprova la scansione dell'etichetta tra qualche minuto per ricevere anche il parere qualitativo del nutrizionista virtuale.`;
            }

            if (onProductEvaluated) {
                onProductEvaluated(data);
            } else {
                onMealIdentified(data, null); // Fallback
            }
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
            <div className="grid grid-cols-3 w-full gap-2 mb-6 px-2">
                <button
                    onClick={() => setActiveTab('camera')}
                    className={`aspect-square rounded-[2rem] flex flex-col items-center justify-center transition-all ${activeTab === 'camera' ? 'shadow-2xl scale-105 z-10 border-4 border-white' : 'opacity-60 hover:opacity-100 scale-100 bg-slate-100 dark:bg-slate-800'}`}
                    style={{
                        background: activeTab === 'camera' ? 'linear-gradient(135deg, #13ec13 0%, #0ea50e 100%)' : '',
                        color: activeTab === 'camera' ? 'white' : '#618961'
                    }}
                >
                    <span className="text-[4rem] drop-shadow-xl mb-1">📸</span>
                    <span className="text-2xl font-[900] tracking-tighter uppercase">Foto</span>
                </button>

                <button
                    onClick={() => setActiveTab('text')}
                    className={`aspect-square rounded-[2rem] flex flex-col items-center justify-center transition-all ${activeTab === 'text' ? 'shadow-2xl scale-105 z-10 border-4 border-white' : 'opacity-60 hover:opacity-100 scale-100 bg-slate-100 dark:bg-slate-800'}`}
                    style={{
                        background: activeTab === 'text' ? 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' : '',
                        color: activeTab === 'text' ? 'white' : '#1e40af'
                    }}
                >
                    <span className="text-[4rem] drop-shadow-xl mb-1">✍️</span>
                    <span className="text-2xl font-[900] tracking-tighter uppercase">Testo</span>
                </button>

                <button
                    onClick={() => setActiveTab('barcode')}
                    className={`aspect-square rounded-[2rem] flex flex-col items-center justify-center transition-all ${activeTab === 'barcode' ? 'shadow-2xl scale-105 z-10 border-4 border-white' : 'opacity-60 hover:opacity-100 scale-100 bg-slate-100 dark:bg-slate-800'}`}
                    style={{
                        background: activeTab === 'barcode' ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : '',
                        color: activeTab === 'barcode' ? 'white' : '#92400e'
                    }}
                >
                    <span className="text-[4rem] drop-shadow-xl mb-1">🤳</span>
                    <span className="text-2xl font-[900] tracking-tighter uppercase">Codice</span>
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
                            <div className="p-12 rounded-full bg-gradient-to-br from-[#13ec13] to-[#0ea50e] shadow-2xl shadow-green-500/40 mb-10 group-hover:scale-110 transition-transform duration-500 border-8 border-white/40">
                                <Camera size={120} color="white" strokeWidth={3} />
                            </div>
                            <span className="text-7xl font-[900] text-[#111811] tracking-tighter">SCATTA ORA</span>
                            <span className="text-3xl text-[#618961] mt-8 font-black uppercase tracking-widest opacity-80">CARICA DALLA GALLERIA</span>
                        </button>
                    </div>
                )}

                {/* TEXT MODE */}
                {activeTab === 'text' && (
                    <div className="flex flex-col w-full gap-6">
                        <textarea
                            autoFocus
                            placeholder="Cosa hai mangiato?&#10;Es: 2 uova strapazzate..."
                            className="w-full h-[40rem] bg-white dark:bg-slate-900 border-2 border-blue-500/30 rounded-2xl p-4 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none shadow-xl text-6xl font-bold leading-snug"
                            value={textDescription}
                            onChange={(e) => setTextDescription(e.target.value)}
                        />
                        <button
                            onClick={handleTextSubmit}
                            disabled={!textDescription.trim()}
                            className="w-full h-24 rounded-2xl font-[900] text-3xl tracking-tighter shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-blue-500 to-indigo-600 border-4 border-white/20 uppercase"
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
                            <span className="bg-amber-500/90 text-white px-12 py-6 rounded-[2rem] text-4xl font-[900] backdrop-blur-md shadow-xl border-4 border-white/20 uppercase tracking-tighter">
                                Inquadra il codice
                            </span>
                        </div>
                    </div>
                )}
            </div>




        </div >
    );
}
