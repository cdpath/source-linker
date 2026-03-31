import type {NewNoteTitleStrategy} from "./types";

const WRAPPING_PAIRS: Array<readonly [string, string]> = [
	["「", "」"],
	["『", "』"],
	["“", "”"],
	["‘", "’"],
	["《", "》"],
	["〈", "〉"],
	["\"", "\""],
	["'", "'"],
];

export function buildBaseFileName(
	url: string,
	linkLabel: string,
	strategy: NewNoteTitleStrategy,
): string {
	const sanitizedLabel = sanitizeFileName(stripWrappingPunctuation(linkLabel));
	const hostnameAndSlug = buildHostnameAndSlugFileName(url);
	const timestampFallback = buildTimestampFileName();

	switch (strategy) {
		case "link-label":
			return firstNonEmpty(sanitizedLabel, hostnameAndSlug, timestampFallback);
		case "hostname-slug":
			return firstNonEmpty(hostnameAndSlug, sanitizedLabel, timestampFallback);
		case "timestamp":
			return firstNonEmpty(timestampFallback, sanitizedLabel, hostnameAndSlug, "Source note");
	}
}

export function stripWrappingPunctuation(value: string): string {
	let normalizedValue = value.trim();

	while (normalizedValue.length >= 2) {
		const pair = WRAPPING_PAIRS.find(([opening, closing]) =>
			normalizedValue.startsWith(opening) && normalizedValue.endsWith(closing),
		);

		if (pair === undefined) {
			return normalizedValue;
		}

		normalizedValue = normalizedValue.slice(pair[0].length, normalizedValue.length - pair[1].length).trim();
	}

	return normalizedValue;
}

function buildHostnameAndSlugFileName(url: string): string {
	try {
		const parsedUrl = new URL(url);
		const hostname = parsedUrl.hostname.replace(/^www\./, "");
		const pathPart = parsedUrl.pathname
			.split("/")
			.filter((segment) => segment.length > 0)
			.map(decodeURIComponentSafe)
			.join(" ");

		return sanitizeFileName(pathPart.length > 0 ? `${hostname} ${pathPart}` : hostname);
	} catch {
		return "";
	}
}

function buildTimestampFileName(): string {
	const now = new Date();
	const year = now.getFullYear().toString();
	const month = `${now.getMonth() + 1}`.padStart(2, "0");
	const day = `${now.getDate()}`.padStart(2, "0");
	const hours = `${now.getHours()}`.padStart(2, "0");
	const minutes = `${now.getMinutes()}`.padStart(2, "0");
	const seconds = `${now.getSeconds()}`.padStart(2, "0");

	return `Source ${year}${month}${day} ${hours}${minutes}${seconds}`;
}

function sanitizeFileName(value: string): string {
	const sanitized = replaceControlCharacters(value)
		.replace(/[\\/:*?"<>|#^]/g, " ")
		.replace(/\[/g, " ")
		.replace(/\]/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^\.+|\.+$/g, "");

	return sanitized.slice(0, 120).trim();
}

function replaceControlCharacters(value: string): string {
	let normalizedValue = "";

	for (const character of value) {
		normalizedValue += character.charCodeAt(0) < 32 ? " " : character;
	}

	return normalizedValue;
}

function decodeURIComponentSafe(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function firstNonEmpty(...values: string[]): string {
	for (const value of values) {
		if (value.length > 0) {
			return value;
		}
	}

	return "Source note";
}
