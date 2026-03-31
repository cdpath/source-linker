import {Modal, Setting} from "obsidian";
import type {App} from "obsidian";
import type {ConversionPreview, LinkConversionMode} from "../types";

export async function promptForConversionMode(
	app: App,
	preview: ConversionPreview,
): Promise<Exclude<LinkConversionMode, "ask-every-time"> | null> {
	return await new Promise((resolve) => {
		new ConversionModeModal(app, preview, resolve).open();
	});
}

class ConversionModeModal extends Modal {
	private readonly preview: ConversionPreview;
	private readonly resolveSelection: (selection: Exclude<LinkConversionMode, "ask-every-time"> | null) => void;
	private didResolve = false;

	constructor(
		app: App,
		preview: ConversionPreview,
		resolveSelection: (selection: Exclude<LinkConversionMode, "ask-every-time"> | null) => void,
	) {
		super(app);
		this.preview = preview;
		this.resolveSelection = resolveSelection;
	}

	onOpen() {
		this.setTitle("Choose how to replace links");
		this.contentEl.empty();
		this.contentEl.createEl("p", {text: formatPreview(this.preview)});

		new Setting(this.contentEl)
			.addButton((button) => button
				.setButtonText("Replace all")
				.setCta()
				.onClick(() => this.finish("replace-all")))
			.addButton((button) => button
				.setButtonText("Replace existing only")
				.onClick(() => this.finish("existing-only")))
			.addButton((button) => button
				.setButtonText("Cancel")
				.onClick(() => this.finish(null)));
	}

	onClose() {
		this.contentEl.empty();

		if (!this.didResolve) {
			this.finish(null);
		}
	}

	private finish(selection: Exclude<LinkConversionMode, "ask-every-time"> | null) {
		if (this.didResolve) {
			return;
		}

		this.didResolve = true;
		this.resolveSelection(selection);
		this.close();
	}
}

function formatPreview(preview: ConversionPreview): string {
	return [
		`Found ${preview.eligibleLinksFound} eligible ${pluralize("link", preview.eligibleLinksFound)}.`,
		`${preview.existingMatches} already match existing ${pluralize("note", preview.existingMatches)}.`,
		`${preview.missingMatches} ${pluralize("link", preview.missingMatches)} would create new ${pluralize("note", preview.missingMatches)}.`,
		`${preview.ambiguousMatches} ${pluralize("link", preview.ambiguousMatches)} are ambiguous.`,
		`${preview.invalidMatches} ${pluralize("link", preview.invalidMatches)} are invalid.`,
	].join(" ");
}

function pluralize(noun: string, count: number): string {
	return count === 1 ? noun : `${noun}s`;
}
