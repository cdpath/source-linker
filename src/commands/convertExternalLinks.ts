import {MarkdownView, Notice} from "obsidian";
import {parseEligibleMarkdownLinks} from "../markdownLinks";
import {buildSourceIndex, resolveSourceNote} from "../sourceNotes";
import type SourceLinkerPlugin from "../main";
import {promptForConversionMode} from "../ui/conversionModeModal";
import type {
	ConversionPreview,
	ConversionSummary,
	LinkConversionMode,
	MarkdownLinkMatch,
} from "../types";

export async function convertExternalLinksToSourceNotes(plugin: SourceLinkerPlugin) {
	const activeView = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	const activeFile = activeView?.file;

	if (!activeView || !activeFile) {
		new Notice("Open a Markdown note before running the command.");
		return;
	}

	const noteContent = activeView.getViewData();
	const links = parseEligibleMarkdownLinks(noteContent);
	const summary: ConversionSummary = {
		eligibleLinksFound: links.length,
		convertedLinks: 0,
		linksMatchedExisting: 0,
		notesCreated: 0,
		missingSkipped: 0,
		ambiguousSkipped: 0,
		invalidSkipped: 0,
	};

	if (links.length === 0) {
		new Notice(formatSummary(summary));
		return;
	}

	const sourceIndex = buildSourceIndex(plugin.app);
	const conversionMode = await resolveConversionMode(plugin, links, sourceIndex);
	if (conversionMode === null) {
		new Notice("No changes made.");
		return;
	}

	const resolutionCache = new Map<string, ReturnType<typeof resolveSourceNote>>();
	const replacements: Array<{start: number; end: number; replacement: string}> = [];

	for (const link of links) {
		const normalizedUrl = normalizeExternalUrl(link.target);
		if (normalizedUrl === null) {
			summary.invalidSkipped++;
			continue;
		}

		const wasCached = resolutionCache.has(normalizedUrl);
		if (!wasCached) {
			resolutionCache.set(
				normalizedUrl,
				resolveSourceNote(
					plugin.app,
					plugin.settings,
					activeFile,
					normalizedUrl,
					link.label,
					sourceIndex,
					conversionMode === "replace-all",
				),
			);
		}

		const resolution = await resolutionCache.get(normalizedUrl)!;
		if (resolution.kind === "missing") {
			summary.missingSkipped++;
			continue;
		}

		if (resolution.kind === "ambiguous") {
			summary.ambiguousSkipped++;
			continue;
		}

		if (resolution.kind === "existing") {
			summary.linksMatchedExisting++;
		} else if (!wasCached) {
			summary.notesCreated++;
		}

		replacements.push({
			start: link.start,
			end: link.end,
			replacement: plugin.app.fileManager.generateMarkdownLink(
				resolution.file,
				activeFile.path,
				undefined,
				link.label,
			),
		});
		summary.convertedLinks++;
	}

	if (replacements.length > 0) {
		const updatedContent = applyReplacements(noteContent, replacements);
		if (updatedContent !== noteContent) {
			activeView.setViewData(updatedContent, false);
			await activeView.save();
		}
	}

	new Notice(formatSummary(summary));
}

async function resolveConversionMode(
	plugin: SourceLinkerPlugin,
	links: MarkdownLinkMatch[],
	sourceIndex: Map<string, unknown[]>,
): Promise<Exclude<LinkConversionMode, "ask-every-time"> | null> {
	if (plugin.settings.linkConversionMode !== "ask-every-time") {
		return plugin.settings.linkConversionMode;
	}

	const preview = buildConversionPreview(links, sourceIndex);
	return await promptForConversionMode(plugin.app, preview);
}

function buildConversionPreview(
	links: MarkdownLinkMatch[],
	sourceIndex: Map<string, unknown[]>,
): ConversionPreview {
	const preview: ConversionPreview = {
		eligibleLinksFound: links.length,
		existingMatches: 0,
		missingMatches: 0,
		ambiguousMatches: 0,
		invalidMatches: 0,
	};

	for (const link of links) {
		const normalizedUrl = normalizeExternalUrl(link.target);
		if (normalizedUrl === null) {
			preview.invalidMatches++;
			continue;
		}

		const matches = sourceIndex.get(normalizedUrl) ?? [];
		if (matches.length === 0) {
			preview.missingMatches++;
		} else if (matches.length === 1) {
			preview.existingMatches++;
		} else {
			preview.ambiguousMatches++;
		}
	}

	return preview;
}

function applyReplacements(
	content: string,
	replacements: Array<{start: number; end: number; replacement: string}>,
): string {
	let updatedContent = content;

	for (const replacement of [...replacements].sort((left, right) => right.start - left.start)) {
		updatedContent = `${updatedContent.slice(0, replacement.start)}${replacement.replacement}${updatedContent.slice(replacement.end)}`;
	}

	return updatedContent;
}

function normalizeExternalUrl(target: string): string | null {
	const trimmedTarget = target.trim();
	const normalizedTarget = trimmedTarget.startsWith("<") && trimmedTarget.endsWith(">")
		? trimmedTarget.slice(1, -1).trim()
		: trimmedTarget;

	if (normalizedTarget.length === 0 || /\s/.test(normalizedTarget)) {
		return null;
	}

	try {
		const parsedUrl = new URL(normalizedTarget);
		if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
			return null;
		}

		return normalizedTarget;
	} catch {
		return null;
	}
}

function formatSummary(summary: ConversionSummary): string {
	if (summary.eligibleLinksFound === 0) {
		return "Source Linker: found 0 eligible links in the active note.";
	}

	return [
		`Source Linker: found ${summary.eligibleLinksFound} eligible ${pluralize("link", summary.eligibleLinksFound)}.`,
		`${summary.convertedLinks} ${pluralize("link", summary.convertedLinks)} converted.`,
		`${summary.linksMatchedExisting} matched existing ${pluralize("note", summary.linksMatchedExisting)}.`,
		`${summary.notesCreated} ${pluralize("note", summary.notesCreated)} created.`,
		`${summary.missingSkipped} skipped because no source note exists.`,
		`${summary.ambiguousSkipped} skipped as ambiguous.`,
		`${summary.invalidSkipped} skipped as invalid.`,
	].join(" ");
}

function pluralize(noun: string, count: number): string {
	return count === 1 ? noun : `${noun}s`;
}
