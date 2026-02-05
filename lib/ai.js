import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export async function analyzeFoodImage(base64Image, mimeType = "image/jpeg") {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
        Analizza questa immagine di cibo e fornisci i seguenti dati nutrizionali stimati in formato JSON puro (senza markdown, senza backticks).
        Identifica il piatto principale o i piatti presenti.
        
        Rispondi ESCLUSIVAMENTE con un oggetto JSON con questa struttura:
        {
            "name": "Nome del piatto",
            "quantity": quantità in grammi (numero intero stimato),
            "calories": calorie totali (numero intero),
            "protein": proteine in grammi (numero intero),
            "carbs": carboidrati in grammi (numero intero),
            "fat": grassi in grammi (numero intero),
            "analysis": "Breve descrizione nutrizionale e commenti sulla salubrità del pasto (max 2 frasi, in italiano)"
        }
        `;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        console.log("--- RAW GEMINI RESPONSE ---");
        console.log(text);
        console.log("---------------------------");

        // Clean up markdown if present (e.g. ```json ... ``` or ```JSON ... ```)
        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();

        // Sometimes the model might add extra text before or after the JSON. 
        // We can try to find the first '{' and last '}'
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        try {
            const data = JSON.parse(cleanText);
            return data;
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError);
            console.error("Failed to parse text:", cleanText);
            throw new Error("Invalid JSON response from AI");
        }

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        throw error; // Re-throw to be caught by the route handler
    }
}

export async function updateAnalysisFromText(mealName, quantity) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
        L'utente sta modificando la quantità di un pasto precedentemente registrato.
        Piatto: "${mealName}"
        Nuova quantità: ${quantity}g

        Fornisci SOLO un nuovo commento/analisi nutrizionale ("analysis") aggiornato per questa specifica quantità.
        Se la quantità è eccessiva (es. > 200g per pasta, > 500g per carne), avvisa l'utente.
        Se è scarsa, fallo notare.
        Sii conciso (max 2 frasi) e parla in italiano.
        Non restituire JSON, solo il testo del commento.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Gemini Text Update Error:", error);
        return "Impossibile aggiornare l'analisi al momento."; // Fallback
    }
}
export async function analyzeFoodText(description, referenceDate = new Date()) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const dateStr = referenceDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const prompt = `
        Analizza questa descrizione di cibo: "${description}"
        Data di riferimento (oggi): ${dateStr}
        
        Compiti:
        1. Estrai i valori nutrizionali stimati.
        2. Se l'utente specifica un orario (es. "ore 7", "pranzo") o un giorno relativo (es. "ieri", "stamattina", "due giorni fa"), calcola la data e l'ora precise.
        
        Rispondi ESCLUSIVAMENTE con un oggetto JSON:
        {
            "name": "Nome del piatto",
            "quantity": 100 (intero, grammi),
            "calories": 0 (intero),
            "protein": 0 (intero),
            "carbs": 0 (intero),
            "fat": 0 (intero),
            "analysis": "Breve commento (max 2 frasi)",
            "time": "HH:MM" (opzionale, o null),
            "date": "YYYY-MM-DD" (data calcolata in base alla descrizione e alla data di riferimento)
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Robust Manual Extraction Logic
        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();

        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        try {
            return JSON.parse(cleanText);
        } catch (error) {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw error;
        }
    } catch (error) {
        console.error("Gemini Text Analysis Error:", error);

        if (error.message?.includes("429") || error.message?.includes("Too Many Requests") || error.message?.includes("Quota exceeded")) {
            // Try to extract retry delay from error message
            const retryMatch = error.message?.match(/retryDelay[\":]+(\\d+)s/);
            const seconds = retryMatch ? retryMatch[1] : "60";
            throw new Error(`Limite richieste raggiunto. Attendi ${seconds} secondi e riprova.`);
        }

        if (error.message?.includes("404") || error.message?.includes("not found")) {
            throw new Error("Modello AI non disponibile. Contatta il supporto.");
        }

        throw new Error("L'IA non è riuscita a capire questa frase. Riprova con qualcosa di più semplice.");
    }
}
