export default function ForbiddenPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-3">Access denied</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-6">
        You do not have permission to access this page.
      </p>
      <a href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline">
        Go to dashboard
      </a>
    </div>
  );
}
