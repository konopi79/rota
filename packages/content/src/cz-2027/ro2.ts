import type { ClassContent2027 } from './types'

/**
 * What VDH 2027 changes in RO2 (2-201…2-234), plan R22. The German text rules where the Czech
 * 2026 one differed. Red-framed in 2027 (Anhang 1, S. 25–26): 2-230, 2-231 and the new 2-233,
 * 2-234. The other changes come from the descriptions: the 90° turn's footwork (S. 17), the 180°
 * turn "auf einem DIN A 4 Blatt" (S. 18), D0a–e, one step back before a front position, the
 * jump card at least 2 m before the jump, and the follow-up lists of 2-211 and 2-212. Unchanged:
 * 2-207, 2-209, 2-210, 2-213, 2-215, 2-216, 2-219, 2-227, 2-228, 2-229, 2-232 (diff:
 * `.cache/vdh2027/diff/ro2.md`). Geometry kept from 2026 unless the 2027 text requires a change.
 */
export const RO2_2027: ClassContent2027 = {
  changes: {
    '2-201': {
      // VDH 2027, S. 46: "Der HF setzt mit den Füßen einen 90° Winkel nach rechts (aus dem Stand
      // nur eine Fußbewegung, die Füße berühren sich) danach macht er mit dem anderen Fuß einen
      // Schritt in diese Richtung und hält an." Geometry (turn, one step on) unchanged.
      description: [
        'Tým zastaví před kartou a zaujme základní pozici. Psovod natočí nohy o 90° vpravo (jedním pohybem nohou, nohy se dotýkají), poté udělá druhou nohou krok v novém směru a zastaví se. Pes zůstává v pozici u nohy. Na konci cviku tým zůstává v základní pozici.',
      ],
    },
    '2-202': {
      // VDH 2027, S. 46: as 2-201, "einen 90° Winkel nach links".
      description: [
        'Tým zastaví před kartou a zaujme základní pozici. Psovod natočí nohy o 90° vlevo (jedním pohybem nohou, nohy se dotýkají), poté udělá druhou nohou krok v novém směru a zastaví se. Pes zůstává v pozici u nohy. Na konci cviku tým zůstává v základní pozici.',
      ],
    },
    '2-203': {
      // VDH 2027, S. 46: "dreht sich auf der Stelle um 180° nach rechts"; S. 18 (180° Drehung):
      // "auf einem DIN A 4 Blatt" — the 2026 "(max. 4 kroky nohou)" is gone.
      description: [
        'Tým se zastaví před kartou a zaujme základní pozici. Následně tým provede na místě (na ploše listu A4) obrat o 180° vpravo a poté zaujímá opět základní pozici.',
      ],
    },
    '2-204': {
      // VDH 2027, S. 46: "auf der Stelle um 180° nach links"; S. 18: "auf einem DIN A 4 Blatt".
      description: [
        'Tým se zastaví před kartou a zaujme základní pozici. Následně tým provede na místě (na ploše listu A4) obrat o 180° vlevo a poté zaujímá opět základní pozici.',
      ],
    },
    '2-205': {
      // VDH 2027, S. 46: "auf der Stelle um 180° nach rechts"; S. 18: "auf einem DIN A 4 Blatt".
      description: [
        'Tým se zastaví před kartou a zaujme základní pozici. Tým provede na místě (na ploše listu A4) obrat o 180° vpravo a pokračuje v chůzi bez zastavení k dalšímu cviku.',
      ],
    },
    '2-206': {
      // VDH 2027, S. 47: "auf der Stelle um 180° nach links"; S. 18: "auf einem DIN A 4 Blatt".
      description: [
        'Tým se zastaví před kartou a zaujme základní pozici. Tým provede na místě (na ploše listu A4) obrat o 180° vlevo a pokračuje v chůzi bez zastavení k dalšímu cviku.',
      ],
    },
    '2-208': {
      // VDH 2027, S. 47: "fordert den Hund in der Bewegung zum Umrunden des HF auf. Das Team
      // bleibt in Bewegung." — no direction: the 2026 "zepředu" is dropped (going round from
      // the front, as animated, is still one way of doing it).
      description: [
        'Psovod zahájí cvik v místě pro vykonání cviku tím, že velí psovi, aby jej za pohybu oběhl. Tým zůstává v pohybu.',
      ],
    },
    '2-211': {
      description: [
        'Tým se zastaví v místě pro provedení cviku a zaujímá základní pozici. Psovod odkládá psa do pozice sedni a odchází směrem k další kartě.',
        'Další cvik v parkuru musí být vybrán z těchto karet: 2–213, 2–215, 2–216 a 2–214 s D0a–e. Pro třídu RO3 je možné použít i tyto karty: 3–320, 3–321, 3–322 a 3–308, 3–309, 3–319 s D0a–e.',
      ],
      sequencing: {
        // VDH 2027, S. 48: "In Kombination mit den Schildern 213, 215, 216, sowie 214 mit Z a-e.
        // Ab Klasse 3 zusätzlich 320, 321, 322 sowie 308, 309 und 319 jeweils mit Z a-e" —
        // 3-308 and 3-309 are new in the list.
        nextOneOf: [
          '2-213',
          '2-215',
          '2-216',
          '2-214',
          '3-320',
          '3-321',
          '3-322',
          '3-308',
          '3-309',
          '3-319',
        ],
      },
    },
    '2-212': {
      // VDH 2027, S. 48: "Die Füße des HF stehen parallel, ein schulterbreiter Stand ist
      // erlaubt. Der Hund legt sich an die Seite des HF, ohne vorher eine andere Position
      // eingenommen zu haben." The next sentence, "Dabei darf der HF seine Position verändern",
      // is left out: read literally it lets the handler move while the dog lies down, against
      // the feet standing parallel just before it — most likely a "nicht" is missing.
      description: [
        'Psovod se zastaví v místě pro provedení cviku a rovnou velí psa do pozice lehni. Nohy psovoda stojí rovnoběžně, postoj na šířku ramen je povolen. Pes se nesmí posadit ani zůstat stát. Psovod odchází k dalšímu cviku, zatímco pes setrvává odložen.',
        'Další cvik v parkuru musí být vybrán z těchto karet: 2–213, 2–215, 2–216 a 2–214 s D0a–e. Pro třídu RO3 je možné použít i tyto karty: 3–320, 3–321 a 3–308, 3–319 s D0a–e.',
      ],
      sequencing: {
        // VDH 2027, S. 48: "In Kombination mit den Schildern 213, 215, 216, sowie 214 mit Z a-e.
        // Ab Klasse 3 zusätzlich 320, 321 sowie 308 und 319 jeweils mit Z a-e" — 3-321 new,
        // 3-302 gone (in 2027 it is "Hund über 2 Hürden", S. 55).
        nextOneOf: ['2-213', '2-215', '2-216', '2-214', '3-320', '3-321', '3-308', '3-319'],
      },
    },
    '2-214': {
      // VDH 2027, S. 48: "Dieser Übung muss ein Zusatzschild aus den Nr. a-e angeschlossen
      // werden"; the feet still "bei der Ausführung des Zusatzschildes (Za-d)" — in D0e the
      // handler walks. `sequencing` (D0, only after a leave card) unchanged.
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'Před kartou se psovod otočí čelem ke psovi. Poté jej přivolá do předsednutí. Během předsednutí a při provádění cviku z doplňkové karty D0a–d nesmí psovod pohybovat nohama.',
      ],
    },
    '2-217': {
      // VDH 2027, S. 49: "Das Übungsschild kann sich beliebig links oder rechts am Laufweg des
      // HF befinden, mind. 2 m vor der Hürde." (2026: 5 m). The geometry keeps the jump 5 m
      // ahead — still "mind. 2 m", and the animation it was read off is built on it.
      description: [
        'Skok se provádí přes laťkovou překážku. Karta cviku může být na libovolné straně postupu psovoda, minimálně však 2 metry před překážkou. Cvik začíná v místě pro provedení cviku, kdy tým chůzí u nohy pokračuje směrem k překážce. Ústní a/nebo posunkový povel k překonání překážky může psovod dát i za místem pro vykonání cviku. Psovod vysílá psa na překážku a dává povel k jejímu překonání, zatímco on překážku míjí. Jakmile pes překoná překážku, psovod velí psa k noze a pokračují společně k dalšímu cviku. Pokud je pes při překonávání rychlejší než psovod, může být psovodem přivolán zpět k noze a pokračují společně k dalšímu cviku. Následné karty jsou umístěny ve vzdálenosti minimálně 5 metrů od překážky',
      ],
    },
    '2-218': {
      // VDH 2027, S. 49: "befindet sich mind. 2 m vor der Hürde" (2026: 5 m); "215, 216 und 214
      // mit Z a- e / Ab Klasse 3 zusätzlich 319 + Z a-e"; "Die nachfolg. Schilder stehen mind.
      // 5m vom Sprung entfernt." `sequencing` (the same follow-ups, after a static exercise,
      // jump) and geometry (jump 5 m ahead, the recall card 5 m past it) unchanged.
      description: [
        'Tato karta musí být použita v kombinaci se statickým cvikem (typ A) a musí být umístěna minimálně 2 metry před překážkou. Psovod odkládá psa (v původní pozici z poslední karty) a odchází podél překážky k další kartě. Způsob přivolání přes překážku určují karty: 2–215, 2–216 a 2–214 s D0a–e. Pro třídu RO 3 je možné použít i kartu 3–319 s D0a–e. Následné karty jsou umístěny ve vzdálenosti minimálně 5 metrů od překážky.',
      ],
    },
    '2-220': {
      // VDH 2027, S. 50: "Die zwei mittleren Pylonen werden durch Schalen mit Futter und/oder
      // Spielzeug ersetzt. Das Futter muss gut zu riechen sein, gleichzeitig müssen Futter und
      // Spielzeug jedoch so abgesichert werden, dass Hunde, die bei dieser Übung die Fußposition
      // verlassen, daran gehindert werden, sich selbst zu belohnen." (2026: one bowl food, the
      // other toys). The 2026 scoring sentence ("-10 bodů", no repeat) is not in the 2027
      // description — scoring is Anhang 4. Geometry unchanged.
      description: [
        'Dva kužely a dvě misky jsou rozestavěny v řadě za sebou s rozestupem 1,5 m od sebe tak, že misky jsou v řadě umístěny mezi kužely. V miskách se nachází dobře vonící pamlsky a/nebo hračky, misky musí být zakryté tak, aby se pes, který opustí pozici u nohy, nemohl sám odměnit. Karta je umístěna před prvním kuželem, viditelná ze směru příchodu týmu. Tým vstupuje do slalomu vždy zprava (tj. první kužel po levé straně psa). A překoná jej ve směru tam i zpět. Směr postupu ze slalomu závisí na poloze další karty.',
      ],
    },
    '2-221': {
      // VDH 2027, S. 50: "Während der Hund sich bewegt, um sich vor den HF zu stellen, darf der
      // HF einen Schritt rückwärtsgehen." (2026: up to four); "zwingend ein Zusatzschild aus den
      // Schildern a-e"; feet "(a-d)". `sequencing`, geometry unchanged.
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'V místě pro provedení cviku dává psovod psovi povel pro pozici stůj před psovodem. Během pohybu psa (než zaujme pozici stůj) může psovod udělat jeden krok vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Poté co pes zaujme pozici před psovodem, provede psovod jeden krok vzad, pes jej následuje a zaujímá pozici stůj před psovodem. Následně psovod provede dva kroky vzad, pes jej následuje a zaujímá pozici stůj před psovodem. Dále psovod provede tři kroky vzad, pes jej následuje a zaujímá pozici stůj před psovodem. Během zaujímání pozic před psovodem a provádění cviku z doplňkové karty D0a–d nesmí psovod pohybovat nohama.',
      ],
    },
    '2-222': {
      // VDH 2027, S. 51: "Dabei darf der HF einen Schritt rückwärtsgehen." (2026: up to four);
      // "zwingend ein Zusatzschild aus den Schildern a-e"; feet "(a-d)". The 2026 "Po splnění
      // cviku na doplňkové kartě tým míjí kartu po své pravé straně" has no German counterpart
      // and is dropped; the geometry (off a little to the left) stays one valid way.
      description: [
        'K tomuto cviku je třeba přidat doplňkovou kartu D0a–e.',
        'V místě pro vykonání cviku dává psovod psovi povel k předsednutí. Během pohybu psa (než si předsedne) může psovod udělat jeden krok vzad v přímém směru, ale přitom nesmí korigovat úkrokem do strany pozici psa. Jakmile pes zaujme pozici před psovodem, psovod udělá znatelný úkrok doleva (ne diagonálně), přičemž pes jej následuje a končí v předsednutí před psovodem. Následně psovod provede znatelný úkrok doprava (ne diagonálně), přičemž jej pes opět následuje a končí v předsednutí před psovodem. Během předsednutí a provádění cviku z doplňkové karty D0a–d nesmí psovod pohybovat nohama.',
      ],
    },
    '2-223': {
      // VDH 2027, S. 51: "Der HF setzt mit den Füßen mit dem ersten Schritt einen 90° Winkel nach
      // rechts. Der Hund bleibt in der Fußposition. Mit dem zweiten Schritt schließt der HF die
      // Füße und der Hund stellt sich in Fußposition." Geometry unchanged.
      description: [
        'Tým zastaví před kartou, pes je v pozici stůj vedle nohy psovoda. Psovod prvním krokem natočí nohy o 90° vpravo (nohy se dotýkají), pes zůstává v pozici u nohy. Druhým krokem psovod přisune nohy k sobě. Na konci cviku pes zůstává opět v pozici stůj.',
      ],
    },
    '2-224': {
      // VDH 2027, S. 51: as 2-223, "einen 90° Winkel nach links".
      description: [
        'Tým zastaví před kartou, pes je v pozici stůj vedle nohy psovoda. Psovod prvním krokem natočí nohy o 90° vlevo (nohy se dotýkají), pes zůstává v pozici u nohy. Druhým krokem psovod přisune nohy k sobě. Na konci cviku pes zůstává opět v pozici stůj.',
      ],
    },
    '2-225': {
      // VDH 2027, S. 51: "auf der Stelle um 180° nach rechts"; S. 18: "auf einem DIN A 4 Blatt".
      description: [
        'Tým zastaví před kartou, pes je v pozici stůj vedle nohy psovoda. Tým provede na místě (na ploše listu A4) obrat o 180° vpravo a pokračuje v chůzi bez zastavení k dalšímu cviku.',
      ],
    },
    '2-226': {
      // VDH 2027, S. 52: "auf der Stelle um 180° nach links"; S. 18: "auf einem DIN A 4 Blatt".
      description: [
        'Tým zastaví před kartou, pes je v pozici stůj vedle nohy psovoda. Tým provede na místě (na ploše listu A4) obrat o 180° vlevo a pokračuje v chůzi bez zastavení k dalšímu cviku.',
      ],
    },
    '2-230': {
      // VDH 2027, S. 53 (red frame): "Der Hund bleibt sitzen, während der Hundeführer einen
      // Schritt vorwärts geht, stehen bleibt und einen 90°- Winkel nach rechts macht, wieder
      // einen Schritt in die neue Richtung geht und wieder stehen bleibt. Danach wird der Hund
      // gerufen … (kein Wechsel der Fußseite). Der Schritt nach rechts kann entweder direkt
      // gemacht werden oder der Hundeführer kann sich auf der Stelle drehen und dann den Schritt
      // machen." New: the step forward before the turn.
      name: 'Stop – krok vpřed – obrat vpravo o 90° – krok – přivolání – stop',
      description: [
        'Tým se zastaví před kartou a zaujme základní pozici. Pes zůstává sedět, zatímco psovod udělá jeden krok vpřed, zastaví se, natočí nohy o 90° vpravo, udělá jeden krok v novém směru a opět se zastaví. Krok vpravo může psovod udělat přímo, nebo se nejprve otočit na místě a krok udělat poté. Poté je pes přivolán do základní pozice u nohy psovoda (beze změny strany vedení).',
      ],
      // By hand: the 2026 geometry (read off the animation: exit 0.5, 0.6 right) one step of
      // the animations' 0.4 m further ahead — the step forward taken before the turn.
      geometry: { turn: 90, exit: 0.9, exitSide: -0.6 },
    },
    '2-231': {
      // VDH 2027, S. 53 (red frame): as 2-230, "einen 90°- Winkel nach links".
      name: 'Stop – krok vpřed – obrat vlevo o 90° – krok – přivolání – stop',
      description: [
        'Tým se zastaví před kartou a zaujme základní pozici. Pes zůstává sedět, zatímco psovod udělá jeden krok vpřed, zastaví se, natočí nohy o 90° vlevo, udělá jeden krok v novém směru a opět se zastaví. Krok vlevo může psovod udělat přímo, nebo se nejprve otočit na místě a krok udělat poté. Poté je pes přivolán do základní pozice u nohy psovoda (beze změny strany vedení).',
      ],
      // By hand: the 2026 geometry (exit 0.7, 0.6 left) one 0.4 m step further ahead.
      geometry: { turn: -90, exit: 1.1, exitSide: 0.6 },
    },
  },
  cards: [
    {
      code: '2-233',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      // VDH 2027, S. 53: "Typ B" — "begibt sich das Team, ohne dass der Hund sich vorher setzt,
      // zur nächsten Station". No `placement`: done where a stop is (§3.6, S. 11, Arbeitsbereich
      // A) — the simplest layout the text allows, the cone straight ahead.
      exerciseType: 'B',
      name: 'Vyslání k oběhnutí kužele – zpět k noze',
      description: [
        'Kužel je umístěn 1–2 m od místa pro provedení cviku, buď přímo ve směru postupu, nebo stranou vpravo či vlevo pod úhlem až 90°. Tým se v místě pro provedení cviku natočí ke kuželu a zastaví se, pes zaujme pozici stůj u nohy. Psovod vysílá psa oběhnout kužel. Pes obíhá kužel po směru hodinových ručiček (při vedení u levé nohy), nebo proti směru hodinových ručiček (při vedení u pravé nohy), a bez zastavení se přímou cestou vrací ke psovodovi. Za psovodem přejde zpět do původní pozice u nohy. Jakmile pes dosáhne pozice u nohy, odchází tým k dalšímu cviku, aniž by si pes předem sedl.',
      ],
      sequencing: {
        // VDH 2027, S. 53: "Die Pylone wird gerade im Laufweg oder bis zu 90° rechts oder links
        // seitlich versetzt 1 - 2 m vom Arbeitsbereich entfernt positioniert." No side change:
        // "Er geht hinter dem HF wieder in die vorherige Fußposition."
        equipment: ['cones'],
      },
      // The simplest layout "gerade im Laufweg", the cone straight ahead. The dog's way kept clear
      // as the team's (`via`): up the left of the cone, round it clockwise, straight back to the
      // handler's right, behind the handler into heel, the team then on past the cone.
      // Read off its animation: the handler stops 0.3 m left in the square (the dog comes back
      // between them and the card), the cone 2 m straight ahead of them, and the team on past it
      // in a bend 1 m to the left.
      geometry: {
        props: [{ kind: 'cone', ahead: 2, side: 0.3 }],
        via: [
          [2, 0.9],
          [2.6, 0.3],
          [2, -0.3],
          [0, -0.2],
          [-0.4, 0.3],
          [0, 0.7],
          [1.5, 1.3],
        ],
        exit: 1.7,
        exitSide: 1.3,
      },
      image: '2-233',
      sourcePage: 53,
    },
    {
      code: '2-234',
      ruleset: 'CZ-2027',
      kind: 'exercise',
      // VDH 2027, S. 11 (§3.6): "Auch bei einem Schritt seitwärts nach rechts oder links muss
      // die Übung direkt vor dem Schild eingeleitet werden." (as 1-102).
      placement: 'B',
      // VDH 2027, S. 54: "Typ B … Das Team bleibt in Bewegung."
      exerciseType: 'B',
      name: 'Za pohybu – úkrok vlevo',
      description: [
        'Za stálého pohybu udělá psovod před kartou úkrok stranou doleva, pes se pohybuje současně a rovnoběžně s ním. Následně bez zastavení tým míjí kartu po své pravé straně. Cvik platí jako změna směru a musí být proveden před kartou.',
      ],
      // VDH 2027, S. 54: "Vor dem Schild macht der HF in der Bewegung einen Schritt nach links
      // und der Hund folgt ihm gleichzeitig in einer Linie. Anschließend geht das Team links am
      // Schild vorbei." No sequencing rule.
      sequencing: {},
      // By hand: the mirror of 1-102 (right, -0.85), the size of 2-229's left side step (0.55,
      // read off its animation — a step towards the dog is shorter).
      geometry: { exitSide: 0.55 },
      image: '2-234',
      sourcePage: 54,
    },
  ],
  pages: {
    '2-201': 46,
    '2-202': 46,
    '2-203': 46,
    '2-204': 46,
    '2-205': 46,
    '2-206': 47,
    '2-207': 47,
    '2-208': 47,
    '2-209': 47,
    '2-210': 47,
    '2-211': 48,
    '2-212': 48,
    '2-213': 48,
    '2-214': 48,
    '2-215': 49,
    '2-216': 49,
    '2-217': 49,
    '2-218': 49,
    '2-219': 50,
    '2-220': 50,
    '2-221': 50,
    '2-222': 51,
    '2-223': 51,
    '2-224': 51,
    '2-225': 51,
    '2-226': 52,
    '2-227': 52,
    '2-228': 52,
    '2-229': 52,
    '2-230': 53,
    '2-231': 53,
    '2-232': 53,
    '2-233': 53,
    '2-234': 54,
  },
}
