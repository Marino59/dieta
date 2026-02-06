import { db, auth } from "./firebase";
import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    doc,
    query,
    orderBy,
    where,
    Timestamp,
    getDoc,
    setDoc
} from "firebase/firestore";

const COLLECTION_NAME = "meals";
const PROFILES_COLLECTION = "profiles";

export async function getMeals(targetDate = null) {
    if (!auth.currentUser) return [];

    // Default to today if no date provided
    const dateToFilter = targetDate || new Date();

    // Create start and end of the day in local time
    const startOfDay = new Date(dateToFilter);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateToFilter);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", auth.currentUser.uid),
        where("created_at", ">=", Timestamp.fromDate(startOfDay)),
        where("created_at", "<=", Timestamp.fromDate(endOfDay)),
        orderBy("created_at", "desc")
    );

    const snapshot = await getDocs(q);

    const meals = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            created_at: data.created_at?.toDate?.() || new Date(data.created_at)
        };
    });

    // Reverse to show Chronological order (Morning -> Night)
    // Firestore desc gives Night -> Morning. Reversing makes it Morning -> Night.
    return meals.reverse();
}

export async function addMeal(mealData) {
    if (!auth.currentUser) throw new Error("User not authenticated");

    const timestamp = mealData.created_at
        ? Timestamp.fromDate(new Date(mealData.created_at))
        : Timestamp.now();

    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
        ...mealData,
        userId: auth.currentUser.uid,
        created_at: timestamp
    });
    return { id: docRef.id, ...mealData, created_at: timestamp.toDate() };
}

export async function deleteMeal(mealId) {
    await deleteDoc(doc(db, COLLECTION_NAME, mealId));
}

export async function updateMeal(mealId, updates) {
    const mealRef = doc(db, COLLECTION_NAME, mealId);
    await updateDoc(mealRef, updates);
}

// User Profile Functions
export async function getUserProfile() {
    if (!auth.currentUser) return null;

    const profileRef = doc(db, PROFILES_COLLECTION, auth.currentUser.uid);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
        return profileSnap.data();
    }
    return null;
}

export async function saveUserProfile(profileData) {
    if (!auth.currentUser) throw new Error("User not authenticated");

    const profileRef = doc(db, PROFILES_COLLECTION, auth.currentUser.uid);
    await setDoc(profileRef, {
        ...profileData,
        updatedAt: Timestamp.now()
    });
    return profileData;
}

// Weight Tracking Functions
const WEIGHT_COLLECTION = "weight_logs";

export async function addWeightLog(weight, date = new Date()) {
    if (!auth.currentUser) throw new Error("User not authenticated");

    const timestamp = Timestamp.fromDate(new Date(date));

    // Check if entry for this day already exists
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const q = query(
        collection(db, WEIGHT_COLLECTION),
        where("userId", "==", auth.currentUser.uid),
        where("date", ">=", Timestamp.fromDate(startOfDay)),
        where("date", "<=", Timestamp.fromDate(endOfDay))
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        // Update existing
        const docId = snapshot.docs[0].id;
        await updateDoc(doc(db, WEIGHT_COLLECTION, docId), { weight, date: timestamp });
    } else {
        // Create new
        await addDoc(collection(db, WEIGHT_COLLECTION), {
            userId: auth.currentUser.uid,
            weight: parseFloat(weight),
            date: timestamp
        });
    }
}

export async function getWeightHistory() {
    if (!auth.currentUser) return [];

    const q = query(
        collection(db, WEIGHT_COLLECTION),
        where("userId", "==", auth.currentUser.uid),
        orderBy("date", "asc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date?.toDate()
    }));
}

// Helper to aggregrate nutrition by day for the last X days
export async function getDailyNutritionHistory(days = 30) {
    if (!auth.currentUser) return [];

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const q = query(
        collection(db, COLLECTION_NAME),
        where("userId", "==", auth.currentUser.uid),
        where("created_at", ">=", Timestamp.fromDate(startDate)),
        orderBy("created_at", "asc")
    );

    const snapshot = await getDocs(q);
    const dailyMap = {};

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const dateKey = data.created_at.toDate().toISOString().split('T')[0];

        if (!dailyMap[dateKey]) {
            dailyMap[dateKey] = { calories: 0, protein: 0, carbs: 0, fat: 0, count: 0 };
        }

        const quantity = data.quantity || 100;
        dailyMap[dateKey].calories += Math.round((data.calories / 100) * quantity) || 0;
        dailyMap[dateKey].protein += Math.round((data.protein / 100) * quantity) || 0;
        dailyMap[dateKey].carbs += Math.round((data.carbs / 100) * quantity) || 0;
        dailyMap[dateKey].fat += Math.round((data.fat / 100) * quantity) || 0;
        dailyMap[dateKey].count += 1;
    });

    return Object.entries(dailyMap).map(([date, stats]) => ({
        date,
        ...stats
    })).sort((a, b) => a.date.localeCompare(b.date));
}
