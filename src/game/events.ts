// Ereignisse: Rohrbruch, Mietnomaden & Co.
import type { ActiveEvent, Feature, GameState, NpcId, Property, RegionId, Tenant, Tier, Unit } from './types';
import { addMessage, chance, clamp, fmt, pick, propertyValue, round, tenantRent, unlockedRegions } from './econ';
import { regionById } from './data';
import { addXp, track } from './gamify';
import { defectDef } from './interior';

export interface EventCtx {
  s: GameState;
  ev: ActiveEvent;
  p?: Property;
  u?: Unit;
  t?: Tenant;
}

export interface EventOption {
  label: string;
  detail?: string;
  cost: number;
  disabled?: boolean;
  run: (c: EventCtx) => string;
}

export interface EventDef {
  id: string;
  title: string;
  npc: NpcId;
  icon: string;
  minLevel: number;
  weight: number;
  scope: 'property' | 'tenant' | 'building' | 'global' | 'triggered';
  regions?: RegionId[];
  months?: number[];
  deadline: number;
  init?: (c: EventCtx) => Record<string, number>;
  can?: (c: EventCtx) => boolean;
  text: (c: EventCtx) => string;
  options: (c: EventCtx) => EventOption[];
  expire: (c: EventCtx) => string;
}

const lower = (p: Property, f: Feature, by = 1) => {
  p.tiers[f] = Math.max(0, p.tiers[f] - by) as Tier;
};
const atLeast = (p: Property, f: Feature, t: Tier) => {
  if (p.tiers[f] < t) p.tiers[f] = t;
};
const legal = (s: GameState, cost: number) => (s.insurance.rechtsschutz ? round(cost / 2, 50) : cost);
const tenantsOf = (p?: Property) => (p ? p.units.map((u) => u.tenant).filter((t): t is Tenant => !!t) : []);
const upsetAll = (p: Property | undefined, by: number) => tenantsOf(p).forEach((t) => (t.satisfaction = clamp(t.satisfaction - by, 0, 100)));
const pleaseAll = (p: Property | undefined, by: number) => tenantsOf(p).forEach((t) => (t.satisfaction = clamp(t.satisfaction + by, 0, 100)));

function damage(c: EventCtx, amount: number, insurable = true) {
  if (insurable && c.s.insurance.gebaeude) {
    const self = round(amount * 0.1, 50);
    c.s.cash -= self;
    return `Die Gebäudeversicherung übernimmt den Großteil. Selbstbeteiligung: ${fmt(self)}.`;
  }
  c.s.cash -= amount;
  return `Schaden: ${fmt(amount)}.`;
}

