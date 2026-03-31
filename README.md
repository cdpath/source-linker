# Source Linker

Source Linker is an Obsidian community plugin that converts external Markdown links in the active note into internal links to source notes.

When you run **Convert external links to source notes**, the plugin:

- Finds standard inline Markdown links in the active note.
- Reuses an existing note when its front matter contains `source: <url>`.
- Creates a new note with `source: <url>` when no match exists.
- Preserves the original link label by using Obsidian's native link generation.

## Scope

Version 1 intentionally stays narrow:

- Processes only the active note.
- Supports standard inline links like `[label](https://example.com)`.
- Skips wiki links, embeds, bare URLs, HTML links, reference-style links, fenced code blocks, and inline code.
- Skips ambiguous matches when multiple notes share the same `source` URL.

## Settings

- **New note folder**: destination folder for newly created source notes. Leave it empty to use Obsidian's default new note location.
- **New note title strategy**: choose between link label, hostname plus URL slug, or timestamp fallback.
- **Link replacement mode**: ask every time, replace all links, or replace only links that already have source notes.
- **Duplicate handling**: v1 skips ambiguous `source` matches.

## Development

```bash
npm install
npm run dev
```

To build a production bundle:

```bash
npm run build
```

## Manual testing

Copy `manifest.json`, `main.js`, and `styles.css` to:

```text
<Vault>/.obsidian/plugins/source-linker/
```

Then reload Obsidian and enable the plugin in **Settings → Community plugins**.
