
const { GoogleGenerativeAI } = require("@google/generative-ai");
// require('dotenv').config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to get client
        // Actually we need the model manager equivalent, but the SDK simplifies it.
        // Wait, the SDK doesn't expose listModels directly on the main class easily in all versions?
        // Let's try the standard way if available, or just test a few well known ones.

        // Actually, checking documentation, we can use the API directly or check via a simple fetch if SDK is obscure.
        // Let's use a raw fetch to be sure what the API sees.

        const key = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

        console.log("Fetching models from:", url);
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log("Error:", data);
        }

    } catch (e) {
        console.error(e);
    }
}

run();
