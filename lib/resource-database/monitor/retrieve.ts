import { cleanHtml } from "./clean";
import type { FailureKind } from "./types";

export type BodyJudgment =
  | { contentRetrieved: true; cleanedText: string }
  | { contentRetrieved: false; failureKind: FailureKind };

/** HTTP errors and access interstitials are failures. They are not page text. */
export function judgeBody(input: { httpStatus: number; body: string; byteLength: number }): BodyJudgment {
  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    return { contentRetrieved: false, failureKind: "http_error" };
  }
  if (isInterstitial(input.body, input.byteLength)) {
    return { contentRetrieved: false, failureKind: "interstitial" };
  }
  const cleanedText = cleanHtml(input.body);
  if (cleanedText.trim() === "") return { contentRetrieved: false, failureKind: "empty_body" };
  return { contentRetrieved: true, cleanedText };
}

function isInterstitial(body: string, byteLength: number): boolean {
  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(body)?.[1]?.toLowerCase() ?? "";
  if (/access denied|just a moment|attention required|incapsula/.test(title)) return true;
  if (byteLength >= 1500) return false;
  const sample = body.toLowerCase();
  return /incapsula|cloudfront|access denied|captcha|_incapsula_resource/.test(sample);
}
