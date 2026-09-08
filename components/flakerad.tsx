'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { scaleLinear } from 'd3-scale'
import arcData from '@/data/arc-diagram.json'
import fourControlsData from '@/data/four-controls.json'

const colors = { race: '#7B7290', order: '#B8894A', input: '#4F9C8C', environment: '#EDEBE4' }
const tracks = arcData.tracks
const points = arcData.points
const links = arcData.links

export function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .18 }} transition={{ duration: .58, delay, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.div>
}

export function AmbientField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    let raf = 0
    let elapsed = 0
    let width = 0
    let height = 0
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lines = [
      { label: 'baseline', y: .25, amplitude: .075, frequency: 1.8, speed: .00002, phase: .4, color: 'rgba(217,119,87,.22)', spikeAt: 4.2 },
      { label: 'fixed seed', y: .42, amplitude: .055, frequency: 1.25, speed: -.000015, phase: 1.8, color: 'rgba(168,165,155,.18)', spikeAt: -1 },
      { label: 'frozen clock', y: .59, amplitude: .041, frequency: .85, speed: .000011, phase: 3.1, color: 'rgba(106,155,204,.19)', spikeAt: -1 },
      { label: 'isolated order', y: .76, amplitude: .028, frequency: .55, speed: -.000012, phase: 4.4, color: 'rgba(120,140,93,.22)', spikeAt: -1 },
    ]
    const resize = () => { const rect = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2); width = rect.width; height = rect.height; canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0) }
    const waveform = (line: (typeof lines)[number], x: number, time: number) => {
      const drift = x * .004 + time * line.speed + line.phase
      const base = Math.sin(drift * line.frequency) * .58 + Math.sin(drift * line.frequency * 2.17 + 1.4) * .25 + Math.sin(drift * line.frequency * .43 + 3.2) * .17
      const cycle = time / 1000
      const distance = Math.abs(((cycle - line.spikeAt + 7.5) % 15) - 7.5)
      const spike = line.spikeAt < 0 ? 0 : distance < .7 ? Math.pow(1 - distance / .7, 2) : 0
      return (base + spike * Math.sin(drift * line.frequency * 2.8)) * line.amplitude * height * (1 + spike * 2.2)
    }
    const draw = (timestamp: number) => {
      if (!elapsed) elapsed = timestamp
      const time = reduced ? 0 : timestamp - elapsed
      context.clearRect(0, 0, width, height)
      context.font = '10px Courier New, monospace'
      context.textBaseline = 'middle'
      lines.forEach((line) => { context.beginPath(); for (let x = 96; x <= width + 24; x += 6) { const y = line.y * height + waveform(line, x, time); if (x === 96) context.moveTo(x, y); else context.lineTo(x, y) } context.strokeStyle = line.color; context.lineWidth = 1.15; context.stroke(); context.fillStyle = line.color; context.fillText(line.label, 18, line.y * height) })
      raf = requestAnimationFrame(draw)
    }
    resize(); window.addEventListener('resize', resize); raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} className="ambient-field" aria-label="Slow diagnostic waveform traces" role="img" />
}

export function ArcDiagram() {
  const [active, setActive] = useState<string | null>(null)
  const width = 720, height = 360, left = 112, right = 14, top = 38, bottom = 22
  const x = scaleLinear().domain([0, 5]).range([left, width - right])
  const y = (i: number) => top + i * ((height - top - bottom) / 3)
  const map = new Map(points.map((p) => [p.id, p]))
  const path = (source: string, target: string) => { const a = map.get(source)!, b = map.get(target)!; const y1 = y(tracks.findIndex((t) => t.id === a.track)), y2 = y(tracks.findIndex((t) => t.id === b.track)), bend = Math.max(24, Math.abs(y2 - y1) * .45); return `M ${x(a.x)} ${y1} C ${x(a.x) + bend} ${y1}, ${x(b.x) - bend} ${y2}, ${x(b.x)} ${y2}` }
  return <div className="arc-panel"><svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible" role="img" aria-label="Controlled rerun arc diagram">{tracks.map((track, i) => <g key={track.id}><line x1={left} x2={width - right} y1={y(i)} y2={y(i)} stroke="currentColor" opacity=".16" /><text x="0" y={y(i) + 4} fill="currentColor" opacity=".58" fontSize="10" fontFamily="monospace">{track.label}</text></g>)}{links.map((link, i) => <motion.path key={link.source} d={path(link.source, link.target)} fill="none" stroke={link.color} strokeWidth={active === link.source ? 3 : 1.5} opacity={active && active !== link.source ? .1 : .76} pathLength="1" initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: active && active !== link.source ? .1 : .76 }} viewport={{ once: true }} transition={{ pathLength: { duration: .8, delay: i * .15 }, opacity: { duration: .2 } }} onMouseEnter={() => setActive(link.source)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(link.source)} onBlur={() => setActive(null)} tabIndex={0} />)}{points.map((point, i) => <motion.circle key={point.id} cx={x(point.x)} cy={y(tracks.findIndex((track) => track.id === point.track))} r={point.status === 'fail' ? 3.5 : 2.5} fill={point.status === 'fail' ? colors.race : 'currentColor'} initial={{ scale: 0, opacity: 0 }} whileInView={{ scale: 1, opacity: .65 }} viewport={{ once: true }} transition={{ delay: .25 + i * .04 }} />)}</svg></div>
}

