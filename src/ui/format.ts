/** Troca {chave} pelos valores. Chaves desconhecidas ficam como estão (viram ícones no RichText). */
export function fill(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{([\w-]+)\}/g, (m, key: string) =>
    key in values ? String(values[key]) : m,
  )
}

/** Remove marcações (**negrito**, {ícone}) para usar em aria-label e anúncios. */
export function plain(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\{[\w-]+\}\s?/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ')
}
