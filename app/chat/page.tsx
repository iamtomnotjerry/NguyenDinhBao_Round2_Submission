import ChatClient from './ChatClient';
import { pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('chat');

/** Auth gate lives in ChatClient (client session) — avoids false RSC redirects. */
export default function ChatPage() {
  return <ChatClient />;
}