export const EVENTS: EventDef[] = [
  {
    id: 'rohrbruch',
    title: 'Rohrbruch!',
    npc: 'bruno',
    icon: '💧',
    minLevel: 1,
    weight: 4,
    scope: 'property',
    deadline: 1,
    init: (c) => ({ cost: round(clamp(c.p!.size * 25, 1500, 25000)) }),
    text: (c) => `In „${c.p!.name}“ ist ein Wasserrohr geplatzt. Das Wasser steht schon knöcheltief im Flur – jede Stunde wird der Schaden größer.`,
    options: (c) => {
      const cost = c.ev.data.cost;
      const opts: EventOption[] = [
        { label: 'Notdienst sofort rufen', detail: 'Teuer, aber sicher', cost, run: (x) => { pleaseAll(x.p, 5); return 'Der Notdienst hat das Leck in einer Stunde gestoppt. Alles trocken!'; } },
        {
          label: 'Bruno anrufen',
          detail: 'Günstiger, aber er kommt erst morgen',
          cost: round(cost * 0.45),
          run: (x) => {
            if (chance(0.3)) {
              const extra = round(cost * 0.4);
              x.s.cash -= extra;
              upsetAll(x.p, 10);
              return `Bruno kam erst spät – der Boden ist hin. Zusatzkosten: ${fmt(extra)}.`;
            }
            return 'Bruno hat ganze Arbeit geleistet. „Für dich immer, Chef!“';
          },
        },
      ];
      if (c.s.insurance.gebaeude)
        opts.push({ label: 'Versicherung melden', detail: 'Selbstbeteiligung 10 %', cost: round(cost * 0.1), run: () => 'Die Versicherung schickt einen Gutachter und zahlt den Rest.' });
      return opts;
    },
    expire: (c) => {
      lower(c.p!, 'bad');
      upsetAll(c.p, 25);
      tenantsOf(c.p).forEach((t) => { t.minderung = 0.2; t.minderungMonths = 2; });
      return `Niemand kam – der Wasserschaden hat das Bad ruiniert. ${damage(c, round(c.ev.data.cost * 0.6))} Deine Mieter mindern die Miete.`;
    },
  },
  {
    id: 'heizung',
    title: 'Heizung ausgefallen',
    npc: 'mieter',
    icon: '🥶',
    minLevel: 2,
    weight: 3,
    scope: 'tenant',
    months: [9, 10, 11, 0, 1, 2],
    deadline: 1,
    text: (c) => `${c.t!.name} friert: In „${c.p!.name}“ ist mitten in der kalten Jahreszeit die Heizung ausgefallen.`,
    options: (c) => [
      { label: 'Reparieren lassen', cost: round(1200 * (c.p!.size / 80) ** 0.5), run: (x) => { x.t!.satisfaction += 5; return 'Die Heizung läuft wieder. Puh!'; } },
      {
        label: 'Neue Heizung einbauen',
        detail: 'Elektrik & Heizung wird mindestens Standard',
        cost: round(6000 * (c.p!.size / 100) ** 0.7),
        run: (x) => { atLeast(x.p!, 'elektrik', 2); pleaseAll(x.p, 15); return 'Moderne Wärmepumpe eingebaut – die Mieter sind begeistert, das Objekt ist mehr wert.'; },
      },
    ],
    expire: (c) => {
      c.t!.satisfaction -= 20;
      c.t!.minderung = 0.25;
      c.t!.minderungMonths = 2;
      return `${c.t!.name} mindert die Miete um 25 % für zwei Monate.`;
    },
  },
  {
    id: 'schimmel',
    title: 'Schimmel entdeckt',
    npc: 'mieter',
    icon: '🍄',
    minLevel: 2,
    weight: 2,
    scope: 'tenant',
    deadline: 2,
    text: (c) => `${c.t!.name} meldet Schimmel im Schlafzimmer von „${c.p!.name}“. Liegt es am Lüften oder an der Bausubstanz?`,
    options: (c) => [
      {
        label: 'Gutachter beauftragen',
        detail: 'Findet die Ursache',
        cost: 400,
        run: (x) => {
          if (chance(0.5)) { x.t!.satisfaction -= 5; return 'Ergebnis: falsches Lüften. Du gibst Lüftungstipps – Problem gelöst.'; }
          const c2 = round(x.p!.units[x.ev.unitIndex ?? 0].size * 40);
          x.s.cash -= c2;
          return `Ergebnis: undichte Außenwand. Sanierung kostet ${fmt(c2)}.`;
        },
      },
      { label: 'Direkt sanieren', cost: round(c.u!.size * 40), run: (x) => { x.t!.satisfaction += 5; return 'Wand saniert, Schimmel weg.'; } },
    ],
    expire: (c) => {
      c.t!.noticeMonths = 2;
      lower(c.p!, 'boden');
      return `${c.t!.name} hat genug und kündigt. Die Wände müssen später ohnehin saniert werden.`;
    },
  },
  {
    id: 'marder',
    title: 'Marder im Dach',
    npc: 'hilde',
    icon: '🦡',
    minLevel: 1,
    weight: 3,
    scope: 'property',
    regions: ['kleeweiler'],
    deadline: 2,
    text: (c) => `Nachts poltert es im Dach von „${c.p!.name}“. Ein Marder hat sich eingenistet und knabbert an der Dämmung. Oma Hilde: „Die Biester sind schlau!“`,
    options: () => [
      { label: 'Marderschreck aufstellen', cost: 350, run: (x) => (chance(0.7) ? 'Der Marder ist ausgezogen.' : (x.s.cash -= 900, 'Der Marder war schlauer – Dämmung kaputt: 900 €.')) },
      { label: 'Dach prüfen und abdichten', cost: 1800, run: (x) => { atLeast(x.p!, 'fassade', 1); return 'Dach abgedichtet – da kommt keiner mehr rein.'; } },
    ],
    expire: (c) => `Der Marder hat die Dämmung zerlegt. ${damage(c, 900, false)}`,
  },
  {
    id: 'brunnen',
    title: 'Brunnen versiegt',
    npc: 'hilde',
    icon: '🪣',
    minLevel: 2,
    weight: 1,
    scope: 'tenant',
    regions: ['kleeweiler'],
    deadline: 1,
    text: (c) => `Der alte Hausbrunnen von „${c.p!.name}“ gibt kein Wasser mehr. ${c.t!.name} sitzt auf dem Trockenen.`,
    options: () => [
      { label: 'Ans Wassernetz anschließen', detail: 'Einmalig, dafür für immer Ruhe', cost: 4000, run: (x) => { pleaseAll(x.p, 10); return 'Das Haus hängt jetzt am Netz.'; } },
      { label: 'Tankwagen bestellen', cost: 600, run: (x) => { x.t!.satisfaction -= 5; return 'Notlösung – fürs Erste reicht es.'; } },
    ],
    expire: (c) => { c.t!.noticeMonths = 1; return `${c.t!.name} zieht aus. Ohne Wasser geht es nicht.`; },
  },
  {
    id: 'hochwasser',
    title: 'Hochwasser-Warnung',
    npc: 'system',
    icon: '🌊',
    minLevel: 2,
    weight: 2,
    scope: 'property',
    regions: ['muehlental'],
    deadline: 1,
    init: (c) => ({ cost: round(c.p!.size * 120) }),
    text: (c) => `Der Fluss steigt! „${c.p!.name}“ liegt im Überschwemmungsgebiet. Möglicher Schaden: ${fmt(c.ev.data.cost)}.`,
    options: (c) => [
      { label: 'Sandsäcke und Pumpen', cost: 800, run: (x) => (chance(0.7) ? 'Die Sandsäcke haben gehalten!' : `Das Wasser kam trotzdem. ${damage(x, round(c.ev.data.cost * 0.5))}`) },
      { label: 'Abwarten', cost: 0, run: (x) => (chance(0.5) ? 'Glück gehabt – der Pegel sank rechtzeitig.' : `Der Keller ist voll. ${damage(x, c.ev.data.cost)}`) },
    ],
    expire: (c) => `Der Keller ist voll. ${damage(c, c.ev.data.cost)}`,
  },
  {
    id: 'denkmal',
    title: 'Denkmalschutz-Auflage',
    npc: 'system',
    icon: '🏛️',
    minLevel: 2,
    weight: 1,
    scope: 'property',
    regions: ['muehlental'],
    deadline: 2,
    text: (c) => `Das Amt verlangt für „${c.p!.name}“ denkmalgerechte Holzfenster statt Kunststoff.`,
    options: () => [
      { label: 'Fenster tauschen', detail: 'Fassade wird aufgewertet', cost: 6000, run: (x) => { x.p!.tiers.fassade = Math.min(3, x.p!.tiers.fassade + 1) as Tier; return 'Wunderschöne Sprossenfenster – das Amt ist zufrieden, das Haus gewinnt an Wert.'; } },
      { label: 'Widerspruch einlegen', cost: 1500, run: (x) => (chance(0.5) ? 'Widerspruch erfolgreich!' : (x.s.cash -= 8000, 'Widerspruch abgelehnt: Fenster plus Bußgeld, 8.000 €.')) },
    ],
    expire: (c) => { c.s.cash -= 5000; return 'Frist verpasst – Bußgeld 5.000 €.'; },
  },
  {
    id: 'keller',
    title: 'Feuchter Keller',
    npc: 'bruno',
    icon: '💦',
    minLevel: 3,
    weight: 2,
    scope: 'property',
    regions: ['lumenhafen'],
    deadline: 2,
    text: (c) => `Bruno: „Chef, der Keller in ${c.p!.name} ist nass wie ein Fischkutter. Das Hafenwasser drückt durch.“`,
    options: (c) => [
      { label: 'Keller abdichten', cost: round(c.p!.size * 30), run: () => 'Keller trocken – für Jahre Ruhe.' },
      { label: 'Entfeuchter aufstellen', cost: 400, run: (x) => { x.p!.hiddenDefect += 2000; return 'Fürs Erste trocken … aber das Problem bleibt.'; } },
    ],
    expire: (c) => { lower(c.p!, 'boden'); return 'Feuchtigkeit hat sich in die Böden gezogen.'; },
  },
  {
    id: 'studenten',
    title: 'Semesterstart in Lumenhafen',
    npc: 'jenny',
    icon: '🎓',
    minLevel: 3,
    weight: 2,
    scope: 'global',
    regions: ['lumenhafen'],
    deadline: 1,
    can: (c) => c.s.properties.some((p) => p.region === 'lumenhafen' && p.status === 'idle' && p.units.some((u) => !u.tenant)),
    text: () => 'Jenny: „Tausende Studierende suchen eine Bleibe! Ich kann alle deine freien Wohnungen in Lumenhafen sofort vermieten – mit 10 % Aufschlag.“',
    options: () => [
      {
        label: 'Ja, vermieten!',
        cost: 0,
        run: (x) => {
          let n = 0;
          for (const p of x.s.properties)
            if (p.region === 'lumenhafen' && p.status === 'idle')
              for (const u of p.units)
                if (!u.tenant) {
                  u.tenant = { ...studentTenant(x), rentFactor: 1.1 };
                  u.listed = false;
                  u.applicants = [];
                  n++;
                }
          return `${n} Wohnung(en) an Studierende vermietet.`;
        },
      },
      { label: 'Nein danke', cost: 0, run: () => 'Jenny zuckt mit den Schultern.' },
    ],
    expire: () => 'Die Studierenden haben woanders etwas gefunden.',
  },
  {
    id: 'laerm',
    title: 'Lärmbeschwerde',
    npc: 'mieter',
    icon: '📢',
    minLevel: 3,
    weight: 2,
    scope: 'tenant',
    deadline: 1,
    text: (c) => `Die Nachbarn beschweren sich: ${c.t!.name} feiert jedes Wochenende bis drei Uhr morgens.`,
    options: () => [
      { label: 'Vermitteln', detail: 'Gespräch bei Kaffee und Kuchen', cost: 0, run: (x) => (chance(0.65) ? 'Alle haben sich ausgesprochen. Frieden im Haus!' : (upsetAll(x.p, 15), 'Das Gespräch eskalierte. Die Stimmung ist im Keller.')) },
      { label: 'Abmahnung schreiben', cost: 150, run: (x) => { x.t!.satisfaction -= 10; return 'Es ist ruhig – aber der Mieter ist beleidigt.'; } },
    ],
    expire: (c) => { upsetAll(c.p, 20); return 'Die Nachbarn sind sauer, weil du nichts tust.'; },
  },
  {
    id: 'einbruch',
    title: 'Einbruch',
    npc: 'system',
    icon: '🥷',
    minLevel: 4,
    weight: 2,
    scope: 'property',
    deadline: 1,
    init: (c) => ({ cost: round(2500 + c.p!.size * 10) }),
    text: (c) => `In „${c.p!.name}“ wurde eingebrochen. Tür aufgehebelt, Fenster kaputt. Schaden: ${fmt(c.ev.data.cost)}.`,
    options: (c) => {
      const own = c.s.insurance.gebaeude ? round(c.ev.data.cost * 0.1, 50) : c.ev.data.cost;
      const how = c.s.insurance.gebaeude ? 'Die Versicherung zahlt den Großteil.' : 'Repariert.';
      return [
        { label: c.s.insurance.gebaeude ? 'Versicherung regelt das' : 'Selbst reparieren', detail: c.s.insurance.gebaeude ? 'Selbstbeteiligung 10 %' : undefined, cost: own, run: () => how },
        { label: 'Reparieren + Alarmanlage', cost: own + 1500, run: (x) => { pleaseAll(x.p, 10); return `${how} Die Mieter fühlen sich mit der Alarmanlage sicherer.`; } },
      ];
    },
    expire: (c) => { upsetAll(c.p, 15); return `Die kaputte Tür steht wochenlang offen. ${damage(c, c.ev.data.cost)}`; },
  },
  {
    id: 'aufzug',
    title: 'Aufzug steckt fest',
    npc: 'mieter',
    icon: '🛗',
    minLevel: 8,
    weight: 2,
    scope: 'property',
    regions: ['kronstadt', 'neuwerk'],
    can: (c) => c.p!.units.length >= 3,
    deadline: 1,
    text: (c) => `Der Aufzug in „${c.p!.name}“ ist defekt. Die Mieter im fünften Stock schleppen Einkäufe die Treppe hoch.`,
    options: () => [
      { label: 'Sofort reparieren', cost: 8000, run: () => 'Der Aufzug fährt wieder.' },
      { label: 'Nächste Woche', cost: 3500, run: (x) => { upsetAll(x.p, 10); return 'Billiger, aber die Mieter sind genervt.'; } },
    ],
    expire: (c) => { upsetAll(c.p, 25); return 'Die Mieter sind wütend.'; },
  },
  {
    id: 'bauverzoegerung',
    title: 'Bauverzögerung',
    npc: 'bruno',
    icon: '🚧',
    minLevel: 5,
    weight: 3,
    scope: 'building',
    deadline: 1,
    text: (c) => `Lieferengpass bei Ziegeln! Der Bau von „${c.p!.name}“ verzögert sich um zwei Monate – außer du zahlst einen Eilzuschlag.`,
    options: (c) => [
      { label: 'Eilzuschlag zahlen', cost: round((c.p!.buildCost ?? 100000) * 0.05), run: () => 'Die Ziegel kommen per Express. Zeitplan gehalten!' },
      { label: 'Verzögerung hinnehmen', cost: 0, run: (x) => { x.p!.busyMonths += 2; return 'Der Bau dauert zwei Monate länger.'; } },
    ],
    expire: (c) => { c.p!.busyMonths += 2; return 'Der Bau dauert zwei Monate länger.'; },
  },
  {
    id: 'pfusch',
    title: 'Pfusch am Bau?',
    npc: 'bruno',
    icon: '🔨',
    minLevel: 5,
    weight: 2,
    scope: 'building',
    deadline: 1,
    text: (c) => `Bruno hat sich die Baustelle „${c.p!.name}“ angesehen: „Die Estrichleger haben geschlampt. Das gibt später Risse.“`,
    options: (c) => [
      { label: 'Gutachter + Nachbesserung', detail: '+1 Monat Bauzeit', cost: round((c.p!.buildCost ?? 100000) * 0.03), run: (x) => { x.p!.busyMonths += 1; return 'Alles nachgebessert – sauber!'; } },
      { label: 'Ignorieren', cost: 0, run: (x) => { x.p!.hiddenDefect += round((x.p!.buildCost ?? 100000) * 0.05); return 'Du hoffst, dass es hält …'; } },
    ],
    expire: (c) => { c.p!.hiddenDefect += round((c.p!.buildCost ?? 100000) * 0.05); return 'Der Pfusch wurde einfach zugespachtelt.'; },
  },
  {
    id: 'wurzeln',
    title: 'Wurzeln unterm Fundament',
    npc: 'bruno',
    icon: '🌳',
    minLevel: 5,
    weight: 2,
    scope: 'property',
    regions: ['pilzhain'],
    deadline: 2,
    text: (c) => `Eine uralte Eiche hebt mit ihren Wurzeln das Fundament von „${c.p!.name}“ an.`,
    options: () => [
      { label: 'Baumpfleger holen', cost: 2500, run: () => 'Wurzeln umgeleitet, Baum gerettet, Haus sicher.' },
      { label: 'Fundament verstärken', detail: 'Fassade & Dach wird mindestens Standard', cost: 9000, run: (x) => { atLeast(x.p!, 'fassade', 2); return 'Bombenfest – für die nächsten 200 Jahre.'; } },
    ],
    expire: (c) => { lower(c.p!, 'fassade'); c.s.cash -= 3000; return 'Risse in der Wand! Notreparatur: 3.000 €.'; },
  },
  {
    id: 'flaute',
    title: 'Besucherflaute im Pilzhain',
    npc: 'jenny',
    icon: '🍂',
    minLevel: 5,
    weight: 2,
    scope: 'global',
    regions: ['pilzhain'],
    deadline: 1,
    can: (c) => c.s.properties.some((p) => p.region === 'pilzhain' && p.units.some((u) => u.tenant)),
    text: () => 'Das Wetter ist mies, die Feriengäste bleiben aus. Diesen Monat sinken die Einnahmen im Pilzhain um 40 %.',
    options: () => [
      { label: 'Werbekampagne schalten', cost: 1500, run: () => 'Die Kampagne zieht – Gäste kommen trotz Regen.' },
      { label: 'Abwarten', cost: 0, run: (x) => { x.s.flags.flaute = 1; return 'Diesen Monat wird es ruhig.'; } },
    ],
    expire: (c) => { c.s.flags.flaute = 1; return 'Diesen Monat wird es ruhig im Pilzhain.'; },
  },
  {
    id: 'lawine',
    title: 'Lawinenabgang',
    npc: 'system',
    icon: '🏔️',
    minLevel: 6,
    weight: 2,
    scope: 'property',
    regions: ['wolkenspitz'],
    deadline: 1,
    init: (c) => ({ cost: round(c.p!.size * 150) }),
    text: (c) => `Eine kleine Lawine hat „${c.p!.name}“ getroffen. Schaden: ${fmt(c.ev.data.cost)}.`,
    options: (c) => [{ label: c.s.insurance.gebaeude ? 'Versicherung melden' : 'Schaden beheben', detail: c.s.insurance.gebaeude ? 'Selbstbeteiligung 10 %' : undefined, cost: c.s.insurance.gebaeude ? round(c.ev.data.cost * 0.1, 50) : c.ev.data.cost, run: () => 'Alles wieder heil.' }],
    expire: (c) => damage(c, c.ev.data.cost * 1.3),
  },
  {
    id: 'schneelast',
    title: 'Schneelast auf dem Dach',
    npc: 'bruno',
    icon: '❄️',
    minLevel: 6,
    weight: 2,
    scope: 'property',
    regions: ['wolkenspitz'],
    months: [11, 0, 1, 2],
    deadline: 1,
    text: (c) => `Ein Meter Neuschnee auf „${c.p!.name}“. Das Dach ächzt.`,
    options: (c) => [
      { label: 'Dach räumen lassen', cost: 900, run: () => 'Dach frei – kein Risiko.' },
      { label: 'Riskieren', cost: 0, run: (x) => (chance(0.5) ? 'Es hat gehalten!' : `Das Dach ist eingebrochen. ${damage(x, round(c.p!.size * 80))}`) },
    ],
    expire: (c) => (chance(0.5) ? 'Es hat gehalten.' : `Das Dach ist eingebrochen. ${damage(c, round(c.p!.size * 80))}`),
  },
  {
    id: 'sturmflut',
    title: 'Sturmflut-Warnung',
    npc: 'system',
    icon: '🌪️',
    minLevel: 7,
    weight: 2,
    scope: 'property',
    regions: ['sonnenkueste'],
    deadline: 1,
    init: (c) => ({ cost: round(c.p!.size * 200) }),
    text: (c) => `Ein schwerer Sturm zieht auf die Sonnenküste zu. „${c.p!.name}“ liegt direkt am Wasser. Möglicher Schaden: ${fmt(c.ev.data.cost)}.`,
    options: (c) => [
      { label: 'Schutzwand bauen', cost: 5000, run: () => 'Die Schutzwand hat das Haus gerettet.' },
      { label: 'Riskieren', cost: 0, run: (x) => (chance(0.5) ? 'Der Sturm drehte ab.' : `Die Flut kam. ${damage(x, c.ev.data.cost)}`) },
    ],
    expire: (c) => `Die Flut kam. ${damage(c, c.ev.data.cost)}`,
  },
  {
    id: 'salz',
    title: 'Salz frisst die Fassade',
    npc: 'bruno',
    icon: '🧂',
    minLevel: 7,
    weight: 2,
    scope: 'property',
    regions: ['sonnenkueste'],
    deadline: 3,
    text: (c) => `Die salzige Seeluft hat die Fassade von „${c.p!.name}“ angegriffen.`,
    options: (c) => [{ label: 'Fassade neu streichen', cost: round(c.p!.size * 30), run: () => 'Strahlend weiß wie am ersten Tag.' }],
    expire: (c) => { lower(c.p!, 'fassade'); return 'Die Fassade bröckelt – das Objekt verliert an Wert.'; },
  },
  {
    id: 'zinserhoehung',
    title: 'Die Zentralbank erhöht die Zinsen',
    npc: 'krause',
    icon: '📈',
    minLevel: 6,
    weight: 2,
    scope: 'global',
    deadline: 1,
    can: (c) => c.s.loans.some((l) => l.type !== 'investor') && (c.s.flags.zins ?? 0) < 0.03,
    text: () => 'Herr Krause: „Schlechte Nachrichten. Die Zinsen steigen um 1,5 Prozentpunkte – auch für Ihre laufenden Kredite. Wir könnten umschulden.“',
    options: (c) => {
      const debt = c.s.loans.filter((l) => l.type !== 'investor').reduce((a, l) => a + l.principal, 0);
      return [
        { label: 'Umschulden', detail: 'Gebühr 1 % der Schulden, nur +0,5 %', cost: round(debt * 0.01), run: (x) => { raiseRates(x.s, 0.005); return 'Umgeschuldet – deine Raten steigen nur leicht.'; } },
        { label: 'Aussitzen', detail: '+1,5 % auf alle Kredite', cost: 0, run: (x) => { raiseRates(x.s, 0.015); return 'Deine Raten steigen.'; } },
      ];
    },
    expire: (c) => { raiseRates(c.s, 0.015); return 'Deine Raten steigen.'; },
  },
  {
    id: 'crash',
    title: 'Immobiliencrash!',
    npc: 'krause',
    icon: '📉',
    minLevel: 99,
    weight: 0,
    scope: 'triggered',
    deadline: 1,
    text: () => 'Die Blase ist geplatzt! Die Immobilienpreise in ganz Aurelien fallen um über 20 %. Banken werden vorsichtig, Käufer bleiben aus. Herr Krause: „Jetzt bloß keine Panik.“',
    options: () => [
      { label: 'Ruhe bewahren', cost: 0, run: () => 'Du atmest tief durch. Wer jetzt durchhält, gewinnt.' },
    ],
    expire: () => 'Der Crash ist da.',
  },
  {
    id: 'mietpreisbremse',
    title: 'Mietpreisbremse in Kronstadt',
    npc: 'system',
    icon: '⚖️',
    minLevel: 8,
    weight: 2,
    scope: 'global',
    regions: ['kronstadt'],
    deadline: 1,
    can: (c) => !c.s.flags.mietpreisbremse,
    text: () => 'Der Stadtrat von Kronstadt beschließt die Mietpreisbremse: Mieten dürfen die Marktmiete nicht mehr überschreiten. Wer energetisch saniert, steigert dafür den Wert seiner Objekte.',
    options: (c) => {
      const props = c.s.properties.filter((p) => p.region === 'kronstadt' && p.status === 'idle');
      const cost = round(props.reduce((a, p) => a + p.size * 60, 0));
      return [
        { label: 'Alle Kronstadt-Objekte energetisch sanieren', detail: 'Fassade und Heizung mindestens Standard', cost, disabled: !props.length, run: (x) => { props.forEach((p) => { atLeast(p, 'fassade', 2); atLeast(p, 'elektrik', 2); }); x.s.flags.mietpreisbremse = 1; return 'Saniert – deine Objekte sind zukunftssicher.'; } },
        { label: 'Akzeptieren', cost: 0, run: (x) => { x.s.flags.mietpreisbremse = 1; return 'Die Mietpreisbremse gilt ab sofort.'; } },
      ];
    },
    expire: (c) => { c.s.flags.mietpreisbremse = 1; return 'Die Mietpreisbremse gilt ab sofort.'; },
  },
  {
    id: 'viktor_angebot',
    title: 'Viktor macht ein Angebot',
    npc: 'viktor',
    icon: '🎩',
    minLevel: 9,
    weight: 4,
    scope: 'property',
    deadline: 1,
    can: (c) => c.p!.status === 'idle',
    init: (c) => ({ price: round(propertyValue(c.s, c.p!) * 0.88, 1000) }),
    text: (c) => `Viktor von Hohenstein, mit Goldmonokel: „Ich nehme Ihnen ${c.p!.name} ab. ${fmt(c.ev.data.price)}, bar. Ein Angebot, das man nicht ablehnt.“`,
    options: (c) => [
      { label: 'Verkaufen', detail: 'Unter Wert, aber sofort Geld', cost: 0, run: (x) => sellNow(x.s, x.p!, c.ev.data.price, 'an Viktor') },
      { label: 'Höflich ablehnen', cost: 0, run: (x) => { x.s.flags.viktorAnger = (x.s.flags.viktorAnger ?? 0) + 1; return 'Viktor kneift das Monokel zusammen: „Das werden Sie bereuen.“'; } },
    ],
    expire: () => 'Viktor nimmt dein Schweigen als Nein.',
  },
  {
    id: 'viktor_bank',
    title: 'Viktor bei deiner Bank',
    npc: 'krause',
    icon: '🕵️',
    minLevel: 9,
    weight: 3,
    scope: 'global',
    deadline: 1,
    text: () => 'Herr Krause flüstert: „Herr von Hohenstein hat Anteile unserer Bank gekauft und will Ihre Bonität prüfen lassen. Mit einem Sicherheitspaket könnte ich das abwenden.“',
    options: () => [
      { label: 'Sicherheitspaket', cost: 5000, run: () => 'Herr Krause hält schützend die Hand über dich.' },
      { label: 'Ignorieren', cost: 0, run: (x) => { x.s.score = clamp(x.s.score - 10, 0, 100); return 'Deine Bonität sinkt um 10 Punkte.'; } },
    ],
    expire: (c) => { c.s.score = clamp(c.s.score - 10, 0, 100); return 'Deine Bonität sinkt um 10 Punkte.'; },
  },
  {
    id: 'dennis',
    title: 'Dennis hat einen Tipp',
    npc: 'dennis',
    icon: '🤙',
    minLevel: 2,
    weight: 1,
    scope: 'global',
    deadline: 1,
    can: (c) => c.s.cash > 20000,
    text: () => 'Dennis: „Alter, Krypto-Hausboote! Investier 10.000 €, in einem Monat hast du das Zweieinhalbfache. Vertrau mir!“',
    options: () => [
      { label: '10.000 € investieren', cost: 10000, run: (x) => (chance(0.35) ? (x.s.cash += 25000, 'Unglaublich – es hat geklappt! Du bekommst 25.000 € zurück.') : 'Die Hausboote sind gesunken. Das Geld ist weg. Dennis: „Upsi.“') },
      { label: 'Lieber nicht', cost: 0, run: () => 'Dennis: „Dein Verlust, Digga.“' },
    ],
    expire: () => 'Dennis hat es jemand anderem erzählt.',
  },
  {
    id: 'bahnlinie',
    title: 'Neue Bahnlinie!',
    npc: 'jenny',
    icon: '🚆',
    minLevel: 2,
    weight: 1,
    scope: 'global',
    deadline: 1,
    init: (c) => {
      const regs = unlockedRegions(c.s);
      return { region: Math.floor(Math.random() * regs.length) };
    },
    text: (c) => {
      const r = unlockedRegions(c.s)[c.ev.data.region] ?? unlockedRegions(c.s)[0];
      return `Jenny: „Die neue Bahnlinie nach ${r.name} ist beschlossen! Die Preise dort ziehen um 10 % an.“`;
    },
    options: () => [
      {
        label: 'Super!',
        cost: 0,
        run: (x) => {
          const r = unlockedRegions(x.s)[x.ev.data.region] ?? unlockedRegions(x.s)[0];
          x.s.marketIndex[r.id] *= 1.1;
          return `Die Immobilienwerte in ${r.name} steigen.`;
        },
      },
    ],
    expire: (c) => {
      const r = unlockedRegions(c.s)[c.ev.data.region] ?? unlockedRegions(c.s)[0];
      c.s.marketIndex[r.id] *= 1.1;
      return `Die Immobilienwerte in ${r.name} steigen.`;
    },
  },
  // ---------- ausgelöste Ereignisse ----------
  {
    id: 'mietausfall',
    title: 'Miete nicht gezahlt',
    npc: 'mieter',
    icon: '💸',
    minLevel: 99,
    weight: 0,
    scope: 'triggered',
    deadline: 1,
    text: (c) => `${c.t!.name} (${c.p!.name}) hat die Miete von ${fmt(c.ev.data.rent)} nicht überwiesen.`,
    options: (c) => [
      { label: 'Freundlich erinnern', cost: 0, run: (x) => (chance(0.6) ? (x.s.cash += c.ev.data.rent, 'Sorry, vergessen! Das Geld ist da.') : ((x.t!.payMoral -= 0.1), 'Keine Reaktion …')) },
      { label: 'Ratenzahlung anbieten', cost: 0, run: (x) => (chance(0.85) ? ((x.s.cash += c.ev.data.rent * 0.9), (x.t!.satisfaction += 5), 'Ratenzahlung vereinbart, das meiste ist schon da.') : 'Auch die erste Rate kam nicht.') },
      { label: 'Abmahnung durch Anwalt', cost: legal(c.s, 300), run: (x) => (chance(0.75) ? ((x.s.cash += c.ev.data.rent), (x.t!.payMoral += 0.03), 'Das wirkte – die Miete ist da.') : 'Die Abmahnung wurde ignoriert.') },
      { label: 'Kündigen', detail: 'Mieter zieht in 2 Monaten aus', cost: legal(c.s, 1500), run: (x) => { x.t!.noticeMonths = 2; x.t!.stopsPaying = true; return 'Gekündigt. Bis zum Auszug zahlt der Mieter nichts mehr.'; } },
    ],
    expire: (c) => { c.t!.payMoral -= 0.1; c.t!.satisfaction -= 10; return 'Ohne Reaktion zahlt der Mieter noch unzuverlässiger.'; },
  },
  {
    id: 'nomaden',
    title: 'Mietnomaden!',
    npc: 'hilde',
    icon: '🚨',
    minLevel: 99,
    weight: 0,
    scope: 'triggered',
    deadline: 1,
    text: (c) => `${c.t!.name} zahlt seit Monaten nichts, ist telefonisch nicht erreichbar und die Nachbarn berichten von Müllbergen. Oma Hilde: „Das sind Mietnomaden, Kind. Hättest du mal genauer hingeschaut.“`,
    options: (c) => [
      { label: 'Räumungsklage', detail: 'Wohnung wird verwüstet zurückgegeben', cost: legal(c.s, 4000), run: (x) => { evict(x); lower(x.p!, 'boden'); lower(x.p!, 'kueche'); lower(x.p!, 'bad'); return 'Nach zähem Prozess ist die Wohnung wieder frei – aber verwüstet.'; } },
      { label: 'Auszug abkaufen', detail: 'Schneller, weniger Schaden', cost: 3000 + round(tenantRent(c.s, c.p!, c.u!) * 2), run: (x) => { evict(x); lower(x.p!, 'boden'); return 'Gegen Geld sind sie über Nacht verschwunden.'; } },
    ],
    expire: () => 'Die Mietnomaden bleiben – und zahlen weiter nichts.',
  },
  {
    id: 'mangel',
    title: 'Versteckter Mangel!',
    npc: 'bruno',
    icon: '🔍',
    minLevel: 99,
    weight: 0,
    scope: 'triggered',
    deadline: 1,
    text: (c) => {
      const d = c.p?.defects?.[c.ev.data.defect ?? -1];
      return d
        ? `Bruno: „Chef, schlechte Nachrichten aus ${c.p!.name}: ${defectDef(d.type).name}. ${defectDef(d.type).desc}“ Kosten: ${fmt(d.cost)}.`
        : `Bruno: „Chef, in ${c.p!.name} ist etwas faul.“ Kosten: ${fmt(c.ev.data.cost)}.`;
    },
    options: (c) => {
      const d = c.p?.defects?.[c.ev.data.defect ?? -1];
      return [
        { label: 'Sofort beheben', cost: c.ev.data.cost, run: (x) => { if (d) { d.found = true; d.fixed = true; track(x.s, 'defectFixed'); } return 'Repariert. Beim nächsten Kauf lieber genauer besichtigen!'; } },
        { label: 'Später im Renovierungsplan', detail: 'Bis dahin: weniger Wert, unzufriedene Mieter', cost: 0, run: () => { if (d) d.found = true; return 'Notiert. Plane die Beseitigung bei der nächsten Renovierung ein.'; } },
      ];
    },
    expire: (c) => {
      const d = c.p?.defects?.[c.ev.data.defect ?? -1];
      if (d) d.found = true;
      const extra = round(c.ev.data.cost * 0.3);
      c.s.cash -= extra;
      return `Der Mangel hat Folgeschäden verursacht: ${fmt(extra)}.`;
    },
  },
  {
    id: 'mahnung2',
    title: '2. Mahnung – letzte Chance',
    npc: 'krause',
    icon: '⚠️',
    minLevel: 99,
    weight: 0,
    scope: 'triggered',
    deadline: 1,
    text: (c) => `Herr Krause, ernst: „Ihr Konto ist ${fmt(-c.s.cash)} im Minus und über dem Dispo. Nächsten Monat muss ich den Kredit kündigen – dann wird ein Objekt zwangsversteigert. Ich biete Ihnen drei Auswege an.“`,
    options: (c) => {
      const best = [...c.s.properties].filter((p) => p.status !== 'building').sort((a, b) => propertyValue(c.s, b) - propertyValue(c.s, a))[0];
      const opts: EventOption[] = [];
      if (best) {
        const price = round(propertyValue(c.s, best) * 0.8, 1000);
        opts.push({ label: `Notverkauf: ${best.name}`, detail: `für ${fmt(price)} (80 % des Werts)`, cost: 0, run: (x) => sellNow(x.s, best, price, 'im Notverkauf') });
      }
      const need = round(-c.s.cash + 20000, 1000);
      opts.push({
        label: 'Umschuldung',
        detail: `${fmt(need)} Kredit zu teurem Zins (12 %)`,
        cost: 0,
        run: (x) => {
          x.s.cash += need;
          const id = `l${++x.s.idCounter}`;
          x.s.loans.push({ id, type: 'renovierung', label: 'Umschuldungskredit', principal: need, original: need, rate: 0.12, monthsLeft: 36, payment: need * 0.0332 });
          x.s.dunning = 1;
          return 'Umgeschuldet. Das wird teuer – aber du bist erst einmal raus.';
        },
      });
      opts.push({ label: 'Stundung beantragen', detail: 'Ein Monat Aufschub, Gebühr 2 % des Minus', cost: round(-c.s.cash * 0.02), run: (x) => { x.s.flags.stundung = 1; return 'Ein Monat Aufschub. Nutze ihn!'; } });
      return opts;
    },
    expire: () => 'Du hast nicht reagiert.',
  },
];

