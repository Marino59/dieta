export async function getProductFromBarcode(barcode) {
    try {
        const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);

        if (!response.ok) {
            throw new Error('Product not found');
        }

        const data = await response.json();

        if (data.status !== 1 || !data.product) {
            throw new Error('Product not found or invalid data');
        }

        const p = data.product;
        // Nutriments are usually per 100g
        const nutriments = p.nutriments;

        return {
            name: p.product_name || "Sconosciuto",
            quantity: 100, // Default to 100g as we don't know the portion
            calories: Math.round(nutriments['energy-kcal_100g'] || 0),
            protein: Math.round(nutriments['proteins_100g'] || 0),
            carbs: Math.round(nutriments['carbohydrates_100g'] || 0),
            fat: Math.round(nutriments['fat_100g'] || 0),
            analysis: `Prodotto scansionato: ${p.brands || ''} ${p.product_name || ''}. Valori per 100g.`
        };

    } catch (error) {
        console.error("OpenFoodFacts Error:", error);
        throw error;
    }
}
