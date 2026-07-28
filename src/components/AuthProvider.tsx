"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { auth, db, isFirebaseConfigured } from "@/src/lib/firebase";
import { signInWithGoogle as firebaseSignInWithGoogle, logout as firebaseLogout } from "@/src/lib/auth";
import { collection, query, where, getDocs, setDoc, doc } from "firebase/firestore";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export const ADMIN_EMAIL = "hnyhttt2211015@student.ctuet.edu.vn";
export const OWNER_EMAIL = "huynhnhuy.tech@gmail.com";

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (displayName: string, photoURL: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isFirebaseConfigured) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const userEmail = user.email?.toLowerCase().trim();

          // Enforce: ONLY hnyhttt2211015@student.ctuet.edu.vn can log into HatchMateWeb
          if (userEmail !== ADMIN_EMAIL.toLowerCase()) {
            console.warn(`[Auth] Access denied for ${userEmail}. Only ${ADMIN_EMAIL} is permitted on Web.`);
            try {
              await firebaseLogout();
            } catch (e) {
              console.error("Firebase logout error:", e);
            }
            setCurrentUser(null);
            setAuthError("Rất tiếc, chỉ tài khoản Quản trị viên (hnyhttt2211015@student.ctuet.edu.vn) mới có quyền đăng nhập vào hệ thống Web!");
            setLoading(false);
            return;
          }

          setAuthError(null);
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });

          // Sync online status and last active timestamp to Firestore
          try {
            const userEmail = user.email?.toLowerCase().trim();
            if (userEmail) {
              const usersCol = collection(db, "users");
              const q = query(usersCol, where("email", "==", userEmail));
              const snap = await getDocs(q);

              const nowIso = new Date().toISOString();
              if (!snap.empty) {
                await Promise.all(
                  snap.docs.map((docSnap) =>
                    setDoc(doc(db, "users", docSnap.id), {
                      isOnline: true,
                      lastActiveAt: nowIso,
                      fullName: user.displayName || docSnap.data().fullName,
                      profilePicture: user.photoURL || docSnap.data().profilePicture,
                    }, { merge: true })
                  )
                );
              } else {
                await setDoc(doc(db, "users", user.uid), {
                  uid: user.uid,
                  email: userEmail,
                  fullName: user.displayName || "Người dùng",
                  role: "admin",
                  status: "active",
                  isOnline: true,
                  lastActiveAt: nowIso,
                  createdAt: nowIso,
                  profilePicture: user.photoURL || "",
                }, { merge: true });
              }
            }
          } catch (err) {
            console.error("Error updating online presence in Firestore:", err);
          }
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase chưa được cấu hình!");
    }
    await firebaseSignInWithGoogle();
  };

  const logout = async () => {
    if (currentUser?.email) {
      try {
        const userEmail = currentUser.email.toLowerCase().trim();
        const usersCol = collection(db, "users");
        const q = query(usersCol, where("email", "==", userEmail));
        const snap = await getDocs(q);
        const nowIso = new Date().toISOString();

        await Promise.all(
          snap.docs.map((docSnap) =>
            setDoc(doc(db, "users", docSnap.id), {
              isOnline: false,
              lastActiveAt: nowIso,
            }, { merge: true })
          )
        );
      } catch (err) {
        console.error("Error updating offline presence on logout:", err);
      }
    }

    setCurrentUser(null);
    if (isFirebaseConfigured) {
      try {
        await firebaseLogout();
      } catch (e) {
        console.error("Firebase logout error:", e);
      }
    }
  };

  const updateUserProfile = async (displayName: string, photoURL: string | null) => {
    if (isFirebaseConfigured && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName, photoURL });
      setCurrentUser({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        displayName: auth.currentUser.displayName,
        photoURL: auth.currentUser.photoURL,
      });
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, authError, signInWithGoogle, logout, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
