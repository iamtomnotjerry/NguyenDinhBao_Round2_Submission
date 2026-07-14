import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <main className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full">
      <LoadingSkeleton variant="chat" />
    </main>
  );
}
