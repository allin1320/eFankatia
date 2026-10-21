import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Camera,
  Github,
  History,
  LogIn,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  TreeDeciduous,
  UserRound,
  Users,
} from 'lucide-react'

import { ThemeToggle } from '#/components/layout/theme-toggle'
import { Button } from '#/components/ui/button'
import { useAuth } from '#/lib/auth/auth-context'
import { cn } from '#/lib/utils'

const SITE_URL = 'https://e-fankatia.vercel.app'
const GITHUB_URL = 'https://github.com/allin1320/eFankatia'
const SITE_NAME = 'eFankatia'

const PAGE_TITLE = 'eFankatia — Retracez l’histoire de votre famille'
const PAGE_DESCRIPTION =
  'eFankatia réunit votre famille sur un arbre généalogique interactif : fiches détaillées, photos, liens de parenté et recherche instantanée. Un seul arbre, pour toutes les générations.'

const OG_IMAGE = `${SITE_URL}/og-image.jpg`

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: PAGE_TITLE },
      { name: 'description', content: PAGE_DESCRIPTION },
      { name: 'theme-color', content: '#173a40' },
      { name: 'robots', content: 'index, follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'fr_FR' },
      { property: 'og:title', content: PAGE_TITLE },
      { property: 'og:description', content: PAGE_DESCRIPTION },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:image', content: OG_IMAGE },
      {
        property: 'og:image:alt',
        content: 'Aperçu de l’application eFankatia',
      },
      { property: 'og:image:type', content: 'image/jpeg' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: PAGE_TITLE },
      { name: 'twitter:description', content: PAGE_DESCRIPTION },
      { name: 'twitter:image', content: OG_IMAGE },
      {
        name: 'twitter:image:alt',
        content: 'Aperçu de l’application eFankatia',
      },
    ],
    links: [{ rel: 'canonical', href: SITE_URL }],
  }),
  component: LandingPage,
})

const FEATURES = [
  {
    icon: Network,
    title: 'Arbre interactif',
    description:
      'Naviguez, zoomez et dépliez les branches pour suivre chaque lignée à votre rythme.',
  },
  {
    icon: UserRound,
    title: 'Fiches détaillées',
    description:
      'État civil, contacts, profession, parents, unions et enfants réunis sur une seule fiche.',
  },
  {
    icon: Search,
    title: 'Recherche instantanée',
    description:
      'Retrouvez un proche par nom, prénom, appellation ou profession, sans tenir compte des accents.',
  },
  {
    icon: Camera,
    title: 'Photos & souvenirs',
    description:
      'Ajoutez un portrait à chaque membre. Un avatar stylisé prend le relais en l’absence de photo.',
  },
  {
    icon: ShieldCheck,
    title: 'Rôles & confidentialité',
    description:
      'Administrateur, modérateur de lignée ou lecteur : chacun accède à ce qui le concerne.',
  },
  {
    icon: History,
    title: 'Traçabilité',
    description:
      'Chaque création et chaque modification est horodatée et attribuée à son auteur.',
  },
] as const

const STEPS = [
  {
    icon: LogIn,
    title: 'Connectez-vous',
    description:
      'Votre compte vous ouvre l’accès à l’arbre familial, avec un rôle adapté à vos droits.',
  },
  {
    icon: UserRound,
    title: 'Renseignez vos proches',
    description:
      'Créez les fiches, ajoutez les liens de parenté, les dates et les portraits de famille.',
  },
  {
    icon: Network,
    title: 'Explorez et transmettez',
    description:
      'Parcourez les générations, zoomez sur une branche et partagez l’histoire familiale.',
  },
] as const

const SHOWCASE = [
  {
    src: '/screenshoot/screenshoot2.webp',
    alt: 'Capture d’écran de l’application eFankatia — aperçu 2 sur 5',
  },
  {
    src: '/screenshoot/screenshoot3.webp',
    alt: 'Capture d’écran de l’application eFankatia — aperçu 3 sur 5',
  },
  {
    src: '/screenshoot/screenshoot4.webp',
    alt: 'Capture d’écran de l’application eFankatia — aperçu 4 sur 5',
  },
  {
    src: '/screenshoot/screenshoot5.webp',
    alt: 'Capture d’écran de l’application eFankatia — aperçu 5 sur 5',
  },
] as const

