## PRD — Source Linker

**Source Linker** is an Obsidian plugin that converts Markdown external links in the active note into internal links by resolving each URL against a Vault note whose front matter contains `source: <url>`; if no matching note exists, it creates one and then links to it. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)
The plugin is delivered as a standard Obsidian community plugin, with required manifest fields such as `id`, `name`, `author`, `description`, `version`, `minAppVersion`, and `isDesktopOnly` defined in `manifest.json`. [docs.obsidian](https://docs.obsidian.md/Reference/Manifest)

## 1. Overview

Users often write or paste external Markdown links directly into notes, but later want those URLs represented as first-class notes in the Vault rather than remaining raw web links. [forum.obsidian](https://forum.obsidian.md/t/how-to-link-a-local-file-in-obsidian/5815)
Source Linker solves this by turning each eligible external link into a local note reference backed by a canonical `source` property, preserving the visible link label while normalizing the target into the knowledge base. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/generateMarkdownLink)

## 2. Problem

Today, converting external links into source notes is a manual multi-step workflow: search for an existing note with the same source URL, create one if it does not exist, add front matter, and then replace the original external link with an internal link. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)
This creates friction, introduces duplicates, and discourages users from maintaining a clean one-URL-one-note system for research and web references. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)

## 3. Goal

The product goal is to provide a single explicit command that transforms external Markdown links in the active note into internal links to source-backed notes. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
The command should reuse an existing note when `frontmatter.source === url`, and create a new note with `source: url` when no match exists. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)

## 4. Non-goals

Version 1 does not fetch webpage titles, crawl article content, summarize URLs, download assets, or enrich created notes with remote metadata. [forum.obsidian](https://forum.obsidian.md/t/how-to-link-a-local-file-in-obsidian/5815)
Version 1 also does not auto-run on paste, auto-run on save, or process the whole Vault in the background; it is a manual command operating only on the active note. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## 5. Target users

The primary users are Obsidian users who maintain reading notes, research notes, literature notes, source notes, or clipped references and use front matter as structured metadata. [reddit](https://www.reddit.com/r/ObsidianMD/comments/1b48rom/how_to_access_a_files_properties_data_types_eg/)
They care about durable note entities for external sources and want link cleanup to happen without interrupting their writing flow. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/generateMarkdownLink)

## 6. Core user stories

- As a user, I want to run one command on the active note so that existing external Markdown links become internal links to matching source notes when those notes already exist. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/generateMarkdownLink)
- As a user, I want the plugin to create a note automatically when no matching `source` note exists, so I do not need to stop writing and create it manually. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)
- As a user, I want the visible link text to remain unchanged after conversion, so the sentence reads the same after the underlying target becomes local. [obsidian-developer-docs.pages](https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/FileManager/generateMarkdownLink)
- As a user, I want generated links to follow Obsidian’s native link-generation behavior rather than custom formatting, so the output respects my link preferences. [obsidian-developer-docs.pages](https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/FileManager/generateMarkdownLink)

## 7. Functional requirements

### 7.1 Command surface

The plugin must expose a command named `Convert external links to source notes` in the Obsidian command palette. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
The command runs only when an active Markdown note is available; otherwise, the plugin exits with a notice and makes no changes. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)

### 7.2 Link detection

The plugin must detect standard inline Markdown links of the form `[label](url)` inside the active note body. [forum.obsidian](https://forum.obsidian.md/t/how-to-link-a-local-file-in-obsidian/5815)
Version 1 excludes wiki links, embeds, bare URLs, reference-style links, HTML links, and links inside code blocks or inline code. [forum.obsidian](https://forum.obsidian.md/t/how-to-link-a-local-file-in-obsidian/5815)

### 7.3 Source lookup

For each detected external URL, the plugin must inspect Markdown files in the Vault and read cached metadata through `metadataCache.getFileCache(file)` to determine whether front matter contains a matching `source` value. [reddit](https://www.reddit.com/r/ObsidianMD/comments/1b48rom/how_to_access_a_files_properties_data_types_eg/)
A match is defined as exact string equality between the external link URL and the note’s `frontmatter.source` value in v1. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)

### 7.4 Existing target behavior

If exactly one note matches `frontmatter.source === url`, the plugin must use that note as the target. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)
The original external link must then be replaced with an internal link generated through `FileManager.generateMarkdownLink`, using the original link label as alias when possible so the rendered text remains the same. [obsidian-developer-docs.pages](https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/FileManager/generateMarkdownLink)

### 7.5 Missing target behavior

If no note matches the URL, the plugin must create a new Markdown note. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)
The new note must contain front matter with at least `source: <url>`, and the original external link must be replaced with an internal link to that new note. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/generateMarkdownLink)

### 7.6 Duplicate match behavior

If more than one note matches the same `source` URL, the plugin must not silently choose one in v1. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)
Instead, it must skip conversion for that link and report the ambiguity in the completion summary. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)

### 7.7 Repeated URL behavior

If the same external URL appears multiple times in the active note, the plugin should resolve or create its target once during the current run and reuse that target for subsequent replacements in the same pass. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)
This avoids duplicate note creation and ensures consistent replacement behavior within one execution. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)

