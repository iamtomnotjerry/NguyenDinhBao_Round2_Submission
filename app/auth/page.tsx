import { Suspense } from 'react';
import AuthClient from './AuthClient';
import { pageMetadata } from '@/lib/seo';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export const generateMetadata = () => pageMetadata('auth');

export default function AuthPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="page" />}>
      <AuthClient />
    </Suspense>
  );
}
