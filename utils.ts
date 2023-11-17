export function* zip<T, U>(a: Iterable<T>, b: Iterable<U>): Generator<[T, U]> {
  const iterA = a[Symbol.iterator]();
  const iterB = b[Symbol.iterator]();

  while (true) {
    const a = iterA.next();
    const b = iterB.next();

    if (a.done || b.done) {
      break;
    }

    yield [a.value, b.value];
  }
}

export function* integers(): Generator<number> {
  let i = 0;
  while (true) {
    yield i++;
  }
}

export function ordinal(n: number): string {
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

export function debugBytes(char: string): string {
  return Array.from(Buffer.from(char))
    .map((b) => b.toString(16))
    .join(",");
}
