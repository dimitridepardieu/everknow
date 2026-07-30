// Eve's expression vocabulary, lifted from the Claude Design boards.
//
// Two sets. The plain keys are the original board: eyes open, pupils that
// track. The `soft.*` set is the one the app uses — the eyes smile or close but
// never stare, which reads calmer and survives small sizes. `wow` and the gaze
// utilities stay open-eyed: those are the two cases that need pupils.
//
// It lives beside the component rather than inside it so both the component and
// the /eve reference sheet read the same table.

export type Point = readonly [number, number]

export type Eyes =
  | 'open'
  | 'wide'
  | 'squint'
  | 'wink'
  | 'winkClosed'
  | 'happy'
  | 'sleep'
  | 'blink'

export type Mouth =
  | 'smile'
  | 'grin'
  | 'big'
  | 'soft'
  | 'small'
  | 'flat'
  | 'firm'
  | 'o'
  | 'wavy'
  | 'frown'
  | 'yawn'

export type Brows = 'raised' | 'sad' | 'firm' | 'oneUp'

export type Prop =
  | 'sparkles'
  | 'sparkleSmall'
  | 'confetti'
  | 'blush'
  | 'zzz'
  | 'zzzSmall'
  | 'bubble'
  | 'question'
  | 'dots'
  | 'heart'
  | 'waves'

export interface MoodSpec {
  readonly eyes: Eyes
  readonly mouth?: Mouth
  readonly brows?: Brows
  readonly gaze?: Point
  readonly tilt?: number
  readonly tear?: boolean
  readonly props?: readonly Prop[]
  /** When to reach for it. Drives the /eve reference sheet. */
  readonly use: string
}