export function WaffleChart() { const [reruns, setReruns] = useState(8); const diagnosed = Math.round(11 + Math.min(1, (reruns - 3) / 17) * 9); const review = Math.round(5 - Math.min(1, (reruns - 3) / 17) * 2); return <div className="space-y-8"><div className="flex items-end justify-between gap-4"><div><p className="mono-label">reruns per condition</p><p className="mt-2 font-mono text-5xl">{reruns}</p></div><input aria-label="Reruns per condition" type="range" min="3" max="20" value={reruns} onChange={(e) => setReruns(Number(e.target.value))} className="w-1/2 accent-[var(--teal)]" /></div><div className="grid max-w-md grid-cols-12 gap-2">{Array.from({ length: 24 }, (_, i) => <motion.span key={i} layout className={`h-3 w-3 rounded-full ${i < diagnosed ? 'bg-[var(--teal)]' : i < diagnosed + review ? 'bg-[var(--ochre)]' : 'bg-[var(--violet)]'}`} animate={{ scale: [1, 1.35, 1] }} transition={{ duration: .22, delay: i * .02 }} />)}</div><div className="grid grid-cols-3 gap-4 border-t border-border pt-4 font-mono text-xs"><div><b className="stat-number block text-xl">{Math.round(diagnosed / 24 * 100)}%</b>precision</div><div><b className="stat-number block text-xl">{Math.round((diagnosed + review) / 24 * 100)}%</b>recall</div><div><b className="stat-number block text-xl">+{reruns * 2 - 5}%</b>net signal</div></div></div> }

export function DistributionStrip() { return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{['baseline', 'fixed seed', 'frozen clock', 'isolated order'].map((label, i) => <Reveal key={label} delay={i * .08}><div><p className="mono-label mb-3">{label}</p><svg viewBox="0 0 150 62" className="w-full"><line x1="10" x2="140" y1="48" y2="48" stroke="currentColor" opacity=".2" /><line x1={20 + i * 7} x2={100 + i * 5} y1={18 + i * 4} y2="38" stroke={Object.values(colors)[i]} opacity=".8" /><circle cx={20 + i * 7} cy={18 + i * 4} r="4" fill={Object.values(colors)[i]} /><circle cx={100 + i * 5} cy="38" r="4" fill="currentColor" /></svg><p className="font-mono text-[10px] text-muted-foreground">failure delta · {i === 0 ? '0.00' : `-${(i * .18).toFixed(2)}`}</p></div></Reveal>)}</div> }

export function SiteNav() { return <header className="flex items-center justify-between border-b border-border px-6 py-5 md:px-10"><a href="/" className="font-serif text-xl tracking-tight transition-colors duration-200 hover:text-[var(--teal)]">flakerad<span className="text-[var(--teal)]">.</span></a><nav className="flex gap-5 font-mono text-[10px] lowercase text-muted-foreground"><a href="/notes" className="site-link">notes</a><a href="/docs" className="site-link">docs</a><a href="/about" className="site-link">about</a><a href="https://github.com/AyushDubey23/flakerad" target="_blank" rel="noreferrer" className="site-link">repo</a></nav></header> }
export function PageShell({ children }: { children: React.ReactNode }) { return <div className="min-h-screen bg-background text-foreground"><SiteNav />{children}<footer className="border-t border-border px-6 py-8 font-mono text-[10px] lowercase text-muted-foreground md:px-10"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><span>flakerad / diagnostic tooling</span><div className="flex flex-wrap gap-5"><a href="https://github.com/AyushDubey23/flakerad" target="_blank" rel="noreferrer" className="site-link">to see repo or find bugs</a><a href="https://ayushdubey23.vercel.app" target="_blank" rel="noreferrer" className="site-link">ayushdubey23.vercel.app</a></div><span>made for the suspicious</span></div></footer></div> }

