// Fetches OpenGraph metadata for a list of source URLs so agent results can be
// rendered as rich preview cards (thumbnail image + title + description),
// rather than plain links. Runs server-side, with per-URL timeouts and
// graceful fallbacks so a slow or hostile page never breaks a result.

export type RichSource = {
  uri: string
  title: string
  image?: string
  description?: string
  siteName?: string
}

const TIMEOUT_MS = 4500
const MAX_PREVIEWS = 5
const MAX_HTML_BYTES = 250_000

export async function fetchLinkPreviews(
  sources: { uri: string; title: string }[],
): Promise<RichSource[]> {
  const seen = new Set<string>()
  const unique = sources.filter((s) => {
    if (!/^https?:\/\//i.test(s.uri) || seen.has(s.uri)) return false
    seen.add(s.uri)
    return true
  })
  const slice = unique.slice(0, MAX_PREVIEWS)
  return Promise.all(slice.map((s) => fetchOne(s).catch(() => fallback(s))))
}

function fallback(s: { uri: string; title: string }): RichSource {
  return { uri: s.uri, title: s.title, siteName: hostname(s.uri) }
}

async function fetchOne(s: { uri: string; title: string }): Promise<RichSource> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(s.uri, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TaskAgentBot/1.0; +preview)' },
    })
    const finalUrl = res.url || s.uri
    if (!res.ok) return { uri: finalUrl, title: s.title, siteName: hostname(finalUrl) }

    const html = (await res.text()).slice(0, MAX_HTML_BYTES)

    let image =
      metaContent(html, 'og:image') ||
      metaContent(html, 'og:image:url') ||
      metaContent(html, 'twitter:image') ||
      metaContent(html, 'twitter:image:src')
    if (image) image = absolutize(image, finalUrl)

    const title = clean(metaContent(html, 'og:title') || titleTag(html) || s.title)
    const description = metaContent(html, 'og:description') || metaContent(html, 'description')
    const siteName = clean(metaContent(html, 'og:site_name') || '') || hostname(finalUrl)

    return {
      uri: finalUrl,
      title,
      image,
      description: description ? clean(description).slice(0, 180) : undefined,
      siteName,
    }
  } finally {
    clearTimeout(timer)
  }
}

/** Find a <meta> tag whose property/name equals `key` and return its content. */
function metaContent(html: string, key: string): string | undefined {
  const re = /<meta\b[^>]*>/gi
  let m: RegExpExecArray | null
  const lower = key.toLowerCase()
  while ((m = re.exec(html))) {
    const tag = m[0]
    const prop = (attr(tag, 'property') || attr(tag, 'name') || '').toLowerCase()
    if (prop === lower) {
      const content = attr(tag, 'content')
      if (content) return content
    }
  }
  return undefined
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'))
  return m ? (m[2] ?? m[3]) : undefined
}

function titleTag(html: string): string | undefined {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return m?.[1]?.trim() || undefined
}

function absolutize(url: string, base: string): string | undefined {
  try {
    return new URL(url, base).href
  } catch {
    return undefined
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function clean(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim()
}
