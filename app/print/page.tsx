import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PrintClient from './PrintClient';
import { pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('print');

export default async function PrintPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=/print');
  }

  return <PrintClient />;
}
