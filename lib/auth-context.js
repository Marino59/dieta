'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    GoogleAuthProvider,
    signInWithRedirect,
    getRedirectResult,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth } from './firebase';

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const googleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        // Usa il redirect invece del popup: i popup sono bloccati silenziosamente
        // da Safari/iOS. Il redirect funziona su tutti i browser e dispositivi.
        await signInWithRedirect(auth, provider);
    };

    const logOut = () => {
        signOut(auth);
    };

    useEffect(() => {
        // Gestisci il ritorno dal redirect di Google
        getRedirectResult(auth).catch((error) => {
            console.error('Errore nel redirect result:', error);
        });

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, googleSignIn, logOut, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
