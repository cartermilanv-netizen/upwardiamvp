const DROP_TAGS = new Set([
  "aside",
  "footer",
  "form",
  "head",
  "header",
  "iframe",
  "nav",
  "noscript",
  "script",
  "style",
  "svg",
  "template",
]);

const RAW_TAGS = new Set(["iframe", "noscript", "script", "style"]);

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const BLOCK_TAGS = new Set(["address", "article", "blockquote", "br", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li", "p", "section", "tr"]);

const DROP_MARKERS = [
  "advert",
  "breadcrumb",
  "cookie",
  "footer",
  "google-translate",
  "google_translate",
  "header__",
  "navbar",
  "search",
  "skip-navigation",
  "social__",
];

type StartTag = {
  name: string;
  attrs: string;
  end: number;
  selfClosing: boolean;
};

/**
 * Visible article text. Site chrome, search, ads, and the document head are removed.
 * Link targets are not followed.
 */
export function cleanHtml(html: string): string {
  const source = html.replace(/<!--[\s\S]*?-->/g, "");
  const dropStack: boolean[] = [];
  let skipping = 0;
  const chunks: string[] = [];
  let index = 0;

  while (index < source.length) {
    if (source[index] !== "<") {
      const next = source.indexOf("<", index);
      const end = next === -1 ? source.length : next;
      if (skipping === 0) chunks.push(source.slice(index, end));
      index = end;
      continue;
    }
    if (source.startsWith("<!", index)) {
      const end = source.indexOf(">", index);
      index = end === -1 ? source.length : end + 1;
      continue;
    }
    if (source.startsWith("</", index)) {
      const close = readClose(source, index);
      const dropped = dropStack.pop() ?? false;
      if (dropped) skipping = Math.max(0, skipping - 1);
      if (skipping === 0 && BLOCK_TAGS.has(close.name)) chunks.push("\n");
      index = close.end;
      continue;
    }
    const open = readStart(source, index);
    if (!open) {
      if (skipping === 0) chunks.push("<");
      index += 1;
      continue;
    }
    const drop = shouldDrop(open);
    const voidish = VOID_TAGS.has(open.name) || open.selfClosing;
    if (!voidish) {
      dropStack.push(drop);
      if (drop) skipping += 1;
    }
    if (RAW_TAGS.has(open.name)) {
      index = findRawEnd(source, open.end, open.name);
      if (!voidish) {
        const dropped = dropStack.pop() ?? false;
        if (dropped) skipping = Math.max(0, skipping - 1);
      }
      continue;
    }
    if (!drop && skipping === 0 && BLOCK_TAGS.has(open.name)) chunks.push("\n");
    index = open.end;
  }

  return normalizeText(decodeEntities(chunks.join("")));
}

export function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, " ")
    .split(/\n+/)
    .map((line) => line.replace(/[ \t\f\v]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

function shouldDrop(tag: StartTag): boolean {
  if (DROP_TAGS.has(tag.name)) return true;
  const blob = `${attr(tag.attrs, "class")} ${attr(tag.attrs, "id")}`;
  if (DROP_MARKERS.some((marker) => blob.includes(marker))) return true;
  const role = attr(tag.attrs, "role");
  return role === "navigation" || role === "banner" || role === "contentinfo";
}

function attr(attrs: string, key: string): string {
  const match = new RegExp(`\\b${key}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i").exec(attrs);
  return (match?.[2] ?? match?.[3] ?? "").toLowerCase();
}

function readStart(input: string, start: number): StartTag | null {
  const nameMatch = /^<([a-zA-Z][\w:-]*)/.exec(input.slice(start));
  if (!nameMatch) return null;
  let index = start + nameMatch[0].length;
  let quote: string | null = null;
  const attrStart = index;
  while (index < input.length) {
    const char = input[index];
    if (quote) {
      if (char === quote) quote = null;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      index += 1;
      continue;
    }
    if (char === ">") break;
    index += 1;
  }
  const attrs = input.slice(attrStart, index);
  return {
    name: nameMatch[1].toLowerCase(),
    attrs,
    end: index < input.length ? index + 1 : index,
    selfClosing: /\/\s*$/.test(attrs),
  };
}

function readClose(input: string, start: number): { name: string; end: number } {
  const nameMatch = /^<\/([a-zA-Z][\w:-]*)/.exec(input.slice(start));
  const end = input.indexOf(">", start);
  return {
    name: nameMatch?.[1]?.toLowerCase() ?? "",
    end: end === -1 ? input.length : end + 1,
  };
}

function findRawEnd(input: string, from: number, name: string): number {
  const close = new RegExp(`</${name}\\s*>`, "i").exec(input.slice(from));
  if (!close) return input.length;
  return from + close.index + close[0].length;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, digits: string) => safeCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

function safeCodePoint(code: number): string {
  if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return "";
  return String.fromCodePoint(code);
}
