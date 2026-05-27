// Spoken narration for dilemmas via the Web Speech API. Everything here is a safe
// no-op when there's no browser speech engine (e.g. during tests), so callers can
// invoke it unconditionally from the render path.
const KEY = "shasn.narration";
let lastSpokenDilemma = null;

const synth = () => (typeof window !== "undefined" ? window.speechSynthesis : null);

export function isNarrationEnabled() {
  if (typeof localStorage === "undefined") return true;       // default on
  return localStorage.getItem(KEY) !== "off";
}

export function setNarrationEnabled(on) {
  if (typeof localStorage !== "undefined") localStorage.setItem(KEY, on ? "on" : "off");
  if (!on) cancelNarration();
}

export function cancelNarration() {
  const s = synth();
  if (s) s.cancel();
}

// Speak a queue of phrases in order. Each phrase gets its own utterance so the
// engine inserts a natural pause between them.
function speak(phrases) {
  const s = synth();
  if (!s || !isNarrationEnabled()) return;
  s.cancel();
  for (const phrase of phrases) {
    if (!phrase) continue;
    const u = new window.SpeechSynthesisUtterance(String(phrase));
    u.rate = 1; u.pitch = 1;
    s.speak(u);
  }
}

// Read a dilemma aloud once: the question, then each answer label. Deduped so a
// re-render of the same dilemma (e.g. after an error) doesn't repeat it.
export function narrateDilemma(card) {
  if (!card || lastSpokenDilemma === card.id) return;
  lastSpokenDilemma = card.id;
  speak([card.question, ...card.answers.map((a, i) => `Option ${i + 1}. ${a.label}`)]);
}

// Read a single line aloud (e.g. the option the player just chose). Resets the
// dilemma dedupe so the next dilemma narrates even if it reuses a card id.
export function narrateChoice(text) {
  lastSpokenDilemma = null;
  speak([text]);
}
