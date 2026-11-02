export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto flex max-w-4xl flex-col gap-2 px-4 py-5 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          <span className="font-display font-semibold text-brand-strong">
            Steady
          </span>
          <span aria-hidden="true"> · </span>
          Small daily check-ins. Real progress.
        </p>
        <p className="sm:max-w-sm sm:text-right">
          Your weights stay private. If you choose to share, others see only
          your name and a rounded % change.
        </p>
      </div>
    </footer>
  );
}
