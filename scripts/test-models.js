import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);

async function listModels() {
    try {
        console.log("Listing available models...\n");

        // Try different model names
        const modelsToTry = [
            "gemini-pro",
            "gemini-1.5-pro",
            "gemini-1.5-flash",
            "gemini-2.0-flash-exp",
            "models/gemini-pro",
            "models/gemini-1.5-pro"
        ];

        for (const modelName of modelsToTry) {
            try {
                console.log(`Testing: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                const response = await result.response;
                console.log(`✓ ${modelName} WORKS!`);
                console.log(`Response: ${response.text().substring(0, 50)}...\n`);
                break; // Found a working model
            } catch (error) {
                console.log(`✗ ${modelName} failed: ${error.message.substring(0, 100)}\n`);
            }
        }
    } catch (error) {
        console.error("Fatal error:", error);
    }
}

listModels();
