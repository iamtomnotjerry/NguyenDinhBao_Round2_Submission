import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function HomeLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        <LoadingSkeleton variant="page" />
      </main>
    </div>
  );
}
