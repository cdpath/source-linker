import type {MarkdownLinkMatch} from "./types";

interface Range {
	start: number;
	end: number;
}

export function parseEligibleMarkdownLinks(text: string): MarkdownLinkMatch[] {
	const excludedMask = buildExcludedMask(text);
	const matches: MarkdownLinkMatch[] = [];

	for (let index = 0; index < text.length; index++) {
		if (excludedMask[index]) {
			continue;
		}

		if (text[index] !== "[" || isEscaped(text, index) || isImageEmbed(text, index)) {
			continue;
		}

		const labelEnd = findClosingBracket(text, index, excludedMask);
		if (labelEnd === -1) {
			continue;
		}

		const linkTargetStart = labelEnd + 1;
		if (linkTargetStart >= text.length || text[linkTargetStart] !== "(" || excludedMask[linkTargetStart]) {
			continue;
		}

		const linkTargetEnd = findClosingParenthesis(text, linkTargetStart, excludedMask);
		if (linkTargetEnd === -1) {
			continue;
		}

		matches.push({
			label: text.slice(index + 1, labelEnd),
			target: text.slice(linkTargetStart + 1, linkTargetEnd).trim(),
			start: index,
			end: linkTargetEnd + 1,
			raw: text.slice(index, linkTargetEnd + 1),
		});

		index = linkTargetEnd;
	}

	return matches;
}

function buildExcludedMask(text: string): Uint8Array {
	const excludedMask = new Uint8Array(text.length);
	const fencedCodeRanges = collectFencedCodeRanges(text);
	const excludedRanges = [
		...fencedCodeRanges,
		...collectInlineCodeRanges(text, fencedCodeRanges),
	].sort((left, right) => left.start - right.start);

	for (const range of excludedRanges) {
		for (let index = range.start; index < range.end; index++) {
			excludedMask[index] = 1;
		}
	}

	return excludedMask;
}

function collectFencedCodeRanges(text: string): Range[] {
	const ranges: Range[] = [];
	let inFence = false;
	let fenceMarker = "";
	let fenceStart = 0;

	for (let lineStart = 0; lineStart < text.length;) {
		const lineEnd = text.indexOf("\n", lineStart);
		const nextLineStart = lineEnd === -1 ? text.length : lineEnd + 1;
		const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
		const fenceMatch = line.match(/^[ \t]{0,3}(`{3,}|~{3,})/);

		if (!inFence) {
			const marker = fenceMatch?.[1];
			if (marker !== undefined) {
				inFence = true;
				fenceMarker = marker;
				fenceStart = lineStart;
			}
		} else {
			const marker = fenceMatch?.[1];
			if (marker !== undefined && marker[0] === fenceMarker[0] && marker.length >= fenceMarker.length) {
				ranges.push({
					start: fenceStart,
					end: nextLineStart,
				});
				inFence = false;
				fenceMarker = "";
			}
		}

		lineStart = nextLineStart;
	}

	if (inFence) {
		ranges.push({
			start: fenceStart,
			end: text.length,
		});
	}

	return ranges;
}

function collectInlineCodeRanges(text: string, fencedCodeRanges: Range[]): Range[] {
	const ranges: Range[] = [];
	let segmentStart = 0;

	for (const fencedCodeRange of fencedCodeRanges) {
		collectInlineCodeRangesInSegment(text, segmentStart, fencedCodeRange.start, ranges);
		segmentStart = fencedCodeRange.end;
	}

	collectInlineCodeRangesInSegment(text, segmentStart, text.length, ranges);
	return ranges;
}

function collectInlineCodeRangesInSegment(text: string, start: number, end: number, ranges: Range[]) {
	for (let index = start; index < end; index++) {
		if (text[index] !== "`" || isEscaped(text, index)) {
			continue;
		}

		const tickCount = countRepeatedCharacter(text, index, "`");
		const closingIndex = findMatchingTickRun(text, index + tickCount, end, tickCount);
		if (closingIndex === -1) {
			index += tickCount - 1;
			continue;
		}

		ranges.push({
			start: index,
			end: closingIndex + tickCount,
		});

		index = closingIndex + tickCount - 1;
	}
}

function findMatchingTickRun(text: string, start: number, end: number, tickCount: number): number {
	for (let index = start; index < end; index++) {
		if (text[index] !== "`" || isEscaped(text, index)) {
			continue;
		}

		const repeatedCount = countRepeatedCharacter(text, index, "`");
		if (repeatedCount === tickCount) {
			return index;
		}

		index += repeatedCount - 1;
	}

	return -1;
}

function findClosingBracket(text: string, openingBracketIndex: number, excludedMask: Uint8Array): number {
	let depth = 1;

	for (let index = openingBracketIndex + 1; index < text.length; index++) {
		if (excludedMask[index] || text[index] === "\n") {
			return -1;
		}

		if (isEscaped(text, index)) {
			continue;
		}

		if (text[index] === "[") {
			depth++;
		} else if (text[index] === "]") {
			depth--;
			if (depth === 0) {
				return index;
			}
		}
	}

	return -1;
}

function findClosingParenthesis(text: string, openingParenthesisIndex: number, excludedMask: Uint8Array): number {
	let depth = 1;

	for (let index = openingParenthesisIndex + 1; index < text.length; index++) {
		if (excludedMask[index] || text[index] === "\n") {
			return -1;
		}

		if (isEscaped(text, index)) {
			continue;
		}

		if (text[index] === "(") {
			depth++;
		} else if (text[index] === ")") {
			depth--;
			if (depth === 0) {
				return index;
			}
		}
	}

	return -1;
}

function countRepeatedCharacter(text: string, start: number, character: string): number {
	let count = 0;

	while (start + count < text.length && text[start + count] === character) {
		count++;
	}

	return count;
}

function isEscaped(text: string, index: number): boolean {
	let backslashCount = 0;

	for (let cursor = index - 1; cursor >= 0 && text[cursor] === "\\"; cursor--) {
		backslashCount++;
	}

	return backslashCount % 2 === 1;
}

function isImageEmbed(text: string, index: number): boolean {
	return index > 0 && text[index - 1] === "!";
}
