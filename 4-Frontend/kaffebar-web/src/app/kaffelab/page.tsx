import type { Metadata } from "next";
import { BrewLab } from "@/components/BrewLab";

export const metadata: Metadata = {
  title: "Kaffelab | Kaffebar",
  description: "Eksperimenter med bryggemetoder og finn riktig kaffe-vann-forhold.",
};

export default function KaffelabPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <section className="lab-hero relative isolate overflow-hidden rounded-[2rem] px-6 py-10 text-white shadow-xl sm:px-12 sm:py-14 lg:min-h-[27rem] lg:px-16">
        <div className="relative z-10 max-w-xl">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">
            <span aria-hidden>✳</span> Kaffelab · eksperimenter med smak
          </p>
          <h1 className="text-4xl font-semibold leading-[1.06] tracking-tight sm:text-5xl lg:text-6xl">
            En bedre kopp
            <br />
            begynner her.
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-orange-50/80 sm:text-lg">
            Små justeringer. Store smaksforskjeller. Finn forholdet som gjør morgenkaffen til
            dagens høydepunkt.
          </p>
          <a
            href="#bryggekompass"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#f1c27d] px-5 py-3 text-sm font-semibold text-[#332318] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#ffdaa0]"
          >
            Finn ditt brygg <span aria-hidden>↓</span>
          </a>
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-5 bottom-[-3.5rem] hidden h-[27rem] w-[27rem] items-center justify-center lg:flex"
        >
          <div className="absolute h-[21rem] w-[21rem] rounded-full border border-white/10" />
          <div className="absolute h-[16rem] w-[16rem] rounded-full border border-white/10" />
          <svg viewBox="0 0 360 320" className="relative h-full w-full drop-shadow-2xl">
            <ellipse cx="184" cy="276" rx="111" ry="17" fill="#211710" opacity=".35" />
            <path d="M104 102h158l-15 143a18 18 0 0 1-18 16h-92a18 18 0 0 1-18-16z" fill="#f5eee5" />
            <path d="M262 126h22a35 35 0 0 1 0 70h-28" fill="none" stroke="#f5eee5" strokeWidth="14" />
            <path d="M111 124h144l-10 96H122z" fill="#8a522e" />
            <path d="M111 124h144l-2 18H112z" fill="#e5c49a" />
            <path d="M116 123c18-14 35 12 54-1 16-11 30 8 45 0 14-8 27 1 39 1" fill="none" stroke="#fff5df" strokeWidth="5" strokeLinecap="round" />
            <path d="M140 91c-9-13 8-16 1-30M183 89c-8-13 8-19 1-31M222 92c-7-13 7-17 1-28" fill="none" stroke="#fff1dc" strokeWidth="4" strokeLinecap="round" opacity=".72" />
            <ellipse cx="104" cy="274" rx="24" ry="12" transform="rotate(-27 104 274)" fill="#302017" />
            <path d="M93 274c8-9 15-12 22-14" fill="none" stroke="#8e6547" strokeWidth="3" strokeLinecap="round" />
            <ellipse cx="262" cy="267" rx="20" ry="10" transform="rotate(28 262 267)" fill="#302017" />
            <path d="M253 265c7 5 12 9 17 14" fill="none" stroke="#8e6547" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>

        <span className="lab-bean absolute right-[28%] top-12 hidden h-3 w-6 rotate-[-20deg] rounded-full bg-[#d6a66e] opacity-70 lg:block" />
        <span className="lab-bean absolute right-[10%] top-24 hidden h-3 w-6 rotate-[-20deg] rounded-full bg-[#d6a66e] opacity-50 lg:block" />
        <span className="lab-bean absolute right-[34%] bottom-12 hidden h-3 w-6 rotate-[-20deg] rounded-full bg-[#d6a66e] opacity-40 lg:block" />
      </section>

      <section id="bryggekompass" className="scroll-mt-8 py-12 sm:py-16">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-accent">Bryggekompass</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Still inn koppen din
            </h2>
          </div>
          <p className="max-w-md text-secondary">
            Velg metode og mengde kaffe. Vi regner ut hvor mye vann du trenger.
          </p>
        </div>
        <BrewLab />
      </section>

      <section className="grid gap-4 border-t border-line py-8 text-center sm:grid-cols-3 sm:py-10">
        <div>
          <p className="text-lg font-semibold">Start enkelt</p>
          <p className="mt-1 text-sm text-secondary">Vei kaffe og vann for jevnere brygg.</p>
        </div>
        <div>
          <p className="text-lg font-semibold">Smak underveis</p>
          <p className="mt-1 text-sm text-secondary">Juster én ting om gangen.</p>
        </div>
        <div>
          <p className="text-lg font-semibold">Finn din favoritt</p>
          <p className="mt-1 text-sm text-secondary">Den beste oppskriften er din egen.</p>
        </div>
      </section>
    </main>
  );
}
