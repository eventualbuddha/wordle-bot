import { expect, test } from "bun:test";
import { createOracleFromTurn } from "./index.js";

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
			'"b" is not in the word',
			'"r" is not in the second position',
			'"i" is not in the word',
			'"n" is not in the word',
			'"g" is not in the word',
		],
	});
	expect(check("beach")).toEqual({
		possible: false,
		reasons: ['"b" is not in the word'],
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

test("predicateForTurn mixed", () => {
	const ask = createOracleFromTurn(["bevel", "🟩🟩⬜️⬜️🟨"]);
	expect(ask("below")).toEqual({
		possible: true,
	});
});
