import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ChatClient from './ChatClient';
import { pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('chat');

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth?next=/chat');
  }

  return <ChatClient initialUserId={user.id} initialEmail={user.email ?? null} />;
}
