'use client';

// Google Health API & Pixel Watch integration module
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '191250415086-v5c2g81u0gqcdtlr7g7a5bo1amn5enk5.apps.googleusercontent.com';

// Official nutrition write scopes
const HEALTH_SCOPES = [
    'https://www.googleapis.com/auth/googlehealth.nutrition.writeonly',
    'https://www.googleapis.com/auth/googlehealth.nutrition.readonly'
].join(' ');

const STORAGE_KEYS = {
    TOKEN: 'google_health_access_token',
    EXPIRES_AT: 'google_health_token_expires_at',
    AUTO_SYNC: 'google_health_auto_sync',
    USER_EMAIL: 'google_health_user_email'
};

/**
 * Checks if a valid, unexpired Google Health access token is available.
 */
export function isGoogleHealthConnected() {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.EXPIRES_AT) || '0', 10);
    // Consider token expired 60 seconds before actual expiry
    return Boolean(token && Date.now() < (expiresAt - 60000));
}

/**
 * Gets the current stored access token if valid.
 */
export function getGoogleHealthToken() {
    if (typeof window === 'undefined') return null;
    if (!isGoogleHealthConnected()) return null;
    return localStorage.getItem(STORAGE_KEYS.TOKEN);
}

/**
 * Checks if auto-sync is enabled.
 */
export function isGoogleHealthAutoSync() {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
    return val === null ? true : val === 'true';
}

/**
 * Sets the auto-sync preference.
 */
export function setGoogleHealthAutoSync(enabled) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.AUTO_SYNC, enabled ? 'true' : 'false');
}

/**
 * Disconnects Google Health by clearing stored credentials.
 */
export function disconnectGoogleHealth() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
}

/**
 * Prompts the user to connect and grant Google Health nutrition permissions via GIS popup.
 */
export function connectGoogleHealth() {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            return reject(new Error('Browser environment required'));
        }

        if (!window.google?.accounts?.oauth2) {
            return reject(new Error('Google Identity Services script not yet loaded. Riprova tra pochi secondi.'));
        }

        try {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: HEALTH_SCOPES,
                prompt: 'consent',
                callback: (tokenResponse) => {
                    if (tokenResponse.error) {
                        console.error('Google Health Auth Error:', tokenResponse);
                        return reject(new Error(tokenResponse.error_description || tokenResponse.error));
                    }

                    if (tokenResponse.access_token) {
                        const expiresInMs = (parseInt(tokenResponse.expires_in, 10) || 3600) * 1000;
                        const expiresAt = Date.now() + expiresInMs;

                        localStorage.setItem(STORAGE_KEYS.TOKEN, tokenResponse.access_token);
                        localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());

                        resolve({
                            accessToken: tokenResponse.access_token,
                            expiresAt
                        });
                    } else {
                        reject(new Error('Nessun token di accesso ricevuto da Google.'));
                    }
                },
            });

            // Request token via Google popup
            tokenClient.requestAccessToken();
        } catch (err) {
            console.error('Error initializing Google token client:', err);
            reject(err);
        }
    });
}

/**
 * Determines meal type according to the time of day.
 */
function determineMealType(date) {
    const hours = date.getHours();
    if (hours >= 5 && hours < 11) return 'BREAKFAST';
    if (hours >= 11 && hours < 15) return 'LUNCH';
    if (hours >= 15 && hours < 18) return 'SNACK';
    return 'DINNER';
}

/**
 * Logs a meal to the Google Health API (Pixel Watch & Fitbit ecosystem).
 * Endpoint: POST https://health.googleapis.com/v4/users/me/dataTypes/nutrition-log/dataPoints
 */
export async function syncMealToGoogleHealth(meal) {
    const token = getGoogleHealthToken();
    if (!token) {
        throw new Error('Pixel Watch / Google Health non collegato o token scaduto.');
    }

    const mealDate = meal.created_at ? new Date(meal.created_at) : new Date();
    const startTime = mealDate.toISOString();
    const endTime = new Date(mealDate.getTime() + 15 * 60 * 1000).toISOString();

    const calories = Math.round(Number(meal.calories) || 0);
    const protein = Math.round(Number(meal.protein) || 0);
    const carbs = Math.round(Number(meal.carbs) || 0);
    const fat = Math.round(Number(meal.fat) || 0);
    const foodName = meal.name || meal.description || 'Pasto Dieta';
    const mealType = determineMealType(mealDate);

    const payload = {
        nutritionLog: {
            interval: {
                startTime,
                endTime
            },
            foodDisplayName: foodName,
            energy: { kcal: calories },
            totalFat: { grams: fat },
            totalCarbohydrate: { grams: carbs },
            nutrients: [
                { nutrient: 'PROTEIN', quantity: { grams: protein } }
            ],
            mealType,
            serving: { amount: 1 }
        }
    };

    const response = await fetch('https://health.googleapis.com/v4/users/me/dataTypes/nutrition-log/dataPoints', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        let errMessage = `Errore API Google Health (${response.status})`;
        try {
            const errData = await response.json();
            if (errData?.error?.message) {
                errMessage += `: ${errData.error.message}`;
            }
        } catch (_) {
            const errText = await response.text();
            if (errText) errMessage += `: ${errText}`;
        }
        throw new Error(errMessage);
    }

    return await response.json();
}
