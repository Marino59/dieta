'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    GoogleAuthProvider,
    signInWithPopup,
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
        provider.setCustomParameters({ prompt: 'select_account' });
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            // Se il popup viene bloccato dal browser (es. impostazioni restrittive su iOS/Safari), fa fallback su redirect
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
                console.warn('Popup bloccato, tentativo con redirect:', error);
                await signInWithRedirect(auth, provider);
            } else if (error.code !== 'auth/popup-closed-by-user') {
                console.error('Errore durante il login con Google:', error);
                throw error;
            }
        }
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
