import { useState, useRef } from 'react';
import { Camera, Loader2, ScanBarcode, Edit2, Send, X as CloseIcon } from 'lucide-react';
import ConfirmMealModal from './ConfirmMealModal';
import BarcodeScanner from './BarcodeScanner';
import { analyzeFoodImage, analyzeFoodText } from '@/lib/ai';
import { addMeal } from '@/lib/firestore';
import { getProductFromBarcode } from '@/lib/openfoodfacts';

export default function CameraInput({ onMealAdded, hideButtons, defaultDate }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [pendingMeal, setPendingMeal] = useState(null);
    const [pendingImage, setPendingImage] = useState(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [textDescription, setTextDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

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
            setPendingMeal(data); // Show confirmation modal
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

            setPendingMeal({
                ...data,
                date: finalDate
            });
            setTextDescription("");
            setIsTyping(false);
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
            setPendingMeal(data);
        } catch (error) {
            console.error(error);
            alert("Prodotto non trovato o errore di scansione.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleConfirmMeal = async (confirmedData) => {
        setIsSaving(true);
        try {
            // Sanitize data to prevent Firestore errors (NaN, undefined)
            const safeNumber = (val) => {
                const num = parseFloat(val);
                return isNaN(num) ? 0 : Math.round(num);
            };

            const cleanData = {
                name: confirmedData.name || "Pasto sconosciuto",
                quantity: safeNumber(confirmedData.quantity) || 100,
                calories: safeNumber(confirmedData.calories),
                protein: safeNumber(confirmedData.protein),
                carbs: safeNumber(confirmedData.carbs),
                fat: safeNumber(confirmedData.fat),
                analysis: confirmedData.analysis || "",
            };

            // Use the date selected by the user in the modal
            const finalDate = confirmedData.date ? new Date(confirmedData.date) : new Date();

            const mealData = {
                ...cleanData,
                image_path: pendingImage, // Storing base64 string directly (max 1024px compressed is <500KB)
                created_at: finalDate
            };

            const newMeal = await addMeal(mealData);
            onMealAdded(newMeal);
            setPendingMeal(null);
            setPendingImage(null);
        } catch (error) {
            console.error(error);
            alert(`Errore durante il salvataggio: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelMeal = () => {
        setPendingMeal(null);
        if (pendingImage) {
            setPendingImage(null);
        }
    };

    return (
        <>
            {!pendingMeal && !isScanning && !hideButtons && (
                <div className="w-full mb-8 flex flex-col items-center animate-in fade-in duration-700">

                    {isTyping ? (
                        <div
                            className="w-full p-2 rounded-2xl flex items-center gap-2 border border-orange-500/30 shadow-lg shadow-orange-500/10"
                            style={{ backgroundColor: '#0f172a' }} // Solid slate-900 opaque background
                        >
                            <input
                                autoFocus
                                type="text"
                                placeholder="Cosa hai mangiato? (es: 2 uova e pane)"
                                className="flex-1 bg-transparent border-none focus:ring-0 px-3 py-2 text-lg placeholder-gray-400"
                                style={{ color: 'white' }}
                                value={textDescription}
                                onChange={(e) => setTextDescription(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleTextSubmit()}
                            />
                            <button
                                onClick={handleTextSubmit}
                                className="p-3 bg-blue-500 text-white rounded-xl hover:bg-blue-400 transition shadow-lg shadow-blue-500/20"
                            >
                                <Send size={24} />
                            </button>
                            <button
                                onClick={() => setIsTyping(false)}
                                className="p-3 bg-slate-800 text-gray-400 rounded-xl hover:text-white transition"
                            >
                                <CloseIcon size={24} />
                            </button>
                        </div>
                    ) : isAnalyzing ? (
                        <div className="w-full h-20 glass-panel rounded-2xl flex items-center justify-center gap-4 animate-pulse border border-blue-500/30">
                            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                            <span className="text-xl font-bold text-white">Analisi in corso...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 w-full gap-4">
                            {/* Manual Text Button */}
                            <button
                                onClick={() => setIsTyping(true)}
                                className="h-24 rounded-2xl flex flex-col items-center justify-center transition-all group active:scale-95"
                                style={{
                                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                    border: '2px solid #f97316',
                                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)'
                                }}
                            >
                                <Edit2 size={28} color="#fb923c" />
                                <span style={{ color: '#fb923c', fontSize: '12px', fontWeight: 'bold', marginTop: '8px', letterSpacing: '0.05em' }}>TESTO</span>
                            </button>

                            {/* Camera Button */}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="h-24 rounded-2xl flex flex-col items-center justify-center transition-all group active:scale-95 relative overflow-hidden"
                                style={{
                                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                    border: '2px solid #3b82f6',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                                }}
                            >
                                <Camera size={32} color="#60a5fa" />
                                <span style={{ color: '#60a5fa', fontSize: '12px', fontWeight: 'bold', marginTop: '8px', letterSpacing: '0.05em' }}>FOTO</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                            </button>

                            {/* Barcode Button */}
                            <button
                                onClick={() => setIsScanning(true)}
                                className="h-24 rounded-2xl flex flex-col items-center justify-center transition-all group active:scale-95"
                                style={{
                                    backgroundColor: 'rgba(30, 41, 59, 0.8)',
                                    border: '2px solid #10b981',
                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                <ScanBarcode size={28} color="#34d399" />
                                <span style={{ color: '#34d399', fontSize: '12px', fontWeight: 'bold', marginTop: '8px', letterSpacing: '0.05em' }}>CODICE</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {isScanning && (
                <BarcodeScanner
                    onDetected={handleBarcodeDetected}
                    onClose={() => setIsScanning(false)}
                />
            )}

            {pendingMeal && (
                <ConfirmMealModal
                    mealData={pendingMeal}
                    onConfirm={handleConfirmMeal}
                    onCancel={() => { setPendingMeal(null); setPendingImage(null); }}
                    isLoading={isSaving}
                    defaultDate={defaultDate}
                />
            )}
        </>
    );
}
