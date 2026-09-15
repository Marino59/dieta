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
    USER_EMAIL: 'google_health_user_email',
    CONNECTED_FLAG: 'google_health_connected_flag'
};

/**
 * Checks if the user has connected Google Health (persists across sessions).
 */
export function isGoogleHealthConnected() {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(STORAGE_KEYS.CONNECTED_FLAG) === 'true';
}

/**
 * Gets the current stored access token if still valid.
 */
export function getGoogleHealthToken() {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    const expiresAt = parseInt(localStorage.getItem(STORAGE_KEYS.EXPIRES_AT) || '0', 10);
    if (token && Date.now() < (expiresAt - 60000)) {
        return token;
    }
    return null;
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
    localStorage.removeItem(STORAGE_KEYS.CONNECTED_FLAG);
}

/**
 * Obtains a valid token, refreshing silently in the background if expired.
 */
export async function getOrRefreshGoogleHealthToken(interactive = false) {
    const cached = getGoogleHealthToken();
    if (cached) return cached;

    if (!isGoogleHealthConnected() && !interactive) {
        throw new Error('Pixel Watch / Google Health non collegato.');
    }

    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') return reject(new Error('No window'));
        if (!window.google?.accounts?.oauth2) {
            return reject(new Error('Servizio Google non ancora pronto. Riprova.'));
        }

        try {
            const tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: HEALTH_SCOPES,
                prompt: interactive ? 'consent' : '',
                callback: (tokenResponse) => {
                    if (tokenResponse.error) {
                        if (!interactive && (tokenResponse.error === 'immediate_failed' || tokenResponse.error === 'user_logged_out')) {
                            // Silent refresh failed, user needs to re-connect once
                            disconnectGoogleHealth();
                        }
                        return reject(new Error(tokenResponse.error_description || tokenResponse.error));
                    }

                    if (tokenResponse.access_token) {
                        const expiresInMs = (parseInt(tokenResponse.expires_in, 10) || 3600) * 1000;
                        const expiresAt = Date.now() + expiresInMs;

                        localStorage.setItem(STORAGE_KEYS.TOKEN, tokenResponse.access_token);
                        localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
                        localStorage.setItem(STORAGE_KEYS.CONNECTED_FLAG, 'true');

                        resolve(tokenResponse.access_token);
                    } else {
                        reject(new Error('Nessun token ricevuto'));
                    }
                }
            });

            tokenClient.requestAccessToken({ prompt: interactive ? 'consent' : '' });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Connects Google Health explicitly (interactive consent popup).
 */
export function connectGoogleHealth() {
    return getOrRefreshGoogleHealthToken(true);
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
    const token = await getOrRefreshGoogleHealthToken();
    if (!token) {
        throw new Error('Pixel Watch / Google Health non collegato.');
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

    const result = await response.json();
    const dataPointName = result.name || (result.dataPoints && result.dataPoints[0]?.name) || null;
    return {
        ...result,
        dataPointName
    };
}

/**
 * Deletes a nutrition dataPoint from Google Health API.
 * Endpoint: POST https://health.googleapis.com/v4/users/me/dataTypes/nutrition-log/dataPoints:batchDelete
 */
export async function deleteMealFromGoogleHealth(dataPointName) {
    if (!dataPointName) return false;
    const token = await getOrRefreshGoogleHealthToken().catch(() => null);
    if (!token) return false;

    try {
        const response = await fetch('https://health.googleapis.com/v4/users/me/dataTypes/nutrition-log/dataPoints:batchDelete', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                names: [dataPointName]
            })
        });

        if (!response.ok) {
            console.warn('Google Health batchDelete status:', response.status);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error deleting from Google Health:', err);
        return false;
    }
}
