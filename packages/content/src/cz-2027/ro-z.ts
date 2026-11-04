import type { ClassContent2027 } from './types'

/**
 * What VDH 2027 changes in RO-Z (Beginner, B-001…B-036 = Z-001…Z-036) with start, finish and
 * the D0 cards (Zusatzschilder Z-0a…Z-0e = D0a…D0e), plan R22. The German text rules where the
 * Czech 2026 one differed. START, FINISH, D0a–D0d and the rest of Z-001…Z-032 are unchanged:
 * B-010, B-018, B-019, B-026, B-027 are red-framed in 2027 but describe the exercise our 2026
 * cards do (diff: `.cache/vdh2027/diff/ro-z.md`).
 */
export const RO_Z_2027: ClassContent2027 = {
  changes: {
    'Z-014': {
      // VDH 2027, S. 32: "darf der HF einen Schritt rückwärtsgehen" (2026: up to four);
      // "Diesem Schild wird zwingend ein Zusatzschild aus den Schildern a-e zugefügt"; feet
      // still "bei der Ausführung des Zusatzschildes (a-d)" — in D0e the handler walks.
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'V místě pro provedení cviku dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat jeden krok vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Během předsednutí a během provádění cviku z doplňkové karty D0a–d nesmí psovod pohybovat nohama.',
      ],
    },
    'Z-016': {
      // VDH 2027, S. 33: "Das Team sollte so schnell sein, dass der Hund zumindest traben muss."
      // The pace holds "bis der Hund sein Tempo ändern muss oder durch eine Übung zum Stillstand
      // kommen muss" — as in 2026; `sequencing` (pace, RO-V last only) unchanged.
      description: [
        'V místě pro provedení cviku tým zrychlí své tempo. Změna tempa musí být u psovoda i psa zřetelná. Tým by měl jít tak rychle, aby pes musel alespoň klusat. Tým udržuje rychlé tempo, dokud jiný cvik toto tempo nezmění (statický cvik, změna tempa, cíl - tento cvik může být i na konci parkuru).',
      ],
    },
    'Z-022': {
      // VDH 2027, S. 35: "In welche Richtung sich das Team aus der Figur 8 heraus bewegt, hängt
      // von der Position des nächsten Schildes ab." — replaces "Východ z figury se vždy nachází
      // na protilehlé straně proti vstupu". The geometry (out on the far side after three
      // crossings, straight on) stays one valid way of doing it.
      description: [
        'Čtyři prázdné misky přikryté poklopem jsou rozestavěny na vrcholech imaginárního kosočtverce tak, že pomyslná delší spojnice dvou protilehlých misek je 3 m a kratší pomyslná spojnice druhých dvou protilehlých misek je 1,5 m od sebe. Vstup do figury určuje karta, kterou tým vždy míjí po své levé straně (karta vždy vlevo od psa). Při provádění figury tým musí celkem 3x protnout pomyslný střed obrazce, přičemž vždy postupně obchází misky ležící na delší pomyslné spojnici. Směr postupu z figury určuje poloha další karty.',
      ],
    },
    'Z-025': {
      // VDH 2027, S. 35: "darf der HF einen Schritt rückwärtsgehen" while the dog comes to the
      // front (2026: up to four); "Zusatzschild aus den Schildern a- e"; feet "(a-d)".
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'V místě pro provedení cviku dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat jeden krok vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Poté co pes zaujme pozici před psovodem, udělá psovod jeden krok vzad, pes jej následuje a znovu usedá před psovodem. Během předsednutí a během provádění cviku z doplňkové karty D0a–d nesmí psovod pohybovat nohama.',
      ],
    },
    'Z-028': {
      // VDH 2027, S. 36: "Das Team macht vor dem Schild eine ca. 210° Wendung nach rechts"; the
      // card reads "210° rechts" (2026: 225°).
      name: '210° vpravo',
      description: [
        'Tým provede před kartou obrat vpravo o cca 210°, přičemž psovod provádí obrat na místě. Lehké posuny nohou ve směru obratu jsou povoleny. Pes během provádění cviku zůstává stále u nohy.',
      ],
      geometry: { turn: 210 },
    },
    'Z-029': {
      // VDH 2027, S. 37: "eine ca. 210° Wendung nach links"; the card reads "210° links".
      name: '210° vlevo',
      description: [
        'Tým provede před kartou obrat vlevo o cca 210°, přičemž psovod provádí obrat na místě. Lehké posuny nohou ve směru obratu jsou povoleny. Pes během provádění cviku zůstává stále u nohy.',
      ],
      geometry: { turn: -210 },
    },
    'Z-032': {
      // VDH 2027, S. 37: "darf der HF einen Schritt rückwärtsgehen" (2026: up to four);
      // "Zusatzschild aus den Schildern a-e"; feet "des Zusatzschildes (a-d)".
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'V místě pro provedení cviku dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat jeden krok vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Poté co pes zaujme pozici před psovodem, udělá psovod jeden krok vzad, pes jej následuje a poté ulehá před psovodem. Během předsednutí, ulehnutí a během provádění cviku z doplňkové karty D0a–d nesmí psovod pohybovat nohama.',
      ],
    },
  },
  cards: [
    {
      code: 'D0e',
      ruleset: 'CZ-2027',
      kind: 'supplementary',
      // VDH 2027, S. 29: "Z-0e Typ A" — the team ends in the Grundstellung.
      exerciseType: 'A',
      name: 'Zpět ke psu',
      description: [
        'Po předsednutí dá psovod psovi povel k setrvání na místě. Psovod se postaví vedle psa na původní stranu vedení (vpravo nebo vlevo), strana vedení se nemění. Může přitom projít před psem nebo za ním. Zůstane stát vedle psa, tým zaujme základní pozici a poté pokračuje v novém směru. Hodnocení je zahrnuto do bodového hodnocení cviku na hlavní kartě.',
      ],
      // VDH 2027, S. 29: "Der HF begibt sich neben seinen Hund auf die ursprüngliche Fußseite
      // (rechts oder links). Kein Seitenwechsel der Fußarbeit." — no `endSide`: unlike D0a–d
      // the dog keeps the side it had before the main card.
      sequencing: {},
      // VDH 2027, S. 29: "Das Team nimmt die Grundstellung ein und bewegt sich anschließend in
      // die neue Richtung." The dog sits in front facing the handler, the handler joins it
      // facing the same way — so the team goes on the other way, back the way it came. Which
      // side of the way in it walks back on (the dog's original heel side) is not encoded yet.
      geometry: { turn: 180 },
      image: 'd0e',
      sourcePage: 29,
    },
    {
      code: 'Z-033',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      // VDH 2027, S. 11 (§3.6): direction changes start "vor dem Schild" (Arbeitsbereich B).
      placement: 'B',
      exerciseType: 'B',
      name: 'Cik-cak vpravo, vlevo',
      description: [
        'Tým provede před kartou obrat vpravo o 90°, udělá dva kroky v novém směru a poté provede obrat vlevo o 90°. Pes zůstává stále u nohy. Tým bez zastavení pokračuje dál.',
      ],
      // VDH 2027, S. 38: "Hund und HF biegen vor dem Schild nach rechts ab, gehen zwei Schritte
      // in die neue Richtung und biegen dann nach links ab." No sequencing rule.
      sequencing: {},
      // By hand: Z-006's right turn (out 0.45 m ahead, 0.35 m right), two steps of ~0.5 m (as
      // Z-024's one step) to the right, then Z-007's left turn back to the way in (another
      // 0.35 m ahead, 0.45 m right). The team goes on parallel to its way in, ~1.8 m right.
      geometry: {
        via: [
          [0.45, -0.35],
          [0.45, -1.35],
        ],
        exit: 0.8,
        exitSide: -1.8,
      },
      image: 'z-033',
      sourcePage: 38,
    },
    {
      code: 'Z-034',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      // VDH 2027, S. 11 (§3.6): direction changes start "vor dem Schild" (Arbeitsbereich B).
      placement: 'B',
      exerciseType: 'B',
      name: 'Cik-cak vlevo, vpravo',
      description: [
        'Tým provede před kartou obrat vlevo o 90°, udělá dva kroky v novém směru a poté provede obrat vpravo o 90°. Pes zůstává stále u nohy. Tým bez zastavení pokračuje dál.',
      ],
      // VDH 2027, S. 38: "Hund und HF biegen vor dem Schild nach links ab, gehen zwei Schritte
      // in die neue Richtung und biegen dann nach rechts ab." No sequencing rule.
      sequencing: {},
      // By hand: the mirror of Z-033 (Z-007's left turn, two steps, Z-006's right turn).
      geometry: {
        via: [
          [0.45, 0.35],
          [0.45, 1.35],
        ],
        exit: 0.8,
        exitSide: 1.8,
      },
      image: 'z-034',
      sourcePage: 38,
    },
    {
      code: 'Z-035',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      exerciseType: 'A',
      name: 'Stop – 1 krok vpřed – lehni',
      description: [
        'Tým zastaví u karty v místě pro provedení cviku a zaujme základní pozici. Na povel psovoda tým postoupí o jeden krok vpřed, zastaví a pes si rovnou lehá u nohy psovoda (nesmí si nejprve sednout).',
      ],
      // VDH 2027, S. 38: "Dann gehen Hund und HF zusammen in Fußposition einen Schritt nach
      // vorne, halten an und der Hund legt sich direkt ins Platz." No sequencing rule.
      sequencing: {},
      // By hand: one step forward, as Z-024.
      geometry: { exit: 0.5 },
      image: 'z-035',
      sourcePage: 38,
    },
    {
      code: 'Z-036',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      exerciseType: 'B',
      name: '2 x čelem vzad – pes za psovodem',
      description: [
        'Psovod provede v místě pro provedení cviku obrat do té strany, na které se nachází pes, zatímco pes provádí obrat na tu stranu, kde se nachází psovod. Pes obchází psovoda zezadu a vrací se na výchozí stranu vedení. Jakmile se pes ocitne u nohy psovoda, tým udělá dva kroky a psovod provede znovu obrat do té strany, na které se nachází pes, zatímco pes znovu provádí obrat na tu stranu, kde se nachází psovod. Pes opět obchází psovoda zezadu a vrací se na výchozí stranu u nohy psovoda, takže tým na konci cviku pokračuje v původním směru. Obraty se provádí na místě (na ploše listu A4), oba kroky musí být zřetelné. Tým pokračuje dál bez zastavení.',
      ],
      // VDH 2027, S. 38: "Wenn der Hund die Fußposition wieder erreicht hat, zeigt das Team 2
      // Schritte Fußarbeit und führt die Kehrtwendungsübung erneut aus, so dass HF und Hund am
      // Ende der Übung wieder in Ausgangsrichtung weitergehen." (2026 1-116: "bez mezikroku").
      // The turns' direction is not in the text; the card shows both as Z-010's (handler to
      // the dog's side), as 2026 1-116 had it. No sequencing rule.
      sequencing: {},
      // By hand from 2026 1-116 (`exit: -0.3`): the two steps after the first turn about are
      // walked back along the way in (~0.5 m each, as Z-024), so the team ends ~1 m further back.
      geometry: { exit: -1.3 },
      image: 'z-036',
      sourcePage: 38,
    },
  ],
  pages: {
    START: 28,
    FINISH: 28,
    D0a: 28,
    D0b: 28,
    D0c: 29,
    D0d: 29,
    D0e: 29,
    'Z-001': 30,
    'Z-002': 30,
    'Z-003': 30,
    'Z-004': 30,
    'Z-005': 30,
    'Z-006': 31,
    'Z-007': 31,
    'Z-008': 31,
    'Z-009': 31,
    'Z-010': 31,
    'Z-011': 32,
    'Z-012': 32,
    'Z-013': 32,
    'Z-014': 32,
    'Z-015': 33,
    'Z-016': 33,
    'Z-017': 33,
    'Z-018': 33,
    'Z-019': 34,
    'Z-020': 34,
    'Z-021': 34,
    'Z-022': 35,
    'Z-023': 35,
    'Z-024': 35,
    'Z-025': 35,
    'Z-026': 36,
    'Z-027': 36,
    'Z-028': 36,
    'Z-029': 37,
    'Z-030': 37,
    'Z-031': 37,
    'Z-032': 37,
    'Z-033': 38,
    'Z-034': 38,
    'Z-035': 38,
    'Z-036': 38,
  },
}
