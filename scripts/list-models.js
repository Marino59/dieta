import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

async function listAvailableModels() {
    const versions = ['v1beta', 'v1'];

    console.log("Fetching available models from Google API...\n");

    for (const version of versions) {
        const url = `https://generativelanguage.googleapis.com/${version}/models?key=${API_KEY}`;

        try {
            console.log(`Checking API version: ${version}`);
            const response = await fetch(url);
            const data = await response.json();

            if (response.ok && data.models) {
                console.log(`\n✓ Available models in ${version}:`);
                data.models.forEach(model => {
                    const supportsGenerate = model.supportedGenerationMethods?.includes('generateContent');
                    if (supportsGenerate) {
                        console.log(`  - ${model.name} (${model.displayName})`);
                    }
                });
                console.log();
            } else {
                console.log(`✗ Error: ${data.error?.message || 'Unknown error'}\n`);
            }
        } catch (error) {
            console.log(`✗ Fetch error: ${error.message}\n`);
        }
    }
}

listAvailableModels();
