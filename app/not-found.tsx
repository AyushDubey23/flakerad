import Link from 'next/link'
import { PageShell, Reveal } from '@/components/flakerad'

export default function NotFound() { return <PageShell><main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-6 md:px-10"><Reveal><p className="mono-label">diagnostic / 404</p><h1 className="mt-5 font-serif text-7xl leading-none">This path<br /><em>flaked.</em></h1><p className="mt-8 max-w-md font-serif text-lg leading-8 text-muted-foreground">No route resolved under the current conditions. Try the baseline again.</p><Link href="/" className="site-link mt-10 w-fit border border-border px-5 py-3 font-mono text-xs lowercase">rerun home →</Link></Reveal></main></PageShell> }