export const MOODS = {
  idle: { eyes: 'open', mouth: 'smile', use: 'Présence par défaut' },
  happy: { eyes: 'open', mouth: 'grin', use: 'Accueil, tout va bien' },
  cheer: {
    eyes: 'happy',
    mouth: 'big',
    props: ['sparkles'],
    use: 'Bonne réponse',
  },
  proud: {
    eyes: 'happy',
    mouth: 'grin',
    tilt: -3,
    props: ['sparkleSmall'],
    use: 'Série de jours',
  },
  celebrate: {
    eyes: 'happy',
    mouth: 'big',
    props: ['confetti'],
    use: 'Premier paquet, palier',
  },
  encourage: {
    eyes: 'open',
    brows: 'raised',
    mouth: 'soft',
    use: 'Mauvaise réponse',
  },
  concerned: {
    eyes: 'open',
    brows: 'raised',
    mouth: 'small',
    gaze: [0, 2],
    use: 'Erreur, hors ligne',
  },
  think: {
    eyes: 'open',
    gaze: [-3, -3],
    mouth: 'flat',
    props: ['bubble'],
    use: 'Génération IA',
  },
  loading: {
    eyes: 'open',
    gaze: [4, 0],
    mouth: 'small',
    props: ['dots'],
    use: 'Chargement',
  },
  wow: { eyes: 'wide', mouth: 'o', use: 'Découverte, gros chiffre' },
  wink: { eyes: 'wink', mouth: 'grin', use: 'Astuce, complicité' },
  curious: {
    eyes: 'open',
    gaze: [4, 0],
    brows: 'oneUp',
    mouth: 'small',
    tilt: 7,
    use: 'Question posée',
  },
  focus: {
    eyes: 'squint',
    gaze: [0, 2],
    mouth: 'flat',
    use: 'Pendant la carte',
  },
  determined: {
    eyes: 'open',
    brows: 'firm',
    mouth: 'firm',
    use: 'On y va, bouton principal',
  },
  confused: {
    eyes: 'open',
    gaze: [-4, 0],
    mouth: 'wavy',
    props: ['question'],
    use: 'Réponse illisible',
  },
  shy: {
    eyes: 'open',
    mouth: 'small',
    props: ['blush'],
    gaze: [0, 2],
    use: 'Onboarding, premier bonjour',
  },
  sleep: {
    eyes: 'sleep',
    mouth: 'small',
    props: ['zzz'],
    use: 'Rien à réviser',
  },
  blink: {
    eyes: 'blink',
    mouth: 'smile',
    use: 'Image de clignement (animation)',
  },
  gazeLeft: {
    eyes: 'open',
    gaze: [-5, 0],
    mouth: 'smile',
    use: 'Regard dirigé (utilitaire)',
  },
  gazeRight: {
    eyes: 'open',
    gaze: [5, 0],
    mouth: 'smile',
    use: 'Regard dirigé (utilitaire)',
  },
  doux: {
    eyes: 'happy',
    mouth: 'smile',
    use: 'Avatar · yeux souriants, bouche douce',
  },
  tendre: { eyes: 'happy', mouth: 'small', use: 'Avatar · le plus discret' },

  'soft.idle': { eyes: 'happy', mouth: 'smile', use: 'Présence par défaut' },
  'soft.focus': {
    eyes: 'sleep',
    brows: 'firm',
    mouth: 'flat',
    use: 'Pendant la carte',
  },
  'soft.cheer': {
    eyes: 'happy',
    mouth: 'big',
    props: ['sparkles'],
    use: 'Bonne réponse',
  },
  'soft.encourage': {
    eyes: 'happy',
    brows: 'raised',
    mouth: 'soft',
    use: 'Mauvaise réponse',
  },
  'soft.proud': {
    eyes: 'happy',
    mouth: 'grin',
    tilt: -3,
    props: ['sparkleSmall'],
    use: 'Série de jours',
  },
  'soft.think': {
    eyes: 'sleep',
    mouth: 'flat',
    props: ['bubble'],
    use: 'Génération IA',
  },
  'soft.loading': {
    eyes: 'sleep',
    mouth: 'small',
    props: ['dots'],
    use: 'Chargement',
  },
  'soft.celebrate': {
    eyes: 'happy',
    mouth: 'big',
    props: ['confetti'],
    use: 'Premier paquet, palier',
  },
  'soft.wow': {
    eyes: 'happy',
    mouth: 'o',
    props: ['sparkleSmall'],
    use: 'Découverte, gros chiffre',
  },
  'soft.sleep': {
    eyes: 'sleep',
    mouth: 'small',
    props: ['zzz'],
    use: 'Rien à réviser',
  },
  'soft.happy': { eyes: 'happy', mouth: 'grin', use: 'Accueil, tout va bien' },
  'soft.wink': {
    eyes: 'winkClosed',
    mouth: 'grin',
    tilt: -3,
    use: 'Astuce, complicité',
  },
  'soft.hello': {
    eyes: 'happy',
    mouth: 'grin',
    tilt: 5,
    props: ['sparkleSmall'],
    use: 'Bonjour, premier lancement',
  },
  'soft.shy': {
    eyes: 'happy',
    mouth: 'small',
    props: ['blush'],
    use: 'Onboarding, compliment reçu',
  },
  'soft.curious': {
    eyes: 'sleep',
    brows: 'oneUp',
    mouth: 'small',
    tilt: 7,
    use: 'Question posée',
  },
  'soft.determined': {
    eyes: 'sleep',
    brows: 'firm',
    mouth: 'firm',
    use: 'On y va, bouton principal',
  },
  'soft.sad': {
    eyes: 'sleep',
    brows: 'sad',
    mouth: 'frown',
    tear: true,
    use: 'Tristesse douce · série perdue, au revoir',
  },
  'soft.oops': {
    eyes: 'happy',
    brows: 'raised',
    mouth: 'wavy',
    props: ['blush'],
    use: 'Petit ratage assumé',
  },
  'soft.concerned': {
    eyes: 'sleep',
    brows: 'sad',
    mouth: 'small',
    use: 'Erreur, hors ligne',
  },
  'soft.confused': {
    eyes: 'sleep',
    brows: 'oneUp',
    mouth: 'wavy',
    props: ['question'],
    tilt: -5,
    use: 'Réponse illisible',
  },
  'soft.relief': {
    eyes: 'happy',
    brows: 'raised',
    mouth: 'soft',
    props: ['sparkleSmall'],
    use: 'Ouf · rattrapé de justesse',
  },
  'soft.love': {
    eyes: 'happy',
    mouth: 'small',
    props: ['heart'],
    tilt: -3,
    use: 'Paquet favori, merci',
  },
  'soft.yawn': {
    eyes: 'sleep',
    mouth: 'yawn',
    props: ['zzzSmall'],
    use: 'Fin de session, il est tard',
  },
  'soft.listen': {
    eyes: 'sleep',
    mouth: 'small',
    props: ['waves'],
    use: 'Écoute · dictée, prononciation',
  },
  'soft.calm': {
    eyes: 'sleep',
    mouth: 'flat',
    use: 'Pause, respiration, écran de fin',
  },
  'soft.blink': {
    eyes: 'blink',
    mouth: 'smile',
    use: 'Image de clignement (animation)',
  },
} as const satisfies Record<string, MoodSpec>

export type EveMood = keyof typeof MOODS
