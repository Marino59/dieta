import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

async function testDirectAPI() {
    const modelsToTest = [
        { name: "gemini-1.5-flash", version: "v1beta" },
        { name: "gemini-1.5-flash", version: "v1" },
        { name: "gemini-1.5-flash-latest", version: "v1beta" },
        { name: "gemini-1.5-flash-latest", version: "v1" },
        { name: "gemini-pro", version: "v1beta" },
        { name: "gemini-pro", version: "v1" },
    ];

    console.log("Testing direct API calls...\n");

    for (const { name, version } of modelsToTest) {
        const url = `https://generativelanguage.googleapis.com/${version}/models/${name}:generateContent?key=${API_KEY}`;

        try {
            console.log(`Testing: ${name} (${version})`);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: "Say hello" }]
                    }]
                })
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✓ SUCCESS! Model: ${name}, Version: ${version}`);
                console.log(`Response: ${JSON.stringify(data).substring(0, 100)}...\n`);
                return { name, version }; // Return the working combination
            } else {
                console.log(`✗ Failed: ${data.error?.message || JSON.stringify(data).substring(0, 100)}\n`);
            }
        } catch (error) {
            console.log(`✗ Error: ${error.message}\n`);
        }
    }

    console.log("No working model found!");
}

testDirectAPI();