export const eventById = (id: string) => EVENTS.find((e) => e.id === id)!;

function studentTenant(c: EventCtx): Tenant {
  return {
    name: pick(['Lina Hartmann', 'Jamal Osei', 'Mia Chen', 'Tobi Krüger', 'Sophie Arslan', 'Noah Weber']),
    job: 'Student',
    income: 1100,
    schufa: 'B',
    avatar: c.s.avatar,
    payMoral: 0.985,
    nomad: false,
    notes: ['Semesterstart – Mietvertrag über Jenny'],
    satisfaction: 75,
    monthsStayed: 0,
    paidStreak: 0,
    missed: 0,
    rentFactor: 1.1,
    noticeMonths: 0,
    stopsPaying: false,
    minderung: 0,
    minderungMonths: 0,
  };
}

function evict(c: EventCtx) {
  if (c.u) {
    c.u.tenant = null;
    c.u.listed = false;
    c.u.applicants = [];
    c.u.vacantMonths = 0;
  }
}

export function raiseRates(s: GameState, by: number) {
  s.flags.zins = (s.flags.zins ?? 0) + by;
  for (const l of s.loans) {
    if (l.type === 'investor') continue;
    l.rate += by;
    const r = l.rate / 12;
    l.payment = (l.principal * r) / (1 - Math.pow(1 + r, -Math.max(1, l.monthsLeft)));
  }
}

