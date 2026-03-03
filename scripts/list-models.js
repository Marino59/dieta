
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const apiKeyMatch = envContent.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim().replace(/^"|"$/g, '') : null;

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-flash-latest", "gemini-1.5-flash-8b"];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent("Hi");
            const response = await result.response;
            console.log(`OK: ${modelName}`);
        } catch (error) {
            console.log(`FAIL: ${modelName} - ${error.message.substring(0, 50)}...`);
        }
    }
}

listModels();
