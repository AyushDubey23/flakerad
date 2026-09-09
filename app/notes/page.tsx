import { Callout, Header, PageShell, Reveal } from '@/components/flakerad'
import fieldNotes from '@/data/field-notes.json'

export default function NotesPage() {
  return (
    <PageShell>
      <main>
        <Header
          eyebrow="field notes / case log"
          title="The flake leaves a trail."
          intro="Short reports from the moment a probabilistic failure becomes an inspectable system."
        />
        <div className="mx-auto max-w-4xl space-y-16 px-6 pb-28 md:px-10">
          {fieldNotes.map((note, idx) => (
            <Reveal key={note.id} delay={0.05 + idx * 0.07}>
              <article className="grid gap-8 border-t border-border pt-8 md:grid-cols-[.3fr_1fr]">
                <p className="mono-label">{note.eyebrow}</p>
                <div>
                  <h2 className="font-serif text-4xl">{note.title}</h2>
                  <p className="mt-5 max-w-xl font-serif text-lg leading-8 text-muted-foreground">
                    {note.summary}
                  </p>
                  <Callout>{note.callout}</Callout>
                  {'remediation' in note && note.remediation && (
                    <p className="mt-4 font-mono text-xs leading-relaxed text-muted-foreground/80">
                      <span className="text-[var(--teal)]">remediation:</span> {note.remediation}
                    </p>
                  )}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </main>
    </PageShell>
  )
}