/** Verkauft ein Objekt sofort zum genannten Preis, tilgt verknüpfte Kredite. */
export function sellNow(s: GameState, p: Property, price: number, how: string) {
  const linked = s.loans.filter((l) => l.propertyId === p.id);
  const debt = linked.reduce((a, l) => a + l.principal, 0);
  s.loans = s.loans.filter((l) => l.propertyId !== p.id);
  s.cash += price - debt;
  s.properties = s.properties.filter((x) => x.id !== p.id);
  s.events = s.events.filter((e) => e.propertyId !== p.id);
  const profit = price - p.invested;
  if (profit > 0 && !p.built) {
    track(s, 'flip');
    addXp(s, Math.min(400, 60 + Math.round(profit / 2000)));
    s.stats.profitableFlips++;
    s.levelStats.profitableFlips++;
    s.stats.bestFlipProfit = Math.max(s.stats.bestFlipProfit, profit);
  }
  return `„${p.name}“ wurde ${how} für ${fmt(price)} verkauft${debt ? `, davon ${fmt(debt)} Kredit getilgt` : ''}. ${profit >= 0 ? 'Gewinn' : 'Verlust'}: ${fmt(Math.abs(profit))}.`;
}

export function ctxFor(s: GameState, ev: ActiveEvent): EventCtx {
  const p = ev.propertyId ? s.properties.find((x) => x.id === ev.propertyId) : undefined;
  const u = p && ev.unitIndex !== undefined ? p.units[ev.unitIndex] : undefined;
  return { s, ev, p, u, t: u?.tenant ?? undefined };
}

