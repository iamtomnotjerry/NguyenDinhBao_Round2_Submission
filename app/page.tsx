import HomeClient from './HomeClient';
import { pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('home');

export default function HomePage() {
  return <HomeClient />;
}
