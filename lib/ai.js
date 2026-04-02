import { GoogleGenerativeAI } from "@google/generative-ai";

let genAI = null;
const GEMINI_MODEL = "gemini-flash-latest";

function getGenAI() {
    if (!genAI) {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        if (!apiKey) {
            console.error("AI Error: NEXT_PUBLIC_GEMINI_API_KEY is not defined");
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

function handleAIError(error, defaultMessage) {
    console.error("AI Error:", error);
    if (error.message?.includes("429") || error.message?.includes("Too Many Requests") || error.message?.includes("Quota exceeded")) {
        return "Limite di richieste raggiunto. Per favore attendi qualche minuto o riprova domani.";
    }
    return defaultMessage;
}

export async function analyzeFoodImage(base64Image, profileContext = {}, mimeType = "image/jpeg") {
    try {
        const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

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
        throw new Error(handleAIError(error, "Impossibile analizzare l'immagine al momento."));
    }
}

export async function updateAnalysisFromText(mealName, quantity, profileContext = {}) {
    try {
        const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

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
        return handleAIError(error, "Impossibile aggiornare l'analisi al momento.");
    }
}

export async function analyzeBarcodeProduct(productData, profileContext = {}) {
    try {
        const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

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
        VALUTA CON ATTENZIONE GLI INGREDIENTI: analizzali considerando che sono elencati in ordine decrescente di quantità. Soffermati sui primi ingredienti per capire cosa compone realmente il prodotto e se ci sono zuccheri, grassi di scarsa qualità o additivi problematici nelle prime posizioni.
        MOLTO IMPORTANTE: Se un'immagine dell'etichetta nutrizionale o del prodotto è allegata a questo prompt, LEGGILA ATTENTAMENTE per trovare i valori dei micronutrienti (es. per l'acqua leggi Calcio, Magnesio, Sodio, Residuo Fisso).
        Usa i dati letti dall'immagine se non sono presenti nel testo sopra.
        Cerca di capire se è un prodotto sano, ultra-processato o una buona scelta.
        Se si tratta di acqua minerale, analizza il residuo fisso e i sali minerali (es. adatta per diete asodiche se il sodio è basso, utile per le ossa se il calcio è alto).
        Spiega se sia adatto rispetto agli obiettivi e alla dieta dell'utente.
        Sii onesto e analitico.
        
        Rispondi ESCLUSIVAMENTE con un file JSON con questa esatta struttura:
        {
            "healthScore": numero (da 0 a 100, dove 100 è eccellente e 0 è pessimo),
            "advice": "Il tuo parere da nutrizionista, focalizzato su salute, ingredienti e adeguatezza per l'utente (max 4 frasi).",
            "pros": ["Punto a favore 1", "Punto a favore 2"],
            "cons": ["Punto a sfavore 1", "Punto a sfavore 2"]
        }
        Non includere testo al di fuori del JSON.
        `;

        const targetImageUrl = productData.nutritionImageUrl || productData.imageUrl;
        let finalPrompt = prompt;
        if (targetImageUrl) {
            finalPrompt += `\nEcco il link all'immagine del prodotto o etichetta nutrizionale: ${targetImageUrl}\nSe ti servono dati non presenti nel prompt (es. sali minerali dell'acqua), prova ad analizzare questa immagine.`;
        }

        const result = await model.generateContent(finalPrompt);
        const response = await result.response;
        const text = response.text();

        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        try {
            return JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse Barcode AI response:", cleanText);
            throw new Error("Invalid format from AI");
        }
    } catch (error) {
        throw new Error(handleAIError(error, "Impossibile analizzare il prodotto con l'AI al momento."));
    }
}
export async function analyzeFoodText(description, referenceDate = new Date(), profileContext = {}) {
    try {
        const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

        // Ensure referenceDate is a valid Date object
        const dateObj = (referenceDate instanceof Date && !isNaN(referenceDate)) ? referenceDate : new Date(referenceDate);
        const dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
        throw new Error(handleAIError(error, "L'IA non è riuscita a capire questa frase. Riprova con qualcosa di più semplice."));
    }
}

export async function calculateTargetsFromGoal(goalDescription, currentProfile) {
    try {
        const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

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
        throw new Error(handleAIError(error, "Impossibile calcolare gli obiettivi con l'AI. Riprova tra poco."));
    }
}

export async function getDailyCoachAdvice(profile, meals = [], weights = []) {
    try {
        const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

        const caloriesConsumed = meals.reduce((sum, m) => sum + (m.calories || 0), 0);

        const weightContext = weights.length > 0
            ? `Storico peso recente: ${weights.slice(-5).map(w => `${w.weight}kg (${new Date(w.created_at).toLocaleDateString('it-IT')})`).join(', ')}. Peso attuale: ${weights[weights.length - 1].weight}kg.`
            : "Nessun dato di peso recente disponibile.";

        const mealsContext = meals.length > 0
            ? `Pasti già consumati oggi: ${meals.map(m => `${m.name} (${m.calories} kcal)`).join(', ')}.`
            : "Nessun pasto ancora registrato oggi.";

        const profileContext = JSON.stringify({
            goal: profile.goalDescription,
            targetCalories: profile.targetCalories,
            caloriesConsumed: caloriesConsumed,
            remaining: profile.targetCalories - caloriesConsumed,
            dietaryRestrictions: profile.dietaryRestrictions || "Nessuna restrizione particolare",
            weightHistory: weightContext,
            dailyMeals: mealsContext,
            currentTime: new Date().toLocaleTimeString('it-IT'),
            currentDate: new Date().toLocaleDateString('it-IT', { weekday: 'long' })
        });

        const prompt = `
        Sei un coach nutrizionale amichevole e incoraggiante.
        Contesto utente: ${profileContext}
        
        Compiti:
        1. Fornisci un consiglio motivazionale molto breve ma potente (max 15-20 parole). 
           IMPORTANTE: Sii creativo e Varia SEMPRE lo stile. Non usare sempre le stesse frasi. 
           Commenta l'andamento del peso se disponibile, o incoraggia a pesarsi.
        2. Proponi una ricetta salutare e veloce per CENA (o per il prossimo pasto importante).
           IMPORTANTE:
           - Sii complementare: se l'utente ha già mangiato carboidrati (pasta, pane) a pranzo, proponi proteine e verdure, e viceversa.
           - Rispetta SCRUPOLOSAMENTE i gusti, le allergie e le patologie scritte in "dietaryRestrictions".
           - La ricetta deve stare nelle calorie rimanenti.
        
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
        const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

        const remaining = profile.targetCalories - caloriesConsumed;
        const profileContext = JSON.stringify({
            goal: profile.goalDescription,
            remainingCalories: remaining,
            dietaryRestrictions: profile.dietaryRestrictions || "Nessuna restrizione particolare",
            currentTime: new Date().toLocaleTimeString('it-IT')
        });

        const prompt = `
        Sei un coach nutrizionale. L'utente ha fame e mancano ${remaining} kcal al target giornaliero.
        Contesto attuale: ${profileContext}
        
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

export async function parseWeightGoal(goalDescription) {
    try {
        const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

        const prompt = `
        Analizza la seguente descrizione dell'obiettivo di peso di un utente: "${goalDescription}"
        
        Compiti:
        1. Estrai il peso target (in kg).
        2. Estrai la durata prevista (in giorni o settimane, converti in GIORNI).
        
        Rispondi ESCLUSIVAMENTE con un oggetto JSON:
        {
            "targetWeight": numero (kg),
            "targetDays": numero (giorni totali)
        }
        
        Esempio: "Voglio perdere 10kg in 3 mesi" -> {"targetWeight": ..., "targetDays": 90}
        Se non trovi un dato, usa null.
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
        console.error("AI Goal Parsing Error:", error);
        return { targetWeight: null, targetDays: null };
    }
}

export async function analyzeMenuImage(base64Image, profileContext = {}, caloriesAlreadyConsumed = 0) {
    try {
        const model = getGenAI().getGenerativeModel({ model: GEMINI_MODEL });

        const remainingCalories = (profileContext.targetCalories || 2000) - caloriesAlreadyConsumed;
        const dietRules = profileContext.dietaryRestrictions
            ? `Restrizioni e caratteristiche dietetiche dell'utente: "${profileContext.dietaryRestrictions}". Segnala con ⚠️ eventuali piatti che le violano.`
            : '';
        const goalInfo = profileContext.goalDescription
            ? `Obiettivo dell'utente: "${profileContext.goalDescription}".`
            : '';

        const prompt = `
        Sei un nutrizionista esperto. L'utente ti sta mostrando la foto di un menu di ristorante.
        Calorie già consumate oggi: ${caloriesAlreadyConsumed} kcal.
        Calorie rimanenti al budget giornaliero: ${remainingCalories} kcal.
        ${goalInfo}
        ${dietRules}

        Compiti:
        1. Leggi tutti i piatti presenti nel menu.
        2. Stima le calorie approssimative di ciascun piatto identificato.
        3. Consiglia i 3 piatti MIGLIORI in base a: calorie rimanenti, salubrità, equilibrio nutrizionale e obiettivo dell'utente.
        4. Indica i piatti da EVITARE (troppo calorici, ultra-processati, o che violano le restrizioni).
        5. Scegli il MIGLIORE assoluto.

        Rispondi ESCLUSIVAMENTE con un oggetto JSON puro (senza markdown, senza backtick):
        {
            "recommendations": [
                {
                    "dish": "Nome piatto",
                    "estimatedCalories": 450,
                    "reason": "Perché è una buona scelta (1 frase)",
                    "healthScore": 80
                }
            ],
            "bestChoice": "Nome del piatto top consigliato",
            "avoidList": ["Piatto da evitare 1", "Piatto da evitare 2"],
            "summary": "Commento generale del nutrizionista (max 2 frasi, in italiano)"
        }
        `;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg"
            }
        };

        const result = await model.generateContent([prompt, imagePart]);
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
        throw new Error(handleAIError(error, "Impossibile analizzare il menu al momento. Riprova tra poco."));
    }
}
