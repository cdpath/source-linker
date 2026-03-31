import {App, TFile, TFolder, normalizePath} from "obsidian";
import {buildBaseFileName} from "./noteTitles";
import type {SourceLinkerSettings} from "./types";

export type SourceResolution =
	| {kind: "existing"; file: TFile}
	| {kind: "created"; file: TFile}
	| {kind: "missing"}
	| {kind: "ambiguous"; files: TFile[]};

export function buildSourceIndex(app: App): Map<string, TFile[]> {
	const sourceIndex = new Map<string, TFile[]>();

	for (const file of app.vault.getMarkdownFiles()) {
		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		const source = typeof frontmatter?.source === "string" ? frontmatter.source : null;
		if (source === null) {
			continue;
		}

		const matchingFiles = sourceIndex.get(source) ?? [];
		matchingFiles.push(file);
		sourceIndex.set(source, matchingFiles);
	}

	return sourceIndex;
}

export async function resolveSourceNote(
	app: App,
	settings: SourceLinkerSettings,
	activeFile: TFile,
	url: string,
	linkLabel: string,
	sourceIndex: Map<string, TFile[]>,
	allowCreateIfMissing: boolean,
): Promise<SourceResolution> {
	const matches = sourceIndex.get(url) ?? [];
	if (matches.length === 1) {
		const [match] = matches;
		if (match === undefined) {
			throw new Error(`Source Linker could not resolve the matched file for "${url}".`);
		}

		return {
			kind: "existing",
			file: match,
		};
	}

	if (matches.length > 1) {
		return {
			kind: "ambiguous",
			files: matches,
		};
	}

	if (!allowCreateIfMissing) {
		return {
			kind: "missing",
		};
	}

	const createdFile = await createSourceNote(app, settings, activeFile, url, linkLabel);
	sourceIndex.set(url, [createdFile]);

	return {
		kind: "created",
		file: createdFile,
	};
}

function buildSourceNoteBody(url: string): string {
	return `---\nsource: ${JSON.stringify(url)}\n---\n`;
}

async function createSourceNote(
	app: App,
	settings: SourceLinkerSettings,
	activeFile: TFile,
	url: string,
	linkLabel: string,
): Promise<TFile> {
	const destinationFolder = getDestinationFolder(app, settings, activeFile);
	await ensureFolderExists(app, destinationFolder);

	const baseFileName = buildBaseFileName(url, linkLabel, settings.newNoteTitleStrategy);
	const availablePath = buildAvailableFilePath(app, destinationFolder, baseFileName);
	return await app.vault.create(availablePath, buildSourceNoteBody(url));
}

function getDestinationFolder(app: App, settings: SourceLinkerSettings, activeFile: TFile): string {
	if (settings.newNoteFolder.length > 0) {
		return normalizeVaultFolderPath(settings.newNoteFolder);
	}

	return normalizeVaultFolderPath(app.fileManager.getNewFileParent(activeFile.path).path);
}

async function ensureFolderExists(app: App, folderPath: string) {
	if (folderPath.length === 0) {
		return;
	}

	const folderParts = folderPath.split("/");
	let currentFolderPath = "";

	for (const folderPart of folderParts) {
		currentFolderPath = currentFolderPath.length === 0
			? folderPart
			: `${currentFolderPath}/${folderPart}`;

		const existingFolder = app.vault.getAbstractFileByPath(currentFolderPath);
		if (existingFolder instanceof TFolder) {
			continue;
		}

		if (existingFolder !== null) {
			throw new Error(`Cannot create source note folder "${currentFolderPath}" because a file already exists there.`);
		}

		await app.vault.createFolder(currentFolderPath);
	}
}

function buildAvailableFilePath(app: App, folderPath: string, baseFileName: string): string {
	for (let attempt = 0; ; attempt++) {
		const suffix = attempt === 0 ? "" : ` ${attempt}`;
		const fileName = `${baseFileName}${suffix}.md`;
		const filePath = joinVaultPath(folderPath, fileName);

		if (app.vault.getAbstractFileByPath(filePath) === null) {
			return filePath;
		}
	}
}

function normalizeVaultFolderPath(path: string): string {
	const trimmedPath = path.trim().replace(/^\/+|\/+$/g, "");
	if (trimmedPath.length === 0 || trimmedPath === ".") {
		return "";
	}

	return normalizePath(trimmedPath);
}

function joinVaultPath(folderPath: string, fileName: string): string {
	return folderPath.length === 0 ? fileName : normalizePath(`${folderPath}/${fileName}`);
}
