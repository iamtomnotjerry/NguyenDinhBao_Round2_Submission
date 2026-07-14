import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
      <LoadingSkeleton variant="cards" />
    </main>
  );
}
