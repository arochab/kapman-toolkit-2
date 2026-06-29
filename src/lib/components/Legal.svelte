<script lang="ts">
  import { LEGAL_DOCS } from '../legal/content.js';

  // Minimal, safe markdown -> HTML for our own static legal docs (no user input, so no XSS
  // surface). Handles: # ## ### headings, **bold**, "- " lists, | tables |, and paragraphs.
  function inline(s: string): string {
    return s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function render(md: string): string {
    const lines = md.split('\n');
    const out: string[] = [];
    let i = 0;
    const flushList = (items: string[]) => { if (items.length) out.push('<ul>' + items.map((x) => '<li>' + inline(x) + '</li>').join('') + '</ul>'); };
    while (i < lines.length) {
      const line = lines[i];
      if (/^### /.test(line)) { out.push('<h3>' + inline(line.slice(4)) + '</h3>'); i++; continue; }
      if (/^## /.test(line)) { out.push('<h2>' + inline(line.slice(3)) + '</h2>'); i++; continue; }
      if (/^# /.test(line)) { out.push('<h1>' + inline(line.slice(2)) + '</h1>'); i++; continue; }
      if (/^\s*\|.*\|\s*$/.test(line)) {
        const rows: string[] = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i]); i++; }
        const cells = (r: string) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        const body = rows.filter((r) => !/^\s*\|[\s|:-]+\|\s*$/.test(r));
        if (body.length) {
          const head = cells(body[0]);
          const rest = body.slice(1);
          out.push('<table><thead><tr>' + head.map((c) => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>' +
            rest.map((r) => '<tr>' + cells(r).map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
        }
        continue;
      }
      if (/^- /.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^- /.test(lines[i])) { items.push(lines[i].slice(2)); i++; }
        flushList(items); continue;
      }
      if (line.trim() === '') { i++; continue; }
      out.push('<p>' + inline(line) + '</p>'); i++;
    }
    return out.join('\n');
  }
</script>

<div class="column legal">
  <nav class="legal-toc">
    {#each LEGAL_DOCS as d}
      <a href="#{d.id}">{d.title}</a>
    {/each}
  </nav>
  {#each LEGAL_DOCS as d}
    <section id={d.id} class="legal-doc">
      {@html render(d.body)}
    </section>
  {/each}
</div>

<style>
  .legal { max-width: 760px; }
  .legal-toc { display: flex; flex-wrap: wrap; gap: 18px; margin-bottom: 48px; padding-bottom: 18px; border-bottom: 1px solid color-mix(in srgb, var(--color-text-muted) 30%, transparent); }
  .legal-toc a { color: var(--color-cyan); font-size: 14px; text-decoration: none; }
  .legal-doc { margin-bottom: 64px; }
  .legal :global(h1) { font-family: var(--font-serif); font-weight: 300; font-size: clamp(24px, 4vw, 32px); color: var(--color-text); margin: 0 0 24px; }
  .legal :global(h2) { font-family: var(--font-serif); font-weight: 300; font-size: clamp(18px, 3vw, 22px); color: var(--color-text); margin: 40px 0 14px; }
  .legal :global(h3) { font-size: 15px; font-weight: 600; color: var(--color-text); margin: 24px 0 10px; }
  .legal :global(p) { color: var(--color-text-secondary); line-height: 1.7; margin: 0 0 14px; font-size: 15px; }
  .legal :global(strong) { color: var(--color-text); font-weight: 600; }
  .legal :global(ul) { margin: 0 0 16px; padding-left: 22px; }
  .legal :global(li) { color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 8px; font-size: 15px; }
  .legal :global(table) { width: 100%; border-collapse: collapse; margin: 0 0 20px; font-size: 13px; }
  .legal :global(th), .legal :global(td) { text-align: left; padding: 8px 10px; border-bottom: 1px solid color-mix(in srgb, var(--color-text-muted) 24%, transparent); color: var(--color-text-secondary); vertical-align: top; }
  .legal :global(th) { color: var(--color-text); font-weight: 500; }
</style>
