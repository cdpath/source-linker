import {Notice, Plugin} from "obsidian";
import {convertExternalLinksToSourceNotes} from "./commands/convertExternalLinks";
import {DEFAULT_SETTINGS, SourceLinkerSettingTab} from "./settings";
import type {SourceLinkerSettings} from "./types";

export default class SourceLinkerPlugin extends Plugin {
	settings: SourceLinkerSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.addCommand({
			id: "convert-external-links-to-source-notes",
			name: "Convert external links to source notes",
			callback: async () => {
				try {
					await convertExternalLinksToSourceNotes(this);
				} catch (error) {
					console.error("Source Linker: failed to convert external links", error);
					new Notice("The command failed. Check the developer console for details.");
				}
			},
		});

		this.addSettingTab(new SourceLinkerSettingTab(this.app, this));
	}

	async loadSettings() {
		const loadedData = await this.loadData() as Partial<SourceLinkerSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
