
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load API key from .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const apiKeyMatch = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim().replace(/^"|"$/g, '') : null;
process.env.NEXT_PUBLIC_GEMINI_API_KEY = apiKey;

async function verify() {
    try {
        console.log("Testing with API Key:", apiKey ? "LOADED" : "NOT FOUND");
        const { analyzeFoodText } = await import('../lib/ai.js');
        console.log("Testing analyzeFoodText...");
        const result = await analyzeFoodText("ho mangiato 100g di riso");
        console.log("Result:", JSON.stringify(result, null, 2));
        if (result && result.name) {
            console.log("VERIFICATION SUCCESSFUL");
        } else {
            console.error("VERIFICATION FAILED: Unexpected result");
        }
    } catch (error) {
        console.error("VERIFICATION FAILED with error:", error.message);
        if (error.stack) console.error(error.stack);
    }
}

verify();