const TRUST = [
  {
    icon: Camera,
    title: 'Photos & souvenirs',
    description: 'Un portrait pour chaque membre',
  },
  {
    icon: Search,
    title: 'Recherche instantanée',
    description: 'Sans accents ni casse',
  },
  {
    icon: ShieldCheck,
    title: 'Accès maîtrisé',
    description: 'Trois rôles, des droits clairs',
  },
  {
    icon: Users,
    title: 'Toutes générations',
    description: 'Ascendants, unions et descendance',
  },
] as const

function LandingPage() {
  return (
    <div id="accueil" className="relative min-h-dvh">
      <LandingHeader />
      <main className="overflow-x-clip">
        <Hero />
        <TrustStrip />
        <Features />
        <Showcase />
        <Steps />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  )
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-[var(--header-bg)] backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-6">
        <a
          href="#accueil"
          className="flex items-center gap-2.5 rounded-lg no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="eFankatia — revenir en haut de la page"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--lagoon)] to-[var(--palm)] text-white shadow-sm dark:text-[var(--bg-base)]">
            <TreeDeciduous className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="display-title text-lg font-semibold text-[var(--sea-ink)]">
              eFankatia
            </span>
            <span className="mt-0.5 text-[11px] font-medium tracking-wide text-muted-foreground">
              Arbre familial
            </span>
          </span>
        </a>

        <nav
          aria-label="Navigation principale"
          className="hidden items-center gap-6 md:flex"
        >
          <a href="#fonctionnalites" className="nav-link text-sm font-medium">
            Fonctionnalités
          </a>
          <a href="#apercus" className="nav-link text-sm font-medium">
            Aperçus
          </a>
          <a href="#comment-ca-marche" className="nav-link text-sm font-medium">
            Comment ça marche
          </a>
        </nav>

        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="hidden size-11 sm:inline-flex sm:size-9"
          >
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Voir le code source sur GitHub (nouvel onglet)"
              title="Code source sur GitHub"
              className="no-underline"
            >
              <Github aria-hidden="true" />
            </a>
          </Button>
          <ThemeToggle className="size-11 sm:size-9" />
          <AuthCta
            authenticatedLabel="Mon arbre"
            variant="brand"
            size="sm"
            className="ml-1 h-11 px-3 sm:h-9 sm:px-4"
          />
        </div>
      </div>
    </header>
  )
}

