import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(
  supabaseUrl &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey &&
  supabaseAnonKey.length > 20
);

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false },
    });

/**
 * Translates database and Supabase error codes into plain language explanations.
 */
export function explainError(err: any): string {
  if (!err) return 'An unknown error occurred.';
  const msg = err.message || String(err);
  const code = err.code || '';

  // PGRST205 - Table missing in schema cache
  if (code === 'PGRST205' || msg.includes('schema cache')) {
    return 'Database table not found. Please ensure all database migrations have been executed in your Supabase SQL editor.';
  }

  // 42501 - Permission / RLS denial
  if (code === '42501' || msg.includes('permission denied') || msg.includes('violates row-level security')) {
    return 'Permission denied: Your account does not have authorization to view or modify this record.';
  }

  // 23505 - Unique constraint violation
  if (code === '23505' || msg.includes('unique constraint') || msg.includes('duplicate key')) {
    return 'A record with this name or identifier already exists.';
  }

  // 23503 - Foreign key violation
  if (code === '23503' || msg.includes('foreign key constraint')) {
    return 'Cannot complete action: This record is still linked to existing bills or payments.';
  }

  // Auth specific errors
  if (msg.includes('Email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox or spam folder for the confirmation link.';
  }
  if (msg.includes('Invalid login credentials')) {
    return 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (msg.includes('JWT expired') || msg.includes('session has expired')) {
    return 'Your session has expired. Please sign out and sign in again.';
  }

  return msg;
}
