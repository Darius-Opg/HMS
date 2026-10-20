
export default function StatCard({ cardTitle, cardValue, cardIcon }) {
    return (
        <article className="app-card flex min-w-0 items-center gap-4 p-4 text-gray-900 dark:text-white sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                {cardIcon}
            </div>
            <div className="min-w-0">
                <h2 className="app-muted-text truncate text-xs font-medium uppercase tracking-wide">
                    {cardTitle}
                </h2>
                <p className="app-accent-title mt-1 text-2xl font-semibold tabular-nums">
                    {cardValue}
                </p>
            </div>
        </article>
    )
}