const controlStages = fourControlsData.map((c, i) => [`0${i + 1}`, c.label, c.description, c.delta || '0%'])
export function Header({ eyebrow, title, intro }: { eyebrow: string; title: string; intro: string }) { return <div className="mx-auto max-w-4xl px-6 py-20 md:px-10 md:py-28"><Reveal><p className="mono-label">{eyebrow}</p></Reveal><motion.h1 className="mt-6 max-w-3xl font-serif text-6xl leading-[.9] tracking-[-.04em] md:text-8xl" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .2, duration: .6 }}>{title}</motion.h1><Reveal delay={.28}><p className="mt-8 max-w-xl font-serif text-lg leading-8 text-muted-foreground">{intro}</p></Reveal></div> }
export function Callout({ children }: { children: React.ReactNode }) { return <div className="border-l-2 border-[var(--teal)] pl-5 font-serif text-lg leading-8 text-muted-foreground">{children}</div> }
export function Controls() { const ref = useRef<HTMLElement>(null); const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] }); const smooth = useSpring(scrollYProgress, { stiffness: 110, damping: 26 }); const [stage, setStage] = useState(0); useEffect(() => smooth.on('change', (v) => setStage(Math.min(3, Math.floor(v * 4)))), [smooth]); return <section ref={ref} className="relative h-[340vh] border-y border-border"><div className="sticky top-0 flex min-h-screen items-center py-16"><div className="grid w-full gap-8 md:grid-cols-[.7fr_1.3fr]"><Reveal><div><p className="mono-label">the four controls</p><h2 className="mt-4 max-w-sm font-serif text-4xl leading-none">Change one thing. Watch the failure move.</h2><p className="mt-8 max-w-xs font-serif text-sm leading-6 text-muted-foreground">Scroll to spend evidence, not page position.</p></div></Reveal><div className="relative min-h-[290px]">{controlStages.map(([n, t, d, delta], i) => <motion.div key={n} className="absolute inset-0 border-t border-border pt-3" animate={{ opacity: stage === i ? 1 : 0, y: stage === i ? 0 : stage < i ? 18 : -18 }} aria-hidden={stage !== i}><span className="font-mono text-xs text-muted-foreground">{n}</span><h3 className="mt-5 font-serif text-3xl">{t}</h3><p className="mt-2 font-serif text-sm leading-6 text-muted-foreground">{d}</p><p className="mt-14 font-mono text-5xl text-[var(--teal)]">{delta}</p><p className="mono-label mt-2">failure delta / controlled rerun</p><div className="mt-8 h-px w-full bg-border"><motion.div className="h-px bg-[var(--teal)]" animate={{ width: `${Math.max(8, (i + 1) * 25)}%` }} /></div></motion.div>)}</div></div></div></section> }

export function HomeContent() { return <PageShell><main><section className="hero-overlay relative h-[100dvh] min-h-[560px] max-h-[900px] overflow-hidden border-b border-border"><AmbientField /><div className="hero-vignette pointer-events-none absolute inset-0 z-[1]" /><div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-center px-6 py-[10vh] md:px-10"><motion.p className="mono-label mb-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35 }}>a diagnostic instrument for flaky tests</motion.p><motion.h1 className="hero-title max-w-3xl font-serif text-[clamp(3.5rem,8.5vw,7.5rem)] leading-[.84] tracking-[-.055em]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18, duration: .58 }}>find the<br /><em>why</em> behind<br />the <span className="text-[var(--terracotta)]">flake.</span></motion.h1><p className="mt-6 max-w-xl font-serif text-base leading-6 text-muted-foreground md:text-lg">Flakerad reruns a failing test under four controlled conditions, then tells you which variable actually moved the result.</p></div></section><div className="mx-auto max-w-6xl px-6 md:px-10"><Reveal><section className="py-24"><div className="grid gap-12 md:grid-cols-[.75fr_1.25fr]"><div><p className="mono-label">the evidence</p><h2 className="mt-4 font-serif text-5xl leading-none">A pass is<br />not a reason.</h2></div><div><p className="max-w-xl font-serif text-xl leading-8 text-muted-foreground">A flaky test is an accusation without proof. Flakerad changes one environmental variable at a time, making the path from failure to pass legible.</p><a href="/docs" className="site-link mt-8 inline-block font-mono text-xs lowercase">read the method →</a></div></div></section></Reveal><Controls /><Reveal><section className="grid gap-12 py-24 md:grid-cols-[.75fr_1.25fr]"><div><p className="mono-label">the distribution</p><h2 className="mt-4 font-serif text-5xl leading-none">Confidence is<br />a shape.</h2></div><div><DistributionStrip /></div></section></Reveal><Reveal><section className="grid gap-12 border-t border-border py-24 md:grid-cols-[.75fr_1.25fr]"><div><p className="mono-label">the reading</p><h2 className="mt-4 font-serif text-5xl leading-none">More reruns.<br />Less mythology.</h2></div><WaffleChart /></section></Reveal><Reveal><section className="grid gap-12 border-t border-border py-24 md:grid-cols-[.75fr_1.25fr]"><div><p className="mono-label">the source</p><h2 className="mt-4 font-serif text-5xl leading-none">Open code.<br />Reproducible bugs.</h2></div><div><p className="max-w-xl font-serif text-xl leading-8 text-muted-foreground">To see the test runner source, explore benchmark fixtures, or to find bugs, visit the repository on GitHub. Built and maintained by Ayush Dubey.</p><div className="mt-8 flex flex-wrap gap-6 font-mono text-xs lowercase"><a href="https://github.com/AyushDubey23/flakerad" target="_blank" rel="noreferrer" className="site-link">to see repo or find bugs →</a><a href="https://ayushdubey23.vercel.app" target="_blank" rel="noreferrer" className="site-link">ayushdubey23.vercel.app →</a></div></div></section></Reveal></div></main></PageShell> }

export default HomeContent
export { colors }
