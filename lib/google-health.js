'use client';

import { auth } from './firebase';

// Google Health API & Pixel Watch integration module
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '191250415086-v5c2g81u0gqcdtlr7g7a5bo1amn5enk5.apps.googleusercontent.com';

// Official nutrition & health metrics (weight) write & read scopes
const HEALTH_SCOPES = [
    'https://www.googleapis.com/auth/googlehealth.nutrition.writeonly',
    'https://www.googleapis.com/auth/googlehealth.nutrition.readonly',
    'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.writeonly',
    'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.readonly'
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
 * Checks if a valid non-expired token exists.
 */
export function isGoogleHealthTokenValid() {
    return !!getGoogleHealthToken();
}

/**
 * Checks if auto-sync is enabled.
 */
export function isGoogleHealthAutoSync() {
    if (typeof window === 'undefined') return false;
    const val = localStorage.getItem(STORAGE_KEYS.AUTO_SYNC);
    // Di default è attivo solo se l'utente ha configurato esplicitamente la connessione
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

let inFlightTokenPromise = null;

async function waitForGoogleGIS(maxWaitMs = 3500) {
    if (typeof window === 'undefined') return null;
    const start = Date.now();
    while (!window.google?.accounts?.oauth2) {
        if (Date.now() - start > maxWaitMs) {
            return null;
        }
        await new Promise(r => setTimeout(r, 100));
    }
    return window.google.accounts.oauth2;
}

/**
 * Obtains a valid token.
 * If cached token is valid, returns it immediately.
 * If expired and Google Health is connected, it attempts a silent background refresh (prompt: '') using the user's email.
 * If interactive is true, prompts user for consent if needed.
 */
export async function getOrRefreshGoogleHealthToken(interactive = false, hintEmail = null) {
    const cached = getGoogleHealthToken();
    if (cached) return cached;

    if (!interactive && !isGoogleHealthConnected()) {
        throw new Error('Pixel Watch / Google Health non collegato.');
    }

    if (inFlightTokenPromise) {
        return inFlightTokenPromise;
    }

    inFlightTokenPromise = (async () => {
        try {
            return await requestGoogleAccessToken(interactive, hintEmail);
        } finally {
            inFlightTokenPromise = null;
        }
    })();

    return inFlightTokenPromise;
}

function requestGoogleAccessToken(interactive = false, hintEmail = null) {
    return new Promise(async (resolve, reject) => {
        if (typeof window === 'undefined') return reject(new Error('No window'));

        const oauth2 = await waitForGoogleGIS();
        if (!oauth2) {
            return reject(new Error('Servizio Google non ancora pronto. Riprova tra poco.'));
        }

        const email = hintEmail || (typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.USER_EMAIL) : null) || auth?.currentUser?.email;

        try {
            const tokenClient = oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: HEALTH_SCOPES,
                callback: (tokenResponse) => {
                    if (tokenResponse.error) {
                        const desc = tokenResponse.error_description || tokenResponse.error;
                        if (!interactive) {
                            return reject(new Error('Sessione Google scaduta. Rinnova con un tocco.'));
                        }
                        return reject(new Error(desc));
                    }

                    if (tokenResponse.access_token) {
                        const expiresInMs = (parseInt(tokenResponse.expires_in, 10) || 3600) * 1000;
                        const expiresAt = Date.now() + expiresInMs;

                        localStorage.setItem(STORAGE_KEYS.TOKEN, tokenResponse.access_token);
                        localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
                        localStorage.setItem(STORAGE_KEYS.CONNECTED_FLAG, 'true');
                        if (email) {
                            localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
                        }

                        resolve(tokenResponse.access_token);
                    } else {
                        reject(new Error('Nessun token ricevuto da Google'));
                    }
                }
            });

            const requestOptions = {};
            if (!interactive) {
                requestOptions.prompt = '';
            } else {
                requestOptions.prompt = 'select_account';
            }
            if (email) {
                requestOptions.hint = email;
            }

            tokenClient.requestAccessToken(requestOptions);
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Checks if token is valid or automatically refreshes it silently in background.
 */
export async function ensureGoogleHealthTokenValid() {
    if (!isGoogleHealthConnected()) return false;
    try {
        const token = await getOrRefreshGoogleHealthToken(false);
        return !!token;
    } catch {
        return false;
    }
}

/**
 * Connects Google Health explicitly (interactive consent popup).
 */
export function connectGoogleHealth(hintEmail = null) {
    return getOrRefreshGoogleHealthToken(true, hintEmail);
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
        if (response.status === 401) {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
            throw new Error('Sessione Google scaduta. Rinnova con un tocco.');
        }
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

/**
 * Lists nutrition dataPoints from Google Health API, optionally filtering for a specific day.
 */
export async function listNutritionDataPoints(date = new Date()) {
    const token = await getOrRefreshGoogleHealthToken();
    if (!token) return [];

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    try {
        const response = await fetch('https://health.googleapis.com/v4/users/me/dataTypes/nutrition-log/dataPoints', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.warn('Google Health list status:', response.status);
            return [];
        }

        const data = await response.json();
        const allPoints = data.dataPoints || [];

        // Filtra in locale per la data specificata per la massima precisione ed evitare problemi di sintassi AIP-160
        return allPoints.filter(p => {
            const timeStr = p.nutritionLog?.interval?.startTime || p.nutritionLog?.interval?.endTime;
            if (!timeStr) return false;
            const t = new Date(timeStr);
            return t >= startOfDay && t <= endOfDay;
        });
    } catch (err) {
        console.error('Error listing Google Health points:', err);
        return [];
    }
}

/**
 * Riallinea completamente i pasti di un giorno con Google Health:
 * 1. Recupera ed elimina tutti i dataPoint esistenti (duplicati/orfani) per quel giorno
 * 2. Invia ciascun pasto attuale di Dieta a Google Health
 * 3. Restituisce il nuovo mapping degli ID
 */
export async function resyncDayWithGoogleHealth(date, meals, interactive = false) {
    const token = await getOrRefreshGoogleHealthToken(interactive);
    if (!token) throw new Error('Pixel Watch non collegato.');

    // 1. Trova tutti i punti esistenti per oggi su Google Health
    const existingPoints = await listNutritionDataPoints(date);
    const namesToDelete = existingPoints.map(p => p.name).filter(Boolean);

    // 2. Elimina tutti i duplicati da Google Health
    if (namesToDelete.length > 0) {
        try {
            await fetch('https://health.googleapis.com/v4/users/me/dataTypes/nutrition-log/dataPoints:batchDelete', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ names: namesToDelete })
            });
        } catch (delErr) {
            console.warn('Errore pulizia duplicati:', delErr);
        }
    }

    // 3. Reinvia i pasti attuali corretti
    const syncedMeals = [];
    for (const meal of meals) {
        try {
            const syncRes = await syncMealToGoogleHealth(meal);
            syncedMeals.push({
                id: meal.id,
                googleHealthDataPointName: syncRes?.dataPointName || null
            });
        } catch (e) {
            console.warn(`Impossibile sincronizzare ${meal.name}:`, e);
        }
    }

    return {
        deletedCount: namesToDelete.length,
        syncedCount: syncedMeals.length,
        syncedMeals
    };
}

/**
 * Logs a weight entry to Google Health API (Pixel Watch & Fitbit ecosystem).
 * Endpoint: POST https://health.googleapis.com/v4/users/me/dataTypes/weight/dataPoints
 */
export async function syncWeightToGoogleHealth(weightEntry) {
    const token = await getOrRefreshGoogleHealthToken();
    if (!token) {
        throw new Error('Pixel Watch / Google Health non collegato.');
    }

    const weightDate = weightEntry.created_at ? new Date(weightEntry.created_at) : new Date();
    const weightGrams = Math.round((Number(weightEntry.weight) || 0) * 1000);
    const timezoneOffsetMin = weightDate.getTimezoneOffset();
    const utcOffsetSeconds = -timezoneOffsetMin * 60;
    const utcOffset = `${utcOffsetSeconds}s`;

    const payload = {
        weight: {
            weightGrams: weightGrams,
            sampleTime: {
                physicalTime: weightDate.toISOString(),
                utcOffset: utcOffset
            }
        }
    };

    const response = await fetch('https://health.googleapis.com/v4/users/me/dataTypes/weight/dataPoints', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.EXPIRES_AT);
            throw new Error('Sessione Google scaduta. Rinnova con un tocco.');
        }
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
 * Deletes a weight dataPoint from Google Health API.
 * Endpoint: POST https://health.googleapis.com/v4/users/me/dataTypes/weight/dataPoints:batchDelete
 */
export async function deleteWeightFromGoogleHealth(dataPointName) {
    if (!dataPointName) return false;
    const token = await getOrRefreshGoogleHealthToken().catch(() => null);
    if (!token) return false;

    try {
        const response = await fetch('https://health.googleapis.com/v4/users/me/dataTypes/weight/dataPoints:batchDelete', {
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
            console.warn('Google Health weight batchDelete status:', response.status);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Error deleting weight from Google Health:', err);
        return false;
    }
}

