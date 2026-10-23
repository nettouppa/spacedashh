/** Splits streamed text into complete sentences ready to be spoken; returns the unfinished tail. */
export function takeSentences(buf: string, minLen = 12): { done: string[]; rest: string } {
  const done: string[] = [];
  let start = 0;
  const re = /[.!?…;:\n]+(?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buf))) {
    const end = m.index + m[0].length;
    if (end >= buf.length) break; // may still be a number like "1.5" mid-stream
    const s = buf.slice(start, end).trim();
    if (s.length >= minLen) { done.push(s); start = end; }
  }
  return { done, rest: buf.slice(start) };
}
