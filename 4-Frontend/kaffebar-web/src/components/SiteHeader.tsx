import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-card/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-lg shadow-sm"
          >
            ☕
          </span>
          <span className="text-lg font-semibold tracking-tight">Kaffebar</span>
        </Link>

        <nav className="flex items-center gap-0.5 text-xs font-medium sm:gap-1 sm:text-sm">
          <Link
            href="/"
            aria-label="Kundeskjerm"
            className="rounded-lg px-1.5 py-1.5 text-secondary transition-colors hover:bg-accent-soft hover:text-foreground sm:px-3"
          >
            <span className="sm:hidden">Kunde</span>
            <span className="hidden sm:inline">Kundeskjerm</span>
          </Link>
          <Link
            href="/barista"
            aria-label="Baristaskjerm"
            className="rounded-lg px-1.5 py-1.5 text-secondary transition-colors hover:bg-accent-soft hover:text-foreground sm:px-3"
          >
            <span className="sm:hidden">Barista</span>
            <span className="hidden sm:inline">Baristaskjerm</span>
          </Link>
          <Link
            href="/kaffelab"
            aria-label="Kaffelab"
            className="rounded-lg px-1.5 py-1.5 text-secondary transition-colors hover:bg-accent-soft hover:text-foreground sm:px-3"
          >
            <span className="sm:hidden">Lab</span>
            <span className="hidden sm:inline">Kaffelab</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
