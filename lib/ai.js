import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

export async function analyzeFoodImage(base64Image, profileContext = {}, mimeType = "image/jpeg") {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const dietRules = profileContext.dietaryRestrictions
            ? `Le caratteristiche e regole dietetiche dell'utente sono: "${profileContext.dietaryRestrictions}". Assicurati di segnalare (nel campo "analysis") se il cibo analizzato contrasta con queste regole con un chiaro "⚠️ ATTENZIONE:".`
            : '';

        const prompt = `
        Analizza questa immagine di cibo e fornisci i seguenti dati nutrizionali stimati in formato JSON puro (senza markdown, senza backticks).
        Identifica il piatto principale o i piatti presenti.
        ${dietRules}
        
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

export async function updateAnalysisFromText(mealName, quantity, profileContext = {}) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const dietRules = profileContext.dietaryRestrictions
            ? `Le caratteristiche e regole dietetiche dell'utente sono: "${profileContext.dietaryRestrictions}". Assicurati di segnalare se il cibo contrasta con queste regole con un "⚠️ ATTENZIONE:".`
            : '';

        const prompt = `
        L'utente sta modificando la quantità di un pasto precedentemente registrato.
        Piatto: "${mealName}"
        Nuova quantità: ${quantity}g
        ${dietRules}

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

export async function analyzeBarcodeProduct(productData, profileContext = {}) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const dietRules = profileContext.dietaryRestrictions
            ? `Le caratteristiche e regole dietetiche dell'utente sono: "${profileContext.dietaryRestrictions}". Assicurati di segnalare chiaramente eventuali criticità rispetto a queste regole con un "⚠️ ATTENZIONE:".`
            : "Nessuna restrizione particolare fornita.";

        const goalInfo = profileContext.goalDescription
            ? `L'obiettivo dell'utente è: "${profileContext.goalDescription}".`
            : "";

        const prompt = `
        Sei un nutrizionista esperto. Valuta la qualità di questo prodotto confezionato scansionato dall'utente.
        
        Nome prodotto: ${productData.name}
        Ingredienti: ${productData.ingredients || "Non specificati"}
        
        Valori principali (per 100g): 
        - Calorie: ${productData.calories}kcal, Proteine: ${productData.protein}g, Carboidrati: ${productData.carbs}g, Grassi: ${productData.fat}g
        
        Dettagli micronutrienti (se presenti nel testo):
        - Zuccheri: ${productData.rawNutriments?.sugars_100g || 0}g
        - Grassi saturi: ${productData.rawNutriments?.['saturated-fat_100g'] || 0}g
        - Sodio: ${productData.rawNutriments?.sodium_100g || 0}g
        - Calcio: ${productData.rawNutriments?.calcium_100g || 0}g
        
        ${goalInfo}
        ${dietRules}
        
        Compito:
        Fornisci un parere critico e generale sulla QUALITÀ del prodotto. 
        MOLTO IMPORTANTE: Se un'immagine dell'etichetta nutrizionale o del prodotto è allegata a questo prompt, LEGGILA ATTENTAMENTE per trovare i valori dei micronutrienti (es. per l'acqua leggi Calcio, Magnesio, Sodio, Residuo Fisso).
        Usa i dati letti dall'immagine se non sono presenti nel testo sopra.
        Cerca di capire se è un prodotto sano, ultra-processato o una buona scelta.
        Se si tratta di acqua minerale, analizza il residuo fisso e i sali minerali (es. adatta per diete asodiche se il sodio è basso, utile per le ossa se il calcio è alto).
        Spiega se sia adatto rispetto agli obiettivi e alla dieta dell'utente.
        Sii onesto, analitico ma conciso (massimo 4 frasi, in italiano).
        Rispondi ESCLUSIVAMENTE con il testo del tuo commento. Non ripetere i valori se non per fare un'osservazione specifica.
        `;

        const targetImageUrl = productData.nutritionImageUrl || productData.imageUrl;
        let finalPrompt = prompt;
        if (targetImageUrl) {
            finalPrompt += `\nEcco il link all'immagine del prodotto o etichetta nutrizionale: ${targetImageUrl}\nSe ti servono dati non presenti nel prompt (es. sali minerali dell'acqua), prova ad analizzare questa immagine.`;
        }

        const result = await model.generateContent(finalPrompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Gemini Barcode Analysis Error:", error);
        throw new Error("Impossibile analizzare il prodotto con l'AI al momento.");
    }
}
export async function analyzeFoodText(description, referenceDate = new Date(), profileContext = {}) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const dateStr = referenceDate.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const dietRules = profileContext.dietaryRestrictions
            ? `Le caratteristiche e regole dietetiche dell'utente sono: "${profileContext.dietaryRestrictions}". Assicurati di segnalare (nel campo "analysis") se il cibo analizzato contrasta con queste regole con un chiaro "⚠️ ATTENZIONE:".`
            : '';

        const prompt = `
        Analizza questa descrizione di cibo: "${description}"
        Data di riferimento (oggi): ${dateStr}
        ${dietRules}
        
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

export async function calculateTargetsFromGoal(goalDescription, currentProfile) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const profileStr = JSON.stringify({
            weight: currentProfile.weight,
            height: currentProfile.height,
            age: currentProfile.age,
            sex: currentProfile.sex,
            activityLevel: currentProfile.activityLevel
        });

        const prompt = `
        Analizza l'obiettivo di fitness dell'utente: "${goalDescription}"
        Considera i suoi dati attuali: ${profileStr}
        
        Compiti:
        1. Calcola il BMR (Mifflin-St Jeor) e il TDEE (TDEE = BMR * activityLevel).
        2. Determina il deficit o surplus calorico ideale per raggiungere l'obiettivo in modo sano (max 0.5-1kg a settimana).
        3. Calcola i macro suggeriti (Proteine: 1.8-2.2g/kg, Grassi: 20-30% kcal, Carbo: rimanenti).
        
        Rispondi ESCLUSIVAMENTE con un oggetto JSON:
        {
            "targetCalories": intero,
            "protein": intero (grammi),
            "carbs": intero (grammi),
            "fat": intero (grammi),
            "explanation": "Breve spiegazione tecnica del calcolo e consigli (max 3 frasi, in italiano)"
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(cleanText);
    } catch (error) {
        console.error("AI Goal Calculation Error:", error);
        throw new Error("Impossibile calcolare gli obiettivi con l'AI. Riprova tra poco.");
    }
}