### 7.8 Result reporting

After execution, the plugin must show a concise completion notice summarizing at least: total eligible links found, links matched to existing notes, notes created, links skipped due to duplicate source matches, and links skipped due to invalid input. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
The notice should not require further user interaction in v1. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)

## 8. Settings

Version 1 should support a minimal settings set.

- **Plugin name**: `Source Linker`; **plugin id**: `source-linker`, which must be unique and cannot contain `obsidian`. [docs.obsidian](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- **New note folder**: configurable destination for newly created source notes. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **New note title strategy**: configurable rule for choosing the filename of a newly created note. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
- **Duplicate handling policy**: default is `skip` for ambiguous `source` matches in v1. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)

## 9. New note creation rules

The plugin must create notes with valid unique filenames and valid Vault paths. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)
The created note may otherwise be empty in v1 except for required front matter containing `source: <url>`. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)

Potential filename strategies for later implementation include:
- Use sanitized link label.
- Use sanitized hostname plus slug.
- Use timestamp fallback when no safe label is available.

These are product options, not required remote lookups. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## 10. Replacement rules

The plugin must preserve the original human-facing link label whenever possible by passing it as the alias to Obsidian’s native link-generation API. [obsidian-developer-docs.pages](https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/FileManager/generateMarkdownLink)
The replacement must modify only the exact matched Markdown token and must not alter surrounding prose, spacing, or punctuation. [forum.obsidian](https://forum.obsidian.md/t/how-to-link-a-local-file-in-obsidian/5815)

## 11. Edge cases

- Invalid or malformed URLs are skipped. [forum.obsidian](https://forum.obsidian.md/t/how-to-link-a-local-file-in-obsidian/5815)
- Non-HTTP and non-HTTPS URLs may be skipped in v1 unless explicitly supported later. [forum.obsidian](https://forum.obsidian.md/t/how-to-link-a-local-file-in-obsidian/5815)
- Links inside fenced code blocks and inline code are skipped. [forum.obsidian](https://forum.obsidian.md/t/how-to-link-a-local-file-in-obsidian/5815)
- Duplicate `source` matches are skipped and reported as ambiguous. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)
- Newly created notes should be linked using the returned file object from creation flow rather than relying solely on immediate metadata cache refresh timing. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)

## 12. UX requirements

Source Linker should behave as an explicit transformation tool, not a background automation system. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
The command should be safely repeatable: already-converted internal links should remain unchanged, making the operation effectively idempotent for processed links in normal use. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/generateMarkdownLink)

## 13. Success metrics

A successful run converts each eligible external Markdown link in the active note into an internal link backed by either an existing or newly created source note. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/generateMarkdownLink)
No duplicate note should be created when an exact `frontmatter.source` match already exists. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)

## 14. Acceptance criteria

1. Given an active note containing `[Example](https://example.com)`, if one Vault note has `source: https://example.com`, running the command replaces the external link with an internal link to that note while preserving `Example` as the visible label. [obsidian-developer-docs.pages](https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/FileManager/generateMarkdownLink)
2. Given the same input and no matching note, running the command creates a new note containing `source: https://example.com` and replaces the original external link with an internal link to the new note. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/generateMarkdownLink)
3. Given multiple notes with the same `source`, the plugin leaves the original external link unchanged and reports the ambiguity in the summary notice. [mintlify](https://www.mintlify.com/obsidianmd/obsidian-api/api/cached-metadata)
4. Given no active Markdown file, the command performs no mutations and shows a notice. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/Plugin)
5. Generated internal links use Obsidian’s native link generation behavior through `generateMarkdownLink`. [obsidian-developer-docs.pages](https://obsidian-developer-docs.pages.dev/Reference/TypeScript-API/FileManager/generateMarkdownLink)

## 15. Technical constraints

The plugin must comply with Obsidian manifest requirements, including required fields for plugin distribution and compatibility handling via `minAppVersion`. [docs.obsidian](https://docs.obsidian.md/Reference/Versions)
The plugin should be implemented as a standard TypeScript-based Obsidian plugin, using the official plugin development flow and sample-plugin-style project structure. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)

## 16. Out of scope for v1

The following are explicitly deferred:
- Auto-fetch page title from URL.
- Auto-fill note body from webpage content.
- Batch processing across multiple notes.
- Interactive duplicate resolver UI.
- Automatic execution on paste or save.
- Support for nonstandard Markdown or HTML link formats. [forum.obsidian](https://forum.obsidian.md/t/how-to-link-a-local-file-in-obsidian/5815)

## 17. Product definition summary

**Source Linker** is a command-driven Obsidian plugin that turns external Markdown links in the active note into internal links to notes identified by `frontmatter.source`; if no such note exists, it creates one and links to it automatically. [docs.obsidian](https://docs.obsidian.md/Reference/TypeScript+API/FileManager/generateMarkdownLink)
Its v1 value is speed, consistency, and de-duplication of source notes, without adding remote fetching, background automation, or workflow complexity. [docs.obsidian](https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin)
