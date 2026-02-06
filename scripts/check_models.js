const key = "AIzaSyDb0049K3rxp946cyUiLqZRty-A7MBXYCI";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

console.log("Fetching models...");

fetch(url)
    .then(res => res.json())
    .then(data => {
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name} (${m.displayName})`);
                }
            });
        } else {
            console.log("Error:", JSON.stringify(data, null, 2));
        }
    })
    .catch(err => console.error(err));
