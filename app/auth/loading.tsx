import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-surface text-fg">
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <LoadingSkeleton variant="page" />
      </main>
    </div>
  );
}
