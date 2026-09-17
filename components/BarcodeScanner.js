'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Camera, RefreshCw, Keyboard, Zap, AlertCircle, ArrowRight } from 'lucide-react';

export default function BarcodeScanner({ onDetected, onClose }) {
    const scannerRef = useRef(null);
    const fileInputRef = useRef(null);
    const [cameraStatus, setCameraStatus] = useState('initializing'); // 'initializing', 'scanning', 'error', 'manual'
    const [errorMessage, setErrorMessage] = useState('');
    const [torchOn, setTorchOn] = useState(false);
    const [hasTorch, setHasTorch] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [isScanningFile, setIsScanningFile] = useState(false);

    useEffect(() => {
        let isCancelled = false;
        let html5QrCode = null;

        const startScanner = async () => {
            setCameraStatus('initializing');
            setErrorMessage('');

            // Assicurati che l'elemento DOM esista
            const readerElement = document.getElementById('barcode-reader');
            if (!readerElement) {
                console.warn('barcode-reader element not found');
                return;
            }

            try {
                html5QrCode = new Html5Qrcode('barcode-reader', {
                    formatsToSupport: [
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.EAN_8,
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.UPC_A,
                        Html5QrcodeSupportedFormats.UPC_E,
                        Html5QrcodeSupportedFormats.QR_CODE
                    ],
                    verbose: false
                });
                scannerRef.current = html5QrCode;

                const qrboxFunction = (viewfinderWidth, viewfinderHeight) => {
                    const width = Math.min(Math.floor(viewfinderWidth * 0.85), 320);
                    const height = Math.min(Math.floor(viewfinderHeight * 0.5), 180);
                    return { width, height };
                };

                const config = {
                    fps: 15,
                    qrbox: qrboxFunction,
                    aspectRatio: 1.0,
                    disableFlip: false
                };

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    config,
                    (decodedText) => {
                        if (isCancelled) return;
                        if (typeof navigator !== 'undefined' && navigator.vibrate) {
                            try { navigator.vibrate(100); } catch (_) {}
                        }
                        cleanupScanner();
                        onDetected(decodedText);
                    },
                    () => {
                        // Frame non decodificato, ignoriamo silenziosamente
                    }
                );

                if (isCancelled) {
                    cleanupScanner();
                    return;
                }

                setCameraStatus('scanning');

                // Verifica disponibilità torcia (flash)
                try {
                    const capabilities = html5QrCode.getRunningTrackCapabilities();
                    if (capabilities && 'torch' in capabilities) {
                        setHasTorch(true);
                    }
                } catch (_) {}

            } catch (err) {
                console.error('Barcode camera start failed:', err);
                if (!isCancelled) {
                    setCameraStatus('error');
                    let msg = 'Impossibile accedere alla fotocamera per la scansione.';
                    if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission')) {
                        msg = 'Permesso fotocamera negato. Abilita l\'accesso alla fotocamera nelle impostazioni del browser.';
                    } else if (err?.name === 'NotFoundError' || err?.message?.includes('found')) {
                        msg = 'Nessuna fotocamera compatibile trovata sul dispositivo.';
                    } else if (typeof window !== 'undefined' && window.isSecureContext === false) {
                        msg = 'L\'accesso alla fotocamera richiede una connessione protetta (HTTPS).';
                    }
                    setErrorMessage(msg);
                }
            }
        };

        const cleanupScanner = () => {
            if (scannerRef.current) {
                const scanner = scannerRef.current;
                scannerRef.current = null;
                if (scanner.isScanning) {
                    scanner.stop().then(() => {
                        scanner.clear();
                    }).catch((e) => console.warn('Scanner stop error:', e));
                } else {
                    scanner.clear();
                }
            }
        };

        // Piccolo delay per consentire al DOM di montare il contenitore
        const timer = setTimeout(() => {
            startScanner();
        }, 150);

        return () => {
            isCancelled = true;
            clearTimeout(timer);
            cleanupScanner();
        };
    }, []);

    const toggleTorch = async () => {
        if (!scannerRef.current || !hasTorch) return;
        try {
            const nextState = !torchOn;
            await scannerRef.current.applyVideoConstraints({
                advanced: [{ torch: nextState }]
            });
            setTorchOn(nextState);
        } catch (e) {
            console.warn('Torch toggle failed:', e);
        }
    };

    const handleFileScan = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanningFile(true);
        try {
            let scanner = scannerRef.current;
            if (!scanner) {
                scanner = new Html5Qrcode('barcode-reader', { verbose: false });
                scannerRef.current = scanner;
            } else if (scanner.isScanning) {
                await scanner.stop();
            }

            const decodedText = await scanner.scanFile(file, false);
            if (decodedText) {
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    try { navigator.vibrate(100); } catch (_) {}
                }
                onDetected(decodedText);
            }
        } catch (err) {
            console.error('File scan error:', err);
            alert('Nessun codice a barre leggibile trovato nella foto. Assicurati che il codice sia nitido e ben illuminato, oppure digitalo a mano.');
        } finally {
            setIsScanningFile(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        const clean = manualCode.trim();
        if (!clean) return;
        onDetected(clean);
    };

    const handleRetryCamera = () => {
        setCameraStatus('initializing');
        setErrorMessage('');
        if (scannerRef.current) {
            try {
                if (scannerRef.current.isScanning) scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (_) {}
            scannerRef.current = null;
        }
        setTimeout(() => {
            const readerElement = document.getElementById('barcode-reader');
            if (!readerElement) return;
            const html5QrCode = new Html5Qrcode('barcode-reader', { verbose: false });
            scannerRef.current = html5QrCode;
            html5QrCode.start(
                { facingMode: 'environment' },
                { fps: 15, qrbox: { width: 280, height: 160 }, aspectRatio: 1.0 },
                (decodedText) => {
                    onDetected(decodedText);
                },
                () => {}
            ).then(() => {
                setCameraStatus('scanning');
            }).catch(err => {
                setCameraStatus('error');
                setErrorMessage(err?.message || 'Errore riavvio fotocamera.');
            });
        }, 200);
    };

    return (
        <div className="w-full flex flex-col items-center bg-black text-white relative rounded-[3.5rem] overflow-hidden min-h-[480px]">
            {/* Pulsante chiusura in alto a destra */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-3">
                {hasTorch && cameraStatus === 'scanning' && (
                    <button
                        type="button"
                        onClick={toggleTorch}
                        className={`p-3 rounded-full backdrop-blur-md transition-all active:scale-95 shadow-xl border-2 ${
                            torchOn ? 'bg-amber-400 text-black border-amber-300' : 'bg-white/20 text-white border-white/20 hover:bg-white/30'
                        }`}
                        title="Torcia"
                    >
                        <Zap size={26} strokeWidth={2.5} />
                    </button>
                )}
                <button
                    type="button"
                    onClick={onClose}
                    className="p-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white transition-all active:scale-95 shadow-xl border-2 border-white/20 cursor-pointer"
                    title="Chiudi"
                >
                    <X size={26} strokeWidth={2.5} />
                </button>
            </div>

            {/* Input file nascosto per scattare foto da fotocamera nativa o galleria */}
            <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileScan}
            />

            {/* Vista 1: Modalità Manuale */}
            {cameraStatus === 'manual' ? (
                <div className="w-full p-8 flex flex-col items-center justify-center min-h-[450px] gap-6 animate-in fade-in duration-200">
                    <div className="p-6 rounded-full bg-amber-500/20 text-amber-400 border-2 border-amber-500/40">
                        <Keyboard size={48} strokeWidth={2.5} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-3xl font-black uppercase tracking-tight">Inserisci Codice a Barre</h3>
                        <p className="text-lg text-slate-400 font-bold mt-1">Digita i numeri posti sotto il codice (es. 800...)</p>
                    </div>
                    <form onSubmit={handleManualSubmit} className="w-full max-w-md flex flex-col gap-4">
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            autoFocus
                            placeholder="Codice a barre (EAN)"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value.replace(/[^0-9]/g, ''))}
                            className="w-full py-4 px-6 bg-slate-900 border-4 border-amber-500/40 rounded-2xl text-center text-3xl font-black tracking-widest text-white outline-none focus:border-amber-400"
                        />
                        <button
                            type="submit"
                            disabled={!manualCode.trim()}
                            className="w-full py-5 bg-amber-500 hover:bg-amber-400 text-black font-black text-2xl rounded-2xl flex items-center justify-center gap-3 shadow-xl active:scale-95 disabled:opacity-40 transition-all uppercase tracking-tight cursor-pointer"
                        >
                            <span>Cerca Prodotto</span>
                            <ArrowRight size={28} strokeWidth={3} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraStatus('initializing')}
                            className="w-full py-3 text-slate-400 hover:text-white font-bold text-lg text-center"
                        >
                            Torna alla Fotocamera
                        </button>
                    </form>
                </div>
            ) : (
                /* Vista 2: Fotocamera Live con Fallback */
                <div className="w-full relative flex flex-col items-center justify-center min-h-[460px]">
                    {/* Contenitore effettivo di Html5Qrcode */}
                    <div
                        id="barcode-reader"
                        className="w-full h-full min-h-[380px] flex items-center justify-center overflow-hidden"
                    ></div>

                    {/* Stato Inizializzazione */}
                    {cameraStatus === 'initializing' && (
                        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-4 z-20">
                            <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-2xl font-black uppercase tracking-wider text-amber-400">Avvio fotocamera...</span>
                            <span className="text-sm text-slate-400 font-bold">Consenti l'accesso quando richiesto</span>
                        </div>
                    )}

                    {/* Stato Errore */}
                    {cameraStatus === 'error' && (
                        <div className="absolute inset-0 bg-slate-950 p-8 flex flex-col items-center justify-center text-center gap-6 z-30">
                            <div className="p-5 rounded-full bg-red-500/20 text-red-400 border-2 border-red-500/30">
                                <AlertCircle size={48} strokeWidth={2.5} />
                            </div>
                            <div className="space-y-2 max-w-md">
                                <h4 className="text-2xl font-black uppercase tracking-tight text-white">Fotocamera non avviata</h4>
                                <p className="text-base text-slate-300 font-bold">{errorMessage}</p>
                            </div>
                            <div className="flex flex-col gap-3 w-full max-w-sm">
                                <button
                                    type="button"
                                    onClick={handleRetryCamera}
                                    className="w-full py-4 bg-white/10 hover:bg-white/20 border-2 border-white/20 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition active:scale-95"
                                >
                                    <RefreshCw size={22} />
                                    Riprova fotocamera
                                </button>
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-xl flex items-center justify-center gap-3 shadow-lg transition active:scale-95"
                                >
                                    <Camera size={24} strokeWidth={2.5} />
                                    Scatta foto al codice
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCameraStatus('manual')}
                                    className="w-full py-3 text-slate-400 hover:text-white font-bold text-lg"
                                >
                                    Digita codice a mano
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Overlay Grafico di Guida per Scansione Live */}
                    {cameraStatus === 'scanning' && (
                        <>
                            {/* Cornice di puntamento centrata con angoli luminosi */}
                            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                                <div className="w-[82%] max-w-[320px] h-[170px] relative border-2 border-amber-400/40 rounded-3xl bg-amber-500/5 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                                    {/* Angoli sagomati stile mirino */}
                                    <span className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-xl"></span>
                                    <span className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-xl"></span>
                                    <span className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-xl"></span>
                                    <span className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-xl"></span>
                                    {/* Linea laser centrale animata */}
                                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse top-1/2 -translate-y-1/2"></div>
                                </div>
                            </div>

                            {/* Badge Guida inferiore */}
                            <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none z-20">
                                <span className="bg-black/75 text-amber-300 px-6 py-3 rounded-2xl text-xl font-black backdrop-blur-md border border-amber-400/30 uppercase tracking-wider shadow-xl inline-block">
                                    Inquadra il codice a barre
                                </span>
                            </div>
                        </>
                    )}

                    {/* Barra strumenti inferiore per Fallback rapido */}
                    <div className="w-full bg-slate-900/90 backdrop-blur-md p-4 border-t border-white/10 flex items-center justify-around gap-2 z-30">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanningFile}
                            className="flex-1 py-3 px-2 bg-white/10 hover:bg-white/20 active:scale-95 rounded-2xl text-white font-black text-base sm:text-lg flex items-center justify-center gap-2 border border-white/15 transition-all cursor-pointer"
                        >
                            {isScanningFile ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Camera size={22} strokeWidth={2.5} />
                            )}
                            <span>Scatta Foto</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCameraStatus('manual')}
                            className="flex-1 py-3 px-2 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-2 border border-amber-500/40 transition-all cursor-pointer"
                        >
                            <Keyboard size={22} strokeWidth={2.5} />
                            <span>Digita a Mano</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
