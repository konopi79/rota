/**
 * Reading cards aloud (R9) with the Web Speech API. Browser-only; every call is a no-op
 * where `speechSynthesis` is missing. iOS only lets a page speak from a user gesture, so
 * `speak` must be called from a tap / swipe / key handler, never from an effect.
 */

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** A Czech voice if the device has one; otherwise the default voice reads `lang` cs-CZ. */
function czechVoice(): SpeechSynthesisVoice | undefined {
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('cs'))
}

export function speak(text: string) {
  if (!speechSupported() || !text) return
  const synth = window.speechSynthesis
  // A new card interrupts the previous one — never a queue of stale names.
  synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'cs-CZ'
  const voice = czechVoice()
  if (voice) utterance.voice = voice
  synth.speak(utterance)
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}
