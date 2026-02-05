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
        <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col">
            <div className="flex justify-between items-center p-4">
                <h3 className="font-bold text-lg">Scan Barcode</h3>
                <button onClick={onClose} className="p-2 bg-gray-800 rounded-full">
                    <X size={24} />
                </button>
            </div>
            <div id="reader" className="w-full flex-1"></div>
            <p className="p-4 text-center text-sm text-gray-400">
                Point camera at a barcode to scan.
            </p>
        </div>
    );
}
