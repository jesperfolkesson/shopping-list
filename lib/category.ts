import { supabase } from './supabase';

// Kolla om ingrediens finns i databasen
export async function detectCategoryFromDB(name: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('ingredients')
    .select('category')
    .eq('name', name.toLowerCase())
    .eq('approved', true)
    .single();

  if (error || !data) return null;
  return data.category;
}

export function normalizeName(s: string) {
  return s.trim().toLowerCase();
}