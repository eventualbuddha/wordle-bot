import { expect, test } from "bun:test";
import { Oracle, createOracleFromTurn } from "./index.js";

function createOracleFromHistory(history: string[]): Oracle {
	const oracles = history.map((turn) => {
		const [word, feedback] = turn.split(" ");
		return createOracleFromTurn([word, feedback]);
	});

	return (word: string) => {
		for (const oracle of oracles) {
			const answer = oracle(word);
			if (!answer.possible) {
				return answer;
			}
		}
		return { possible: true };
	}
}

test("predicateForTurn single green", () => {
	const guess = createOracleFromTurn(["bring", "🟩⬜️⬜️⬜️⬜️"]);
	expect(guess("")).toEqual({
		possible: false,
		reasons: ['"" must be 5 characters long'],
	});
	expect(guess("abc")).toEqual({
		possible: false,
		reasons: ['"abc" must be 5 characters long'],
	});
	expect(guess("bring")).toEqual({
		possible: false,
		reasons: [
			'"r" is not in the word',
			'"i" is not in the word',
			'"n" is not in the word',
			'"g" is not in the word',
		],
	});
	expect(guess("beach")).toEqual({
		possible: true,
	});
	expect(guess("slate")).toEqual({
		possible: false,
		reasons: ['"b" must be in the first position, but found "s"'],
	});
	expect(guess("barbs")).toEqual({
		possible: false,
		reasons: ['"r" is not in the word'],
	});
});

test("predicateForTurn single yellow", () => {
	const check = createOracleFromTurn(["bring", "⬜️🟨⬜️⬜️⬜️"]);
	expect(check("bring")).toEqual({
		possible: false,
		reasons: [
			'"r" is in the word, but not in the second position',
			'"b" is not in the word',
			'"i" is not in the word',
			'"n" is not in the word',
			'"g" is not in the word',
		],
	});
	expect(check("beach")).toEqual({
		possible: false,
		reasons: [
			`"r" must be in the word, but isn't`,
			'"b" is not in the word',
		],
	});
	expect(check("start")).toEqual({
		possible: true,
	});
});

test("predicateForTurn multiple green", () => {
	const ask = createOracleFromTurn(["beach", "🟩🟩⬜️⬜️⬜️"]);
	expect(ask("beach")).toEqual({
		possible: false,
		reasons: [
			'"a" is not in the word',
			'"c" is not in the word',
			'"h" is not in the word',
		],
	});
	expect(ask("bevel")).toEqual({
		possible: true,
	});
	expect(ask("bring")).toEqual({
		possible: false,
		reasons: ['"e" must be in the second position, but found "r"'],
	});
});

test("createOracleFromTurn mixed", () => {
	const ask = createOracleFromTurn(["bevel", "🟩🟩⬜️⬜️🟨"]);
	expect(ask("below")).toEqual({
		possible: true,
	});
});

test("createOracleFromTurn regression", () => {
	const ask = createOracleFromTurn(["thorn", "🟩⬜️🟨⬜️🟨"]);
	expect(ask("tummy")).toEqual({
		possible: false,
		reasons: [
			`"o" must be in the word, but isn't`,
			`"n" must be in the word, but isn't`,
		],
	});
});

test("createOracleFromTurn regression 2", () => {
	const ask = createOracleFromHistory([
		'flyer ⬜️⬜️⬜️🟨⬜️',
		'phone ⬜️⬜️⬜️⬜️🟨',
		'quest ⬜️⬜️🟨⬜️🟩',
		'edict 🟩⬜️⬜️🟩🟩',
	]);
	expect(ask("eject")).toEqual({
		possible: false,
		reasons: [
			`"e" is in the word, but not in the third position`,
		],
	});
});
