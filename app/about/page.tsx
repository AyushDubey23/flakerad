import { Header, PageShell, Reveal } from '@/components/flakerad'

export default function AboutPage() {
  return (
    <PageShell>
      <main>
        <Header
          eyebrow="about / flakerad"
          title="Suspicion, made reproducible."
          intro="Flakerad is a small instrument for a specific kind of engineering honesty: naming the variable that changed the outcome."
        />
        <div className="mx-auto max-w-3xl space-y-8 px-6 pb-28 font-serif text-lg leading-8 text-muted-foreground md:px-10">
          <Reveal>
            <p>
              It is for the test that passes when you run it alone, fails on CI,
              then passes again when you look directly at it.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <p>
              The interface is deliberately quiet. Every mark has a row behind
              it. Every categorical color means a different kind of cause. If a
              number cannot be traced to a run, it does not belong here.
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="border-t border-border pt-8 space-y-6">
              <p>
                Created and built by{' '}
                <a
                  href="https://ayushdubey23.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="site-link"
                >
                  Ayush Dubey
                </a>
                . To see the code, inspect run data, or to find bugs, explore the{' '}
                <a
                  href="https://github.com/AyushDubey23/flakerad"
                  target="_blank"
                  rel="noreferrer"
                  className="site-link"
                >
                  GitHub repository
                </a>
                .
              </p>
              <div>
                <a
                  href="https://drive.google.com/file/d/1mD5BZMORi_Ru9aSe7_z2TSSK1IydWnub/view?usp=sharing"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 font-mono text-xs text-foreground transition-colors hover:border-[var(--teal)] hover:text-[var(--teal)]"
                >
                  <span className="text-[var(--teal)]">↗</span>
                  <span>technical documentation</span>
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </main>
    </PageShell>
  )
}