function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pt-14 pb-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-20 lg:pb-20">
        <div className="rise-in">
          <p className="island-kicker inline-flex items-center gap-2">
            <Sparkles className="size-3.5" aria-hidden="true" />
            L’histoire de votre famille, enfin réunie
          </p>
          <h1 className="display-title mt-4 text-4xl leading-[1.05] font-semibold tracking-tight text-[var(--sea-ink)] sm:text-5xl lg:text-6xl">
            Retracez vos racines,{' '}
            <span className="relative inline-block whitespace-nowrap">
              <span className="relative z-10">transmettez</span>
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-1.5 z-0 h-3 -rotate-1 rounded-full bg-[var(--lagoon)] opacity-30"
              />
            </span>{' '}
            votre héritage.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            eFankatia réunit votre famille sur un arbre généalogique interactif
            : fiches détaillées, photos, liens de parenté et recherche
            instantanée. Un seul arbre, pour toutes les générations.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <AuthCta
              authenticatedLabel="Explorer mon arbre"
              variant="brand"
              size="lg"
              className="h-11 px-6 text-[15px]"
            />
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-11 px-6 text-[15px]"
            >
              <a href="#apercus" className="no-underline">
                Découvrir l’application
                <ArrowRight aria-hidden="true" />
              </a>
            </Button>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ShieldCheck
              className="size-4 text-[var(--palm)]"
              aria-hidden="true"
            />
            Accès sécurisé · rôles administrateur, modérateur et lecteur
          </p>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-6 -z-10 rounded-[2rem] blur-2xl"
            style={{
              background:
                'radial-gradient(60% 60% at 30% 30%, rgba(79,184,178,0.4), transparent 70%), radial-gradient(55% 55% at 80% 80%, rgba(47,106,74,0.3), transparent 70%)',
            }}
          />
          <ScreenshotFrame
            src="/screenshoot/screenshoot1.webp"
            alt="Capture d’écran de l’application eFankatia — aperçu 1 sur 5"
            priority
            className="relative -rotate-1 transition-transform duration-500 hover:rotate-0"
          />

          <div className="island-shell absolute -top-5 -left-3 hidden items-center gap-3 rounded-xl px-3.5 py-2.5 sm:flex">
            <div className="flex -space-x-2" aria-hidden="true">
              <span className="flex size-8 items-center justify-center rounded-full border-2 border-[var(--surface-strong)] bg-[var(--lagoon)] text-xs font-bold text-white dark:text-[var(--bg-base)]">
                J
              </span>
              <span className="flex size-8 items-center justify-center rounded-full border-2 border-[var(--surface-strong)] bg-[var(--palm)] text-xs font-bold text-white dark:text-[var(--bg-base)]">
                M
              </span>
              <span className="flex size-8 items-center justify-center rounded-full border-2 border-[var(--surface-strong)] bg-[var(--lagoon-deep)] text-xs font-bold text-white dark:text-[var(--bg-base)]">
                N
              </span>
            </div>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-[var(--sea-ink)]">
                Une famille réunie
              </p>
              <p className="text-[11px] text-muted-foreground">
                Toutes les générations
              </p>
            </div>
          </div>

          <div className="island-shell absolute -right-3 -bottom-5 hidden items-center gap-2.5 rounded-xl px-3.5 py-2.5 sm:flex">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--sand)] text-[var(--palm)]">
              <Network className="size-5" aria-hidden="true" />
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-[var(--sea-ink)]">
                Arbre interactif
              </p>
              <p className="text-[11px] text-muted-foreground">
                Zoom & déplacement
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustStrip() {
  return (
    <section
      aria-label="Points forts de l’application"
      className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24"
    >
      <div className="island-shell grid gap-x-6 gap-y-5 rounded-2xl px-6 py-6 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--palm)]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--sea-ink)]">
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="fonctionnalites" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="max-w-2xl">
          <p className="island-kicker">Fonctionnalités</p>
          <h2 className="display-title mt-3 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
            Tout ce qu’il faut pour écrire votre histoire
          </h2>
          <p className="mt-3 text-muted-foreground">
            De la première fiche à l’arbre complet, eFankatia accompagne chaque
            étape de la mémoire familiale.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <article
                key={feature.title}
                className="feature-card rounded-2xl p-6"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--palm)]">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-base font-semibold text-[var(--sea-ink)]">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Showcase() {
  return (
    <section id="apercus" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="island-kicker">Aperçus</p>
            <h2 className="display-title mt-3 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
              L’application en images
            </h2>
            <p className="mt-3 text-muted-foreground">
              De l’arbre généalogique aux fiches détaillées, découvrez
              l’expérience eFankatia.
            </p>
          </div>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Camera className="size-4 text-[var(--palm)]" aria-hidden="true" />5
            aperçus de l’application
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <ScreenshotFrame className="lg:col-span-3" {...SHOWCASE[0]} />
          <ScreenshotFrame {...SHOWCASE[1]} />
          <ScreenshotFrame {...SHOWCASE[2]} />
          <ScreenshotFrame {...SHOWCASE[3]} />
        </div>
      </div>
    </section>
  )
}

