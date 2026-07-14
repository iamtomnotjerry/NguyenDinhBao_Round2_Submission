import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <main className="flex-1 max-w-md mx-auto px-6 py-16 w-full">
      <LoadingSkeleton variant="page" />
    </main>
  );
}
