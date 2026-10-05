import { useState, useEffect } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  fbSignOut, 
  onAuthStateChanged,
  doc, 
  setDoc, 
  getDocs, 
  collection,
  FirebaseUser
} from '../lib/firebase';
import { Recipe, SaleEntry, StoreLocation, ExpenseEntry, CompanyInvoiceSettings } from '../types';

export interface FirebaseSyncState {
  user: FirebaseUser | null;
  loading: boolean;
  syncStatus: 'synced' | 'saving' | 'offline' | 'idle';
  lastSyncedAt: Date | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveUserDataToFirestore: (data: {
    recipes?: Recipe[];
    sales?: SaleEntry[];
    stores?: StoreLocation[];
    expenses?: ExpenseEntry[];
    settings?: CompanyInvoiceSettings;
  }) => Promise<void>;
}

export function useFirebaseSync(params?: {
  recipes?: Recipe[];
  salesEntries?: SaleEntry[];
  stores?: StoreLocation[];
  expenses?: ExpenseEntry[];
  companySettings?: CompanyInvoiceSettings;
  onDataLoadedFromCloud?: (data: {
    recipes?: Recipe[];
    salesEntries?: SaleEntry[];
    stores?: StoreLocation[];
    expenses?: ExpenseEntry[];
  }) => void;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline' | 'idle'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  // Monitor Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        setSyncStatus('saving');
        try {
          // Record/update user profile in Firestore
          const userRef = doc(db, 'users', currentUser.uid);
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || '',
            photoURL: currentUser.photoURL || '',
            lastLoginAt: new Date().toISOString(),
          }, { merge: true });

          // Load cloud data for this user
          if (params?.onDataLoadedFromCloud) {
            const recipesSnap = await getDocs(collection(db, 'users', currentUser.uid, 'recipes'));
            const cloudRecipes: Recipe[] = [];
            recipesSnap.forEach(d => cloudRecipes.push(d.data() as Recipe));

            const salesSnap = await getDocs(collection(db, 'users', currentUser.uid, 'sales'));
            const cloudSales: SaleEntry[] = [];
            salesSnap.forEach(d => cloudSales.push(d.data() as SaleEntry));

            const storesSnap = await getDocs(collection(db, 'users', currentUser.uid, 'stores'));
            const cloudStores: StoreLocation[] = [];
            storesSnap.forEach(d => cloudStores.push(d.data() as StoreLocation));

            const expensesSnap = await getDocs(collection(db, 'users', currentUser.uid, 'expenses'));
            const cloudExpenses: ExpenseEntry[] = [];
            expensesSnap.forEach(d => cloudExpenses.push(d.data() as ExpenseEntry));

            if (cloudRecipes.length > 0 || cloudSales.length > 0 || cloudStores.length > 0 || cloudExpenses.length > 0) {
              params.onDataLoadedFromCloud({
                recipes: cloudRecipes.length > 0 ? cloudRecipes : undefined,
                salesEntries: cloudSales.length > 0 ? cloudSales : undefined,
                stores: cloudStores.length > 0 ? cloudStores : undefined,
                expenses: cloudExpenses.length > 0 ? cloudExpenses : undefined,
              });
            }
          }

          setSyncStatus('synced');
          setLastSyncedAt(new Date());
        } catch (err) {
          console.warn('Error syncing with Firestore:', err);
          setSyncStatus('offline');
        }
      } else {
        setSyncStatus('idle');
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      alert('Google Sign-in failed: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUser(null);
      setSyncStatus('idle');
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  const saveUserDataToFirestore = async (data: {
    recipes?: Recipe[];
    sales?: SaleEntry[];
    stores?: StoreLocation[];
    expenses?: ExpenseEntry[];
    settings?: CompanyInvoiceSettings;
  }) => {
    if (!user) return;
    setSyncStatus('saving');
    try {
      if (data.recipes && data.recipes.length > 0) {
        for (const recipe of data.recipes) {
          await setDoc(doc(db, 'users', user.uid, 'recipes', recipe.id), {
            ...recipe,
            userId: user.uid,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      if (data.sales && data.sales.length > 0) {
        for (const sale of data.sales.slice(0, 50)) {
          await setDoc(doc(db, 'users', user.uid, 'sales', sale.id), {
            ...sale,
            userId: user.uid,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      if (data.stores && data.stores.length > 0) {
        for (const store of data.stores) {
          await setDoc(doc(db, 'users', user.uid, 'stores', store.id), {
            ...store,
            userId: user.uid,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      if (data.expenses && data.expenses.length > 0) {
        for (const exp of data.expenses.slice(0, 50)) {
          await setDoc(doc(db, 'users', user.uid, 'expenses', exp.id), {
            ...exp,
            userId: user.uid,
            updatedAt: new Date().toISOString(),
          }, { merge: true });
        }
      }

      setSyncStatus('synced');
      setLastSyncedAt(new Date());
    } catch (err) {
      console.warn('Error persisting data to Firestore:', err);
      setSyncStatus('offline');
    }
  };

  return {
    user,
    loading,
    syncStatus,
    lastSyncedAt,
    signInWithGoogle,
    signOut,
    saveUserDataToFirestore,
  };
}
