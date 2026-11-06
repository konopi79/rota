import type { ClassContent2027 } from './types'

/**
 * What VDH 2027 changes in RO1 (plan R22): VDH Regelwerk Rally Obedience 2027, Anhang 2,
 * "RO 1 (Übungen 1-101 bis 1-130 …)", S. 39–45; general definitions on S. 16–17 ("90°
 * Drehung", "180° Drehung", "Schritte"), the Arbeitsbereich on S. 10 (§3.6). Where the Czech
 * 2026 text departed from the German one, the German rules (the author's decision). Red frames
 * (changed or new in Germany, Anhang 1 S. 22–24): 1-116 and 1-126–1-130 only.
 */
export const RO1_2027: ClassContent2027 = {
  changes: {
    // VDH 2027, S. 39: "Eine leichte Vorwärtsbewegung der Füße ist erlaubt" — forward, not
    // "ve směru obratu".
    '1-101': {
      description: [
        'Tým provede v místě pro vykonání cviku obrat vlevo o 360°, přičemž psovod provádí obrat na místě. Lehký posun nohou vpřed je povolen. Pes během provádění cviku zůstává stále u nohy. Z pohledu psovoda se nemění směr postupu.',
      ],
    },
    // VDH 2027, S. 39: "Der HF setzt mit den Füßen einen 90° Winkel nach rechts (aus dem Stand
    // nur eine Fußbewegung, die Füße berühren sich). Der Hund bleibt in der Fußposition."
    '1-103': {
      description: [
        'Tým zastaví před kartou a zaujme základní pozici. Psovod natočí nohy o 90° vpravo (jedním pohybem nohou, nohy se dotýkají), pes zůstává v pozici u nohy. Tým pokračuje v chůzi.',
      ],
    },
    // VDH 2027, S. 39: as 1-103, "nach links".
    '1-104': {
      description: [
        'Tým zastaví před kartou a zaujme základní pozici. Psovod natočí nohy o 90° vlevo (jedním pohybem nohou, nohy se dotýkají), pes zůstává v pozici u nohy. Tým pokračuje v chůzi.',
      ],
    },
    // VDH 2027, S. 39: "Der HF setzt mit den Füßen mit dem ersten Schritt einen 90° Winkel nach
    // rechts (aus dem Stand nur eine Fußbewegung, die Füße berühren sich). … Mit dem zweiten
    // Schritt schließt der HF die Füße und der Hund setzt sich in Grundstellung."
    '1-105': {
      description: [
        'Tým zastaví před kartou a zaujme základní pozici. Psovod prvním krokem natočí nohy o 90° vpravo (jedním pohybem nohou, nohy se dotýkají), pes zůstává v pozici u nohy. Druhým krokem psovod přisune nohy k sobě a tým zaujme základní pozici.',
      ],
    },
    // VDH 2027, S. 40: as 1-105, "nach links".
    '1-106': {
      description: [
        'Tým zastaví před kartou a zaujme základní pozici. Psovod prvním krokem natočí nohy o 90° vlevo (jedním pohybem nohou, nohy se dotýkají), pes zůstává v pozici u nohy. Druhým krokem psovod přisune nohy k sobě a tým zaujme základní pozici.',
      ],
    },
    // VDH 2027, S. 40: "Während der Hund sich bewegt, um sich vor den HF zu setzen, darf der HF
    // einen Schritt rückwärtsgehen" (2026: up to four); "Während des Vorsitz, Vorsteh oder
    // Vorplatz und bei der Ausführung des Zusatzschildes (a-d) darf der HF seine Füße nicht
    // bewegen. Diesem Schild wird zwingend ein Zusatzschild aus den Schildern a-e zugefügt."
    // (`requiresSupplementary` stays.)
    '1-108': {
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'V místě pro provedení cviku dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat jeden krok vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Poté co pes zaujme pozici před psovodem, provede psovod jeden krok vzad, pes jej následuje a zaujímá pozici stůj před psovodem. Následně psovod provede dva kroky vzad, pes jej následuje a zaujímá pozici sedni před psovodem. Dále psovod provede tři kroky vzad, pes jej následuje a zaujímá pozici lehni před psovodem.',
        'Během zaujímání pozic před psovodem a provádění cviku z doplňkové karty D0a–d nesmí psovod pohybovat nohama.',
      ],
    },
    // VDH 2027, S. 41: "Die zwei mittleren Pylonen werden durch Schalen mit Futter und/ oder
    // Spielzeug ersetzt. … so abgesichert werden, dass Hunde, die bei dieser Übung die
    // Fußposition verlassen, daran gehindert werden, sich selbst zu belohnen." The 2026
    // sentence "… nesplněn (-10 bodů)" is not in it: Anhang 4 (S. 70) scores "Hund beißt in eine
    // Futterschüssel oder wirft sie um" as "nb" — scoring is left out of the description.
    '1-111': {
      description: [
        'Dva kužely a dvě misky jsou rozestavěny v řadě za sebou s rozestupem 1,5 m od sebe tak, že misky jsou v řadě umístěny mezi kužely. V miskách se nachází aromatické pamlsky a/nebo hračky, misky musí být zakryté tak, aby se pes, který opustí pozici u nohy, nemohl sám odměnit. Karta je umístěna před prvním kuželem, viditelná ze směru příchodu týmu, který vstupuje do slalomu vždy zprava (tj. první kužel po své levé straně psa). Směr postupu ze slalomu závisí na poloze další karty.',
      ],
    },
    // VDH 2027, S. 41: "Vor dem Schild dreht sich der HF auf der Stelle um 180° nach rechts";
    // S. 17: "auf der Stelle um 180° … (auf einem DIN A 4 Blatt)". No step count (2026: "max.
    // 4 kroky nohou").
    '1-112': {
      description: [
        'Před kartou provede tým na místě (na ploše listu A4) obrat o 180° vpravo. Pes zůstává v pozici u nohy.',
      ],
    },
    // VDH 2027, S. 42: as 1-112, "nach links".
    '1-113': {
      description: [
        'Před kartou provede tým na místě (na ploše listu A4) obrat o 180° vlevo. Pes zůstává v pozici u nohy.',
      ],
    },
    // VDH 2027, S. 42: "darf der HF einen Schritt rückwärtsgehen" (2026: up to four); "Während
    // des Vorsitzens und bei der Ausführung des Zusatzschildes (a-d) darf der HF seine Füße nicht
    // bewegen. Diesem Schild wird zwingend ein Zusatzschild aus den Schildern a- e zugefügt."
    // "Anschließend geht das Team rechts am Schild vorbei" = "míjí kartu po své levé straně",
    // as in 2026. (`requiresSupplementary` stays.)
    '1-114': {
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'Před kartou dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat jeden krok vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Jakmile pes zaujme pozici před psovodem, psovod udělá znatelný úkrok doprava (ne diagonálně), přičemž pes jej následuje a končí opět v předsednutí před psovodem. Po splnění cviku na doplňkové kartě tým míjí kartu po své levé straně.',
        'Během předsednutí a provádění cviku z doplňkové karty D0a–d nesmí psovod pohybovat nohama.',
      ],
    },
    // VDH 2027, S. 42: as 1-114, "nach links", "Anschließend geht das Team links am Schild
    // vorbei" = "míjí kartu po své pravé straně", as in 2026.
    '1-115': {
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'Před kartou dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat jeden krok vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Jakmile pes zaujme pozici před psovodem, psovod udělá znatelný úkrok doleva (ne diagonálně), přičemž pes jej následuje a končí opět v předsednutí před psovodem. Po splnění cviku na doplňkové kartě tým míjí kartu po své pravé straně.',
        'Během předsednutí a provádění cviku z doplňkové karty D0a–d nesmí psovod pohybovat nohama.',
      ],
    },
    // VDH 2027, S. 43: "Die „Acht“ wird komplett, ohne anzuhalten absolviert. In welche Richtung
    // sich das Team aus der Figur 8 heraus bewegt, hängt von der Position des nächsten Schildes
    // ab." (2026: "Východ … vždy na protilehlé straně proti vstupu".) The "-10 bodů" paragraph
    // is scoring (Anhang 4, S. 70: "nb"), left out as for 1-111. The geometry stays: after
    // crossing the centre three times the team is on the far side anyway.
    '1-117': {
      description: [
        'Čtyři misky, naplněné pamlsky a hračkami, přikryté poklopem jsou rozestavěny na vrcholech imaginárního kosočtverce tak, že pomyslná delší spojnice dvou protilehlých misek je 3 m a kratší pomyslná spojnice druhých dvou protilehlých misek je 1,5 m od sebe. Vstup do figury určuje karta, kterou tým vždy míjí po své levé straně (karta vždy vlevo od psa). Při provádění figury tým musí celkem 3x protnout pomyslný střed obrazce, přičemž vždy postupně obchází misky ležící na delší pomyslné spojnici. Figura se provádí celá bez zastavení. Směr postupu z figury závisí na poloze další karty.',
      ],
    },
    // VDH 2027, S. 43: "Der HF hält vor dem Schild an und der Hund stellt sich neben den HF in
    // die Fußposition. Der HF setzt mit den Füßen einen 90° Winkel nach rechts (aus dem Stand
    // nur eine Fußbewegung, die Füße berühren sich)."
    '1-119': {
      description: [
        'Tým zastaví před kartou, pes zůstává stát vedle psovoda. Psovod natočí nohy o 90° vpravo (jedním pohybem nohou, nohy se dotýkají), pes zůstává v pozici u nohy. Tým pokračuje v chůzi.',
      ],
    },
    // VDH 2027, S. 44: as 1-119, "nach links".
    '1-120': {
      description: [
        'Tým zastaví před kartou, pes zůstává stát vedle psovoda. Psovod natočí nohy o 90° vlevo (jedním pohybem nohou, nohy se dotýkají), pes zůstává v pozici u nohy. Tým pokračuje v chůzi.',
      ],
    },
    // VDH 2027, S. 44: "eine Drehung von 180° nach rechts, 2 Zwischenschritte und dann eine
    // Drehung von 180° nach links"; S. 17: "(auf einem DIN A 4 Blatt)" — no "max. 4 kroky".
    '1-121': {
      description: [
        'Tým provede v místě pro vykonání cviku na místě (na ploše listu A4) obrat o 180° vpravo, poté následují 2 kroky vpřed a opět obrat na místě tentokrát o 180° vlevo. Pes po celou dobu zůstává v pozici u nohy.',
      ],
    },
    // VDH 2027, S. 44: as 1-121, left first.
    '1-122': {
      description: [
        'Tým provede v místě pro vykonání cviku na místě (na ploše listu A4) obrat o 180° vlevo, poté následují 2 kroky vpřed a opět obrat na místě tentokrát o 180° vpravo. Pes po celou dobu zůstává v pozici u nohy.',
      ],
    },
    // VDH 2027, S. 44: "Aus der Bewegung heraus macht Hund einen Seitenwechsel hinter dem HF. Die
    // Fußseite wird dabei gewechselt. Das Team bleibt in Bewegung." — nothing about the arc: the
    // 2026 "Pes nesmí při výměně udělat velký oblouk" is dropped.
    '1-123': {
      description: [
        'Pes v místě pro vykonání cviku provede za psovodem výměnu strany. Psovod se stále pohybuje dopředu. Strana vedení je změněna.',
      ],
    },
    // VDH 2027, S. 44: "Der Hund macht einen bogenförmigen Seitenwechsel vor dem HF, dann eine
    // Drehung von außen nach innen und setzt sich neben den HF in Fußposition."
    '1-125': {
      description: [
        'Tým zastaví v místě pro vykonání cviku a zaujme základní pozici. Na povel psovoda jej pes zepředu obloukem obejde, otočí se zvenku dovnitř a přiřadí se k druhé noze psovoda, kde usedá. Strana vedení je změněna.',
      ],
    },
  },
  cards: [
    {
      code: '1-116',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      exerciseType: 'A',
      name: 'Stůj – 1 krok vpřed – stůj',
      description: [
        'Tým zastaví v místě pro provedení cviku a pes zaujme pozici stůj u nohy psovoda. Tým provede společně posun o jeden krok vpřed, zastaví se a pes zůstává stát.',
      ],
      // VDH 2027, S. 43: "Das Team hält im Arbeitsbereich an und der Hund stellt sich in
      // Fußposition. Dann gehen Hund und HF zusammen in Fußposition 1 Schritt nach vorne, halten
      // an und der Hund bleibt stehen." No rule on what comes before or after.
      sequencing: {},
      // One step forward, as Z-024 (and each step of 2-227).
      geometry: { exit: 0.5 },
      image: '1-116',
      sourcePage: 43,
    },
    {
      code: '1-126',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      exerciseType: 'B',
      name: 'Okolo kuželu – výměna strany za psovodem',
      description: [
        'Dva kužely jsou postaveny za sebou ve směru postupu s rozestupem 1,5 m. Karta je umístěna u prvního kuželu. Tým míjí kartu a první kužel po své pravé straně, projde středem mezi oběma kužely a obejde druhý kužel. Při druhém průchodu středem mezi kužely provede pes za pohybu výměnu strany za psovodem. Strana vedení je změněna. Tým odchází k další kartě kolem prvního kuželu, který má nyní po své pravé straně. Tým zůstává v pohybu.',
      ],
      sequencing: {
        // VDH 2027, S. 45: "Beim zweiten Kreuzen der Mittellinie beginnt der Hund aus der
        // Bewegung heraus einen Seitenwechsel hinter dem HF. Die Fußseite wird dabei gewechselt."
        sideChange: true,
        // S. 45: "Zwei Pylonen werden in einem Abstand von 1,50 m in Laufrichtung aufgestellt."
        equipment: ['cones'],
      },
      // Read off its animation (`roundTwoCones`), after the card's diagram (VDH Schilder, 1-126):
      // in left of the first cone, right through the gap — on the circle round the second cone,
      // 1.05 m from it, so 0.45 m from the first (the dog clear of the second) — anticlockwise
      // round the second cone (a left turn, the dog inside), right through the gap again (the
      // second crossing, where the dog starts to change sides behind) and at once down round the
      // first cone in a 0.75 m bend ("kolem prvního kuželu", 1.05 m off it), the dog coming up
      // on the right between the handler and it. Net: turned
      // about to the left. The card just before the first cone ("an der ersten Pylone"), on the
      // cones' line like Z-018's.
      geometry: {
        via: [
          [1.95, -0.65],
          [3.0, -1.7],
          [4.05, -0.65],
          [3.0, 0.4],
          [1.95, -0.65],
          [1.95, -0.95],
          [1.2, -1.7],
          [0.5, -1.7],
        ],
        turn: -180,
        exit: 0.5,
        exitSide: -1.7,
        card: { ahead: 0.5, side: -0.65 },
        props: [
          { kind: 'cone', ahead: 1.5, side: -0.65 },
          { kind: 'cone', ahead: 3.0, side: -0.65 },
        ],
      },
      image: '1-126',
      sourcePage: 45,
    },
    {
      code: '1-127',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      // §3.6 (S. 10): "Bei Richtungsänderungen … liegt der Arbeitsbereich vor dem Schild."
      placement: 'B',
      exerciseType: 'A',
      name: 'Obrat vpravo o 90° – 2 kroky – lehni',
      description: [
        'Psovod v místě pro provedení cviku za chůze natočí nohy o 90° vpravo (jedním pohybem nohou, nohy se dotýkají). Poté udělá druhou nohou krok v novém směru, připojí další krok a zastaví se. Pes zůstává v pozici u nohy, a jakmile psovod zastaví, lehá si vedle něj.',
      ],
      // VDH 2027, S. 45: "Der HF setzt im Arbeitsbereich mit den Füßen einen 90° Winkel nach rechts
      // (nur eine Fußbewegung, die Füße berühren sich). Danach macht er mit dem anderen Fuß einen
      // Schritt in die neue Richtung, schließt einen weiteren Schritt an und bleibt stehen. Der
      // Hund bleibt in der Fußposition und legt sich ins Platz neben den HF, wenn dieser anhält."
      // From walking: no Halt on the card and no "aus dem Stand" (cf. 1-103). Ends static.
      sequencing: {},
      // As 2-201 (turn, one step: exitSide −0.6), one step (0.4 m) further.
      geometry: { turn: 90, exit: 0.5, exitSide: -1 },
      image: '1-127',
      sourcePage: 45,
    },
    {
      code: '1-128',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      placement: 'B',
      exerciseType: 'A',
      name: 'Obrat vlevo o 90° – 2 kroky – lehni',
      description: [
        'Psovod v místě pro provedení cviku za chůze natočí nohy o 90° vlevo (jedním pohybem nohou, nohy se dotýkají). Poté udělá druhou nohou krok v novém směru, připojí další krok a zastaví se. Pes zůstává v pozici u nohy, a jakmile psovod zastaví, lehá si vedle něj.',
      ],
      // VDH 2027, S. 45: as 1-127, "nach links".
      sequencing: {},
      // As 2-202, one step further.
      geometry: { turn: -90, exit: 0.5, exitSide: 1 },
      image: '1-128',
      sourcePage: 45,
    },
    {
      code: '1-129',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      placement: 'B',
      exerciseType: 'A',
      name: 'Obrat vpravo o 90° – 2 kroky – stůj',
      description: [
        'Psovod v místě pro provedení cviku za chůze natočí nohy o 90° vpravo (jedním pohybem nohou, nohy se dotýkají). Poté udělá druhou nohou krok v novém směru, připojí další krok a zastaví se. Pes zůstává v pozici u nohy, a jakmile psovod zastaví, zaujme vedle něj pozici stůj.',
      ],
      // VDH 2027, S. 45: as 1-127, ending "Der Hund bleibt in der Fußposition und stellt sich
      // neben den HF, wenn dieser anhält."
      sequencing: {},
      geometry: { turn: 90, exit: 0.5, exitSide: -1 },
      image: '1-129',
      sourcePage: 45,
    },
    {
      code: '1-130',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      placement: 'B',
      exerciseType: 'A',
      name: 'Obrat vlevo o 90° – 2 kroky – stůj',
      description: [
        'Psovod v místě pro provedení cviku za chůze natočí nohy o 90° vlevo (jedním pohybem nohou, nohy se dotýkají). Poté udělá druhou nohou krok v novém směru, připojí další krok a zastaví se. Pes zůstává v pozici u nohy, a jakmile psovod zastaví, zaujme vedle něj pozici stůj.',
      ],
      // VDH 2027, S. 45: as 1-129, "nach links".
      sequencing: {},
      geometry: { turn: -90, exit: 0.5, exitSide: 1 },
      image: '1-130',
      sourcePage: 45,
    },
  ],
  pages: {
    '1-101': 39,
    '1-102': 39,
    '1-103': 39,
    '1-104': 39,
    '1-105': 39,
    '1-106': 40,
    '1-107': 40,
    '1-108': 40,
    '1-109': 41,
    '1-110': 41,
    '1-111': 41,
    '1-112': 41,
    '1-113': 42,
    '1-114': 42,
    '1-115': 42,
    '1-116': 43,
    '1-117': 43,
    '1-118': 43,
    '1-119': 43,
    '1-120': 44,
    '1-121': 44,
    '1-122': 44,
    '1-123': 44,
    '1-124': 44,
    '1-125': 44,
    '1-126': 45,
    '1-127': 45,
    '1-128': 45,
    '1-129': 45,
    '1-130': 45,
  },
}
