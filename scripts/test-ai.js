
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// Manually parse .env.local
const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const apiKeyMatch = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim().replace(/^"|"$/g, '') : null;

const genAI = new GoogleGenerativeAI(apiKey);

async function test(description) {
    console.log(`\n--- Testing: "${description}" ---`);
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
        Analizza questa descrizione di cibo: "${description}"
        
        Restituisci i valori nutrizionali stimati.
        Se l'utente specifica un orario (es. "ore 7", "pranzo", "ieri"), estrai l'orario in formato "HH:MM" nel campo "time".
        
        Rispondi ESCLUSIVAMENTE con un oggetto JSON con questa struttura:
        {
            "name": "Nome del piatto",
            "quantity": 100 (intero, grammi),
            "calories": 0 (intero),
            "protein": 0 (intero),
            "carbs": 0 (intero),
            "fat": 0 (intero),
            "analysis": "Breve commento",
            "time": "HH:MM" (opzionale, o null)
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("Raw Response:", text);

        let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        }

        try {
            const parsed = JSON.parse(cleanText);
            console.log("Parsed Successfully:", parsed);
        } catch (error) {
            console.error("Parse Error:", error.message);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                console.log("Regex Fallback Parsed:", JSON.parse(jsonMatch[0]));
            } else {
                console.error("Regex Fallback Failed");
            }
        }
    } catch (error) {
        console.error("Global Error:", error.message);
    }
}

async function run() {
    await test("pane e marmellata");
    await test("una tazza di latte");
}

run();