export async function getDailyCoachAdvice(profile, caloriesConsumed) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const profileContext = JSON.stringify({
            goal: profile.goalDescription,
            targetCalories: profile.targetCalories,
            caloriesConsumed: caloriesConsumed,
            remaining: profile.targetCalories - caloriesConsumed,
            dietaryRestrictions: profile.dietaryRestrictions || "Nessuna restrizione particolare"
        });

        const prompt = `
        Sei un coach nutrizionale amichevole e incoraggiante.
        Contesto utente: ${profileContext}
        
        Compiti:
        1. Fornisci un breve consiglio motivazionale (max 2 frasi) basato sull'obiettivo.
        2. Proponi una ricetta salutare e veloce che si adatti alle calorie rimanenti e RISPETTI SCRUPOLOSAMENTE eventuali restrizioni dietetiche, allergie o patologie menzionate in "dietaryRestrictions".
        
        Rispondi ESCLUSIVAMENTE con un oggetto JSON:
        {
            "tip": "Testo del consiglio motivazionale",
            "recipe": {
                "name": "Titolo ricetta",
                "content": "Breve descrizione degli ingredienti e preparazione (max 3 frasi)",
                "why": "Perché è adatta a te oggi"
            }
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Daily Coach AI Error:", error);

        // Friendly fallback for quota or generic errors
        return {
            tip: "Ogni pasto sano è un mattone per la tua nuova versione. Continua così!",
            recipe: {
                "name": "Spuntino Equilibrio",
                "content": "Uno yogurt greco con una manciata di noci e un pizzico di cannella. Veloce e nutriente!",
                "why": "Perfetto per darti energia costante senza appesantirti."
            }
        };
    }
}
export async function getHungryAdvice(profile, caloriesConsumed) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const now = new Date();
        const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

        const context = JSON.stringify({
            time: timeStr,
            goal: profile.goalDescription,
            targetCalories: profile.targetCalories,
            caloriesConsumed: caloriesConsumed,
            remaining: profile.targetCalories - caloriesConsumed,
            dietaryRestrictions: profile.dietaryRestrictions || "Nessuna restrizione"
        });

        const prompt = `
        L'utente ha cliccato sul tasto "HO FAME". 
        Contesto attuale: ${context}
        
        Compiti:
        1. Identifica se è un orario appropriato per uno spuntino (es. metà mattina, merenda, dopo cena).
        2. In base alle calorie rimanenti e all'obiettivo, suggerisci uno spuntino specifico, veloce e salutare che RISPETTI SCRUPOLOSAMENTE eventuali restrizioni dietetiche o patologie (dietaryRestrictions).
        3. Se ha già superato le calorie, suggerisci qualcosa di leggerissimo o un'attività alternativa (es. bere acqua, camminata).
        
        Rispondi ESCLUSIVAMENTE con un oggetto JSON:
        {
            "message": "Un commento empatico e breve (max 15 parole)",
            "snack": "Nome dello spuntino consigliato",
            "reason": "Perché questo spuntino è perfetto ora (max 1 frase)"
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        return JSON.parse(cleanText);
    } catch (error) {
        console.error("Hungry AI Error:", error);
        return {
            message: "Sentire un po' di fame è normale. Bevi un bicchiere d'acqua!",
            snack: "Una mela o poche mandorle",
            reason: "Uno spuntino leggero e croccante per placare l'appetito."
        };
    }
}
