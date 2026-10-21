import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isConfigured, explainError } from '../lib/supabase';
import { Shop, Role } from '../types';

interface ShopMembership {
  shop: Shop;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  currentShop: Shop | null;
  currentRole: Role | null;
  userShops: ShopMembership[];
  setCurrentShop: (shop: Shop) => void;
  refreshShops: () => Promise<void>;
  signOut: () => Promise<void>;
  isConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userShops, setUserShops] = useState<ShopMembership[]>([]);
  const [currentShop, setCurrentShop] = useState<Shop | null>(null);
  const [currentRole, setCurrentRole] = useState<Role | null>(null);

  const fetchUserShops = async (userId: string) => {
    try {
      // 1. Fetch from shop_members joining shops
      const { data, error } = await supabase
        .from('shop_members')
        .select(`
          role,
          shops:shop_id (
            id,
            name,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (error) {
        console.warn('Error fetching shop memberships:', explainError(error));
        // Fallback: check legacy shop_data if normalized tables are not yet queried or migrated
        return;
      }

      if (data && data.length > 0) {
        const memberships: ShopMembership[] = data
          .filter((row: any) => row.shops)
          .map((row: any) => ({
            shop: row.shops as Shop,
            role: row.role as Role,
          }));

        setUserShops(memberships);
        if (memberships.length > 0) {
          // Keep current shop if still valid, or default to first
          setCurrentShop((prev) => {
            if (prev && memberships.some(m => m.shop.id === prev.id)) {
              return prev;
            }
            return memberships[0].shop;
          });
          setCurrentRole((prev) => {
            const match = memberships.find(m => m.shop.id === (currentShop?.id || memberships[0].shop.id));
            return match ? match.role : memberships[0].role;
          });
        }
      } else {
        // No shops found in shop_members. Check user metadata for requested shop name
        const metadataShopName = user?.user_metadata?.shop_name || 'My Shop';
        try {
          // Auto-create shop for newly registered user
          const { data: newShop, error: shopErr } = await supabase
            .from('shops')
            .insert({ name: metadataShopName })
            .select()
            .single();

          if (!shopErr && newShop) {
            await supabase
              .from('shop_members')
              .insert({ shop_id: newShop.id, user_id: userId, role: 'owner' });

            const newMembership: ShopMembership = { shop: newShop, role: 'owner' };
            setUserShops([newMembership]);
            setCurrentShop(newShop);
            setCurrentRole('owner');
          }
        } catch (e) {
          console.error('Auto shop creation failed:', e);
        }
      }
    } catch (err) {
      console.error('fetchUserShops error:', err);
    }
  };

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserShops(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserShops(session.user.id);
        } else {
          setUserShops([]);
          setCurrentShop(null);
          setCurrentRole(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshShops = async () => {
    if (user) {
      await fetchUserShops(user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserShops([]);
    setCurrentShop(null);
    setCurrentRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        currentShop,
        currentRole,
        userShops,
        setCurrentShop,
        refreshShops,
        signOut,
        isConfigured,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
