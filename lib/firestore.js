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
const COLLECTION_NAME_WEIGHTS = "weights";
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

export async function getWeights() {
    if (!auth.currentUser) return [];

    const q = query(
        collection(db, COLLECTION_NAME_WEIGHTS),
        where("userId", "==", auth.currentUser.uid),
        orderBy("created_at", "asc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate?.() || new Date(doc.data().created_at)
    }));
}

export async function addWeight(weightData) {
    if (!auth.currentUser) throw new Error("User not authenticated");

    const timestamp = weightData.created_at
        ? Timestamp.fromDate(new Date(weightData.created_at))
        : Timestamp.now();

    const docRef = await addDoc(collection(db, COLLECTION_NAME_WEIGHTS), {
        ...weightData,
        userId: auth.currentUser.uid,
        created_at: timestamp
    });
    return { id: docRef.id, ...weightData, created_at: timestamp.toDate() };
}

export async function deleteWeight(weightId) {
    await deleteDoc(doc(db, COLLECTION_NAME_WEIGHTS, weightId));
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
