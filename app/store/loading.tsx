import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-fg">
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <LoadingSkeleton variant="cards" />
      </main>
    </div>
  );
}
