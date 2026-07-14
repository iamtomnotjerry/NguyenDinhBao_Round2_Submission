import PrintClient from './PrintClient';
import { pageMetadata } from '@/lib/seo';

export const generateMetadata = () => pageMetadata('print');

/** Auth gate lives in PrintClient (client session) — avoids false RSC redirects. */
export default function PrintPage() {
  return <PrintClient />;
}