export function eventStillValid(s: GameState, ev: ActiveEvent) {
  const def = eventById(ev.defId);
  const c = ctxFor(s, ev);
  if (ev.propertyId && !c.p) return false;
  if ((def.scope === 'tenant' || ['mietausfall', 'nomaden'].includes(def.id)) && !c.t) return false;
  return true;
}

export function resolveEvent(s: GameState, uidStr: string, optionIndex: number): string {
  const ev = s.events.find((e) => e.uid === uidStr);
  if (!ev) return '';
  const def = eventById(ev.defId);
  const c = ctxFor(s, ev);
  s.events = s.events.filter((e) => e.uid !== uidStr);
  if (!eventStillValid(s, ev)) return 'Das Ereignis hat sich erledigt.';
  const opt = def.options(c)[optionIndex];
  if (!opt) return '';
  s.cash -= opt.cost;
  const result = opt.run(c);
  if (c.t) c.t.satisfaction = clamp(c.t.satisfaction, 0, 100);
  return result;
}

export function expireEvent(s: GameState, ev: ActiveEvent): string {
  const def = eventById(ev.defId);
  if (!eventStillValid(s, ev)) return '';
  const c = ctxFor(s, ev);
  const r = def.expire(c);
  if (c.t) c.t.satisfaction = clamp(c.t.satisfaction, 0, 100);
  return `${def.title}: ${r}`;
}

export function regionName(id: RegionId) {
  return regionById(id).name;
}
