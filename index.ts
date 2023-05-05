import words from "an-array-of-english-words";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const WORD_LENGTH = 5;
const CANDIDATES = words.filter((word) => word.length === WORD_LENGTH);

type Turn = [string, string];

function ordinal(n: number): string {
	switch (n) {
		case 1:
			return "first";

		case 2:
			return "second";

		case 3:
			return "third";

		case 4:
			return "fourth";

		case 5:
			return "fifth";

		default:
			throw new Error(`Invalid ordinal: ${n}`);
	}
}

function clueCharAtIndex(clue: string, charIndex: number) {
	let byteIndex = 0;
	for (let i = 0; i < WORD_LENGTH; i++) {
		if (clue.slice(byteIndex, byteIndex + "🟩".length) === "🟩") {
			if (i === charIndex) {
				return "🟩";
			}
			byteIndex += "🟩".length;
		} else if (clue.slice(byteIndex, byteIndex + "🟨".length) === "🟨") {
			if (i === charIndex) {
				return "🟨";
			}
			byteIndex += "🟨".length;
		} else if (clue.slice(byteIndex, byteIndex + "⬜️".length) === "⬜️") {
			if (i === charIndex) {
				return "⬜️";
			}
			byteIndex += "⬜️".length;
		} else {
			throw new Error(
				`Invalid clue character: ${clue[i]} (at clue index ${i}, byte index ${byteIndex})`,
			);
		}
	}
}

export type OracleAnswer =
	| { possible: true }
	| { possible: false; reasons: string[] };

export function createOracleFromTurn([guess, clue]: Turn): (
	candidate: string,
) => OracleAnswer {
	const clues = Array.from(guess, (guessChar, guessIndex) => ({
		index: guessIndex,
		guessChar,
		clueChar: clueCharAtIndex(clue, guessIndex),
	}));

	return (candidate) => {
		if (candidate.length !== WORD_LENGTH) {
			return {
				possible: false,
				reasons: [`"${candidate}" must be ${WORD_LENGTH} characters long`],
			};
		}

		const reasons: string[] = [];

		const greens = clues.filter(({ clueChar }) => clueChar === "🟩");
		const yellows = clues.filter(({ clueChar }) => clueChar === "🟨");
		const grays = clues.filter(({ clueChar }) => clueChar === "⬜️");

		// try to falsify the candidate
		char: for (const [index, candidateChar] of candidate.split("").entries()) {
			for (const green of greens) {
				if (green.index === index && green.guessChar !== candidateChar) {
					reasons.push(
						`"${green.guessChar}" must be in the ${ordinal(
							index + 1,
						)} position, but found "${candidateChar}"`,
					);
					continue char;
				} else if (green.index === index && green.guessChar === candidateChar) {
					// green is satisfied, so we can skip the rest of the checks
					continue char;
				}
			}

			for (const yellow of yellows) {
				if (yellow.index === index && yellow.guessChar === candidateChar) {
					reasons.push(
						`"${candidateChar}" is not in the ${ordinal(index + 1)} position`,
					);
					continue char;
				}
			}

			for (const gray of grays) {
				if (gray.index === index && gray.guessChar === candidateChar) {
					reasons.push(`"${candidateChar}" is not in the word`);
					continue char;
				}

				if (
					grays.some((gray) => gray.guessChar === candidateChar) &&
					yellows.every((yellow) => yellow.guessChar !== candidateChar)
				) {
					reasons.push(`"${candidateChar}" is not in the word`);
					continue char;
				}
			}
		}

		return reasons.length ? { possible: false, reasons } : { possible: true };
	};
}

export async function main(args: readonly string[]) {
	const columns = parseInt(execSync("tput cols", { encoding: "utf8" }).trim());
	const input = await readFile(args[0], "utf8");
	const lines = input.split("\n");
	const turns: Turn[] = [];

	for (const line of lines) {
		const [guess, clue] = line.split(" ");
		turns.push([guess.toLowerCase(), clue]);
		if (guess.length !== WORD_LENGTH) {
			throw new Error(
				`Invalid guess "${guess}": ${guess} (length ${guess.length})`,
			);
		}

		if (clue.length !== WORD_LENGTH * 2) {
			throw new Error(
				`Invalid clue for guess "${guess}": ${clue} (length ${clue.length})`,
			);
		}
	}

	let candidates = CANDIDATES.slice();
	for (const [guessIndex, [guess, clue]] of turns.entries()) {
		process.stdout.write(
			`${chalk.bold(`Turn #${guessIndex + 2}:`)} after "${chalk.italic(
				guess.toUpperCase(),
			)}" ${clue}\n`,
		);

		const ask = createOracleFromTurn([guess, clue]);
		candidates = candidates.filter((candidate) => ask(candidate).possible);

		let line = "";
		for (const candidate of candidates) {
			if (line.length + candidate.length === columns) {
				process.stdout.write(`${line}${candidate.toUpperCase()}\n`);
			} else if (line.length + candidate.length > columns) {
				process.stdout.write(`${line}\n`);
				line = `${candidate.toUpperCase()} `;
			} else {
				line += `${candidate.toUpperCase()} `;
			}
		}

		if (line.length) {
			process.stdout.write(`${line}\n`);
		}
	}
}
