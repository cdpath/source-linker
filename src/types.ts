export type NewNoteTitleStrategy = "link-label" | "hostname-slug" | "timestamp";
export type DuplicateHandlingPolicy = "skip";
export type LinkConversionMode = "ask-every-time" | "replace-all" | "existing-only";

export interface SourceLinkerSettings {
	newNoteFolder: string;
	newNoteTitleStrategy: NewNoteTitleStrategy;
	duplicateHandlingPolicy: DuplicateHandlingPolicy;
	linkConversionMode: LinkConversionMode;
}

export interface MarkdownLinkMatch {
	label: string;
	target: string;
	start: number;
	end: number;
	raw: string;
}

export interface ConversionSummary {
	eligibleLinksFound: number;
	convertedLinks: number;
	linksMatchedExisting: number;
	notesCreated: number;
	missingSkipped: number;
	ambiguousSkipped: number;
	invalidSkipped: number;
}

export interface ConversionPreview {
	eligibleLinksFound: number;
	existingMatches: number;
	missingMatches: number;
	ambiguousMatches: number;
	invalidMatches: number;
}
