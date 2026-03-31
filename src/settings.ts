import {App, PluginSettingTab, Setting, normalizePath} from "obsidian";
import type SourceLinkerPlugin from "./main";
import type {
	DuplicateHandlingPolicy,
	LinkConversionMode,
	NewNoteTitleStrategy,
	SourceLinkerSettings,
} from "./types";

export const DEFAULT_SETTINGS: SourceLinkerSettings = {
	newNoteFolder: "",
	newNoteTitleStrategy: "link-label",
	duplicateHandlingPolicy: "skip",
	linkConversionMode: "ask-every-time",
};

const TITLE_STRATEGY_LABELS: Record<NewNoteTitleStrategy, string> = {
	"link-label": "Use the link label",
	"hostname-slug": "Use the hostname and URL slug",
	"timestamp": "Use a timestamp fallback",
};

const DUPLICATE_POLICY_LABELS: Record<DuplicateHandlingPolicy, string> = {
	"skip": "Skip ambiguous source matches",
};

const LINK_CONVERSION_MODE_LABELS: Record<LinkConversionMode, string> = {
	"ask-every-time": "Ask every time",
	"replace-all": "Replace all links",
	"existing-only": "Replace existing only",
};

export class SourceLinkerSettingTab extends PluginSettingTab {
	plugin: SourceLinkerPlugin;

	constructor(app: App, plugin: SourceLinkerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("New note folder")
			.setDesc("Leave empty to use Obsidian's default new note location.")
			.addText((text) => text
				.setPlaceholder("Sources")
				.setValue(this.plugin.settings.newNoteFolder)
				.onChange(async (value) => {
					this.plugin.settings.newNoteFolder = normalizeFolderSetting(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("New note title strategy")
			.setDesc("Choose how the plugin names notes created for missing links.")
			.addDropdown((dropdown) => {
				for (const strategy of Object.keys(TITLE_STRATEGY_LABELS) as NewNoteTitleStrategy[]) {
					dropdown.addOption(strategy, TITLE_STRATEGY_LABELS[strategy]);
				}

				dropdown
					.setValue(this.plugin.settings.newNoteTitleStrategy)
					.onChange(async (value) => {
						this.plugin.settings.newNoteTitleStrategy = value as NewNoteTitleStrategy;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Duplicate handling")
			.setDesc("Choose what happens when multiple notes share the same source URL.")
			.addDropdown((dropdown) => {
				for (const policy of Object.keys(DUPLICATE_POLICY_LABELS) as DuplicateHandlingPolicy[]) {
					dropdown.addOption(policy, DUPLICATE_POLICY_LABELS[policy]);
				}

				dropdown
					.setValue(this.plugin.settings.duplicateHandlingPolicy)
					.onChange(async (value) => {
						this.plugin.settings.duplicateHandlingPolicy = value as DuplicateHandlingPolicy;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Link replacement mode")
			.setDesc("Choose whether to ask before replacing links or use a fixed mode.")
			.addDropdown((dropdown) => {
				for (const mode of Object.keys(LINK_CONVERSION_MODE_LABELS) as LinkConversionMode[]) {
					dropdown.addOption(mode, LINK_CONVERSION_MODE_LABELS[mode]);
				}

				dropdown
					.setValue(this.plugin.settings.linkConversionMode)
					.onChange(async (value) => {
						this.plugin.settings.linkConversionMode = value as LinkConversionMode;
						await this.plugin.saveSettings();
					});
			});
	}
}

function normalizeFolderSetting(value: string): string {
	const trimmedValue = value.trim().replace(/^\/+|\/+$/g, "");
	if (trimmedValue.length === 0) {
		return "";
	}

	return normalizePath(trimmedValue);
}
