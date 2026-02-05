import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log("Checking API Key...\n");
console.log("Key exists:", !!process.env.NEXT_PUBLIC_GEMINI_API_KEY);
console.log("Key length:", process.env.NEXT_PUBLIC_GEMINI_API_KEY?.length || 0);
console.log("Key starts with:", process.env.NEXT_PUBLIC_GEMINI_API_KEY?.substring(0, 10) + "...");
console.log("\nIf the key exists but all models fail, the API key might be:");
console.log("1. Expired or invalid");
console.log("2. Out of quota (free tier limit reached)");
console.log("3. Not enabled for Gemini API");
console.log("\nPlease check: https://aistudio.google.com/apikey");
