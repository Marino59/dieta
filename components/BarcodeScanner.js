'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

export default function BarcodeScanner({ onDetected, onClose }) {
    const scannerRef = useRef(null);
    const [scanner, setScanner] = useState(null);

    useEffect(() => {
        // Initialize scanner
        const newScanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        newScanner.render(onScanSuccess, onScanFailure);

        setScanner(newScanner);

        function onScanSuccess(decodedText, decodedResult) {
            // Handle the scanned code
            console.log(`Scan result: ${decodedText}`, decodedResult);
            if (newScanner) {
                newScanner.clear().catch(err => console.error(err));
            }
            onDetected(decodedText);
        }

        function onScanFailure(error) {
            // handle scan failure, usually better to ignore and keep scanning.
            // console.warn(`Code scan error = ${error}`);
        }

        return () => {
            if (newScanner) {
                newScanner.clear().catch(error => console.error("Failed to clear scanner", error));
            }
        };
    }, []);

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center bg-black rounded-[4rem] overflow-hidden">
            <div className="absolute top-4 right-4 z-[70]">
                <button onClick={onClose} className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all active:scale-95 shadow-lg">
                    <X size={28} />
                </button>
            </div>
            {/* The scanner renders its own UI inside this div. Setting min-height ensures it doesn't collapse before init */}
            <div id="reader" className="w-full min-h-[300px] flex items-center justify-center"></div>
        </div>
    );
}
