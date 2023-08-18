import words from "an-array-of-english-words";
import chalk from "chalk";
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const WORD_LENGTH = 5;
const CANDIDATES = words.filter((word) => word.length === WORD_LENGTH);
const GREEN_CHAR = "🟩";
const YELLOW_CHAR = "🟨";
const GRAY_CHAR = "⬜️";

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
		if (clue.slice(byteIndex, byteIndex + GREEN_CHAR.length) === GREEN_CHAR) {
			if (i === charIndex) {
				return GREEN_CHAR;
			}
			byteIndex += GREEN_CHAR.length;
		} else if (clue.slice(byteIndex, byteIndex + YELLOW_CHAR.length) === YELLOW_CHAR) {
			if (i === charIndex) {
				return YELLOW_CHAR;
			}
			byteIndex += YELLOW_CHAR.length;
		} else if (clue.slice(byteIndex, byteIndex + GRAY_CHAR.length) === GRAY_CHAR) {
			if (i === charIndex) {
				return GRAY_CHAR;
			}
			byteIndex += GRAY_CHAR.length;
		} else {
			throw new Error(
				`Invalid clue character: ${clue[i]} (at clue index ${i}, byte index ${byteIndex})`,
			);
		}
	}
}

export type Oracle = (candidate: string) => OracleAnswer;

export type OracleAnswer =
	| { possible: true }
	| { possible: false; reasons: string[] };

export function createOracleFromTurn([guess, clue]: Turn): Oracle {
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
		const availableChars = candidate.split("");

		const greens = clues.filter(({ clueChar }) => clueChar === GREEN_CHAR);
		const yellows = clues.filter(({ clueChar }) => clueChar === YELLOW_CHAR);
		const grays = clues.filter(({ clueChar }) => clueChar === GRAY_CHAR);

		for (const green of greens) {
			if (green.guessChar !== candidate[green.index]) {
				reasons.push(
					`"${green.guessChar}" must be in the ${ordinal(
						green.index + 1,
					)} position, but found "${candidate[green.index]}"`,
				);
			} else {
				availableChars[green.index] = "";
			}
		}

		for (const yellow of yellows) {
			const availableIndex =
				// pick the index of the yellow character if it's still available
				// so that we can falsify the candidate
				availableChars[yellow.index] === yellow.guessChar
					? yellow.index
					: availableChars.indexOf(yellow.guessChar);
			if (!candidate.includes(yellow.guessChar)) {
				reasons.push(
					`"${yellow.guessChar}" must be in the word, but isn't`,
				);
			} else if (availableIndex < 0) {
				reasons.push(
					`"${yellow.guessChar}" (from ${ordinal(yellow.index + 1)}) is in the word, but has already been claimed by another clue`,
				);
			} else if (availableIndex === yellow.index) {
				reasons.push(
					`"${yellow.guessChar}" is in the word, but not in the ${ordinal(yellow.index + 1)} position`,
				);
			} else {
				availableChars[availableIndex] = "";
			}
		}

		for (const gray of grays) {
			if (availableChars.includes(gray.guessChar)) {
				reasons.push(
					`"${gray.guessChar}" is not in the word`,
				);
			}
		}

		return reasons.length ? { possible: false, reasons } : { possible: true };
	};
}

export async function main(args: readonly string[]) {
	let printPossibleWords = false;
	let guessFile: string | undefined;

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case "-w":
			case "--words": {
				printPossibleWords = true;
				break;
			}
			default: {
				if (args[i].startsWith("-")) {
					throw new Error(`Invalid option: ${args[i]}`);
				} else if (guessFile) {
					throw new Error(`Invalid argument: ${args[i]}`);
				} else {
					guessFile = args[i];
				}
			}
		}
	}

	if (!guessFile) {
		throw new Error("Missing guess file");
	}

	const columns = parseInt(execSync("tput cols", { encoding: "utf8" }).trim());
	const input = await readFile(guessFile, "utf8");
	const lines = input.split("\n");
	const turns: Turn[] = [];

	for (const line of lines) {
		if (line.trim() === "") {
			continue;
		}

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
		const ask = createOracleFromTurn([guess, clue]);
		candidates = candidates.filter((candidate) => ask(candidate).possible);

		if (clue === GREEN_CHAR.repeat(WORD_LENGTH)) {
			process.stdout.write(
				`${chalk.bold('Solved!')} "${chalk.italic(guess.toUpperCase())}"\n`
			);
			break;
		}

		process.stdout.write(
			`${chalk.bold(`Turn #${guessIndex + 2}:`)} after "${chalk.italic(
				guess.toUpperCase(),
			)}" ${clue} ${chalk.dim(
				`(${candidates.length} ${candidates.length === 1 ? "word" : "words"
				} left)`,
			)}\n`,
		);

		if (printPossibleWords) {
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

	if (!printPossibleWords) {
		process.stdout.write(`${chalk.dim('Run with "--words" to print words at each turn.')}\n`);
	}
}