function Steps() {
  return (
    <section id="comment-ca-marche" className="scroll-mt-24">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
        <div className="max-w-2xl">
          <p className="island-kicker">Comment ça marche</p>
          <h2 className="display-title mt-3 text-3xl font-semibold text-[var(--sea-ink)] sm:text-4xl">
            Trois étapes pour faire vivre votre arbre
          </h2>
          <p className="mt-3 text-muted-foreground">
            Un parcours simple, pensé pour toutes les générations.
          </p>
        </div>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <li
                key={step.title}
                className="island-shell relative rounded-2xl p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="display-title text-3xl font-semibold text-[var(--lagoon-deep)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="flex size-10 items-center justify-center rounded-xl bg-[var(--sand)] text-[var(--palm)]">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-[var(--sea-ink)]">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
      <div
        className="relative overflow-hidden rounded-3xl px-6 py-14 text-center shadow-[0_30px_80px_-30px_rgba(16,47,52,0.65)] sm:px-12"
        style={{
          background:
            'linear-gradient(135deg, #102f34 0%, #173a40 48%, #265a41 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 18% 18%, rgba(110,200,154,0.28), transparent 32%), radial-gradient(circle at 82% 74%, rgba(96,215,207,0.22), transparent 36%)',
          }}
        />
        <div className="relative mx-auto max-w-2xl">
          <p className="text-xs font-bold tracking-[0.16em] text-[#9fe3cf] uppercase">
            Rejoignez la famille
          </p>
          <h2 className="display-title mt-3 text-3xl font-semibold text-white sm:text-4xl">
            Prêt à retrouver vos racines ?
          </h2>
          <p className="mt-3 text-[#c9e7dd]">
            Connectez-vous pour explorer l’arbre familial et enrichir l’histoire
            de votre lignée.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <AuthCta
              authenticatedLabel="Accéder à mon arbre"
              variant="brand"
              size="lg"
              className="h-11 bg-white px-6 text-[15px] text-[#173a40] hover:bg-[#e7f0e8] dark:bg-white dark:text-[#173a40] dark:hover:bg-[#e7f0e8]"
            />
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-white/25 px-5 text-sm font-medium text-white no-underline transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:outline-none"
            >
              <Github className="size-4" aria-hidden="true" />
              Voir le code source
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer className="site-footer">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--lagoon)] to-[var(--palm)] text-white shadow-sm dark:text-[var(--bg-base)]">
            <TreeDeciduous className="size-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="display-title text-base font-semibold text-[var(--sea-ink)]">
              eFankatia
            </p>
            <p className="text-xs text-muted-foreground">
              L’histoire de votre famille, réunie.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 py-2 text-[var(--sea-ink-soft)] no-underline transition-colors hover:text-[var(--sea-ink)]"
          >
            <Github className="size-4" aria-hidden="true" />
            Code source
          </a>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 py-2 text-[var(--sea-ink-soft)] no-underline transition-colors hover:text-[var(--sea-ink)]"
          >
            <LogIn className="size-4" aria-hidden="true" />
            Se connecter
          </Link>
          <span className="text-muted-foreground">
            © {new Date().getFullYear()} eFankatia
          </span>
        </div>
      </div>
    </footer>
  )
}

function AuthCta({
  authenticatedLabel,
  guestLabel = 'Se connecter',
  variant = 'brand',
  size = 'default',
  className,
}: {
  authenticatedLabel: string
  guestLabel?: string
  variant?: 'brand' | 'outline' | 'ghost' | 'default'
  size?: 'default' | 'sm' | 'lg'
  className?: string
}) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return (
      <Button asChild variant={variant} size={size} className={className}>
        <Link to="/app">
          <TreeDeciduous aria-hidden="true" />
          {authenticatedLabel}
        </Link>
      </Button>
    )
  }

  return (
    <Button asChild variant={variant} size={size} className={className}>
      <Link to="/login">
        <LogIn aria-hidden="true" />
        {guestLabel}
      </Link>
    </Button>
  )
}

function ScreenshotFrame({
  src,
  alt,
  priority = false,
  className,
}: {
  src: string
  alt: string
  priority?: boolean
  className?: string
}) {
  return (
    <figure
      className={cn(
        'group overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-[0_28px_70px_-28px_rgba(23,58,64,0.55)]',
        className,
      )}
    >
      <img
        src={src}
        alt={alt}
        width={1920}
        height={1036}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        className="h-auto w-full transition-transform duration-700 ease-out group-hover:scale-[1.015]"
      />
    </figure>
  )
}
