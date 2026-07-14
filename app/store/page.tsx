import { createClient } from '@/lib/supabase/server';
import type { SafeDatabase } from '@/types/database.types';
import StoreClient from './StoreClient';
import { pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('store');

type Product = SafeDatabase['public']['Tables']['products']['Row'];

export default async function StorePage() {
  let initialProducts: Product[] = [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('price', { ascending: true });
    initialProducts = data ?? [];
  } catch {}
  return <StoreClient initialProducts={initialProducts} />;
}
