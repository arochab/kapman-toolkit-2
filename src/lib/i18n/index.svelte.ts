// CuePoint i18n spine — built from scratch (the UX jury confirmed none existed).
//
// Svelte 5 module-state rules (see CLAUDE.md):
//  - this file is .svelte.ts because it holds a rune ($state) outside a component
//  - we NEVER reassign the exported `i18n` object; we mutate i18n.locale in place
//    (Svelte 5 refuses to compile a reassigned exported $state)
//
// Default locale is FR: CuePoint is built for a French producer who wants it to
// speak his language on first paint. EN is one tap away in the Nav.
//
// Keys are authored for the screens that actually exist after the jury redesign:
// the 5 producer-voice need-chips, the cold-entry question, STEP/ÉTAPE eyebrows,
// the verdict CTA, the per-issue "the move" titles, plus Nav/Home/Auth/genres.

export type Locale = 'fr' | 'en';

const STORAGE_KEY = 'cuepoint.locale.v1';

type Dict = Record<string, string>;

// --- FRENCH (default) — producer-to-producer tutoiement, studio jargon kept in EN
//     where that is how French producers actually speak (kick, mono, LUFS, true peak).
const fr: Dict = {
  // Nav
  'nav.analyzer': 'Analyseur',
  'nav.projects': 'Projets',
  'nav.admin': 'Admin',
  'nav.workspace': 'Espace',
  'nav.signout': 'Se déconnecter',
  'nav.getAccess': 'Se connecter',
  'nav.connected': 'Connecté',
  'nav.subtitle': 'Une oreille de studio, dans ton navigateur',

  // Home ("Silence" redesign: one invitation + one whisper, the whole screen is the door)
  'home.invite': 'Dépose ton son.',
  'home.whisper': 'Cue écoute, puis te dit la seule chose à corriger.',
  'home.dropNow': 'lâche-le',
  'home.knowAlready': 'je sais déjà',
  'home.openProjects': 'Mes projets',
  'home.checkMix': 'Analyser un mix',

  // Analyzer — upload
  'an.step01': 'ÉTAPE 01 / DÉPÔT',
  'an.dropTitle1': 'DÉPOSE UN',
  'an.dropTitle2': 'BOUNCE',
  'an.uploadLede': 'Ton morceau, ta machine. Cue écoute quelques secondes et te dit la seule chose à corriger en premier.',
  'an.whatIsIt': "C'EST QUOI ?",
  'an.dropCta': 'Dépose un morceau ou clique',
  'an.dropPrivacy': 'MP3 / WAV · RIEN NE QUITTE TON NAVIGATEUR',
  'an.knowAlready': 'Tu sais déjà ce qui cloche ?',

  // Analyzer — listening
  'an.step02': 'ÉTAPE 02 / ÉCOUTE',
  'an.listening': 'Cue écoute',
  'an.scanning': 'ANALYSE',
  'an.stepDecode': 'Décodage audio',
  'an.stepLoudness': 'Mesure du loudness',
  'an.stepMasking': 'Recherche de masquage',
  'an.stepPick': 'Sélection de ton fix #1',

  // Analyzer — error
  'an.errorTitle': 'LECTURE IMPOSSIBLE',
  'an.error': "Impossible d'analyser ce fichier. Essaie un export WAV, MP3 ou FLAC standard.",
  'an.tryAnother': 'Essayer un autre fichier',

  // Analyzer — listening stepper stages (honest, real DSP progress)
  'an.stageDecode': 'décodage',
  'an.stageLoudness': 'loudness',
  'an.stageTruepeak': 'true peak',
  'an.stageSpectrum': 'le fix',

  // Analyzer — verdict
  'an.theOneThing': 'LA SEULE CHOSE',
  'an.walkMeThrough': 'guide-moi',
  'an.numbers': 'les chiffres',
  'an.hide': 'masquer',
  'an.share': 'partager',
  'an.analyzeAnother': 'analyser un autre',
  'an.mixScore': 'mix score',
  'an.evidence': 'les chiffres',
  'an.pinProject': 'épingler à un projet…',
  'an.pinIt': 'épingler',
  'an.saving': 'enregistrement…',
  'an.saved': 'enregistré',
  'an.genreCorrect': 'pas le bon style ?',

  // Verdict words (3-answer system)
  'verdict.ship': 'ENVOIE',
  'verdict.almost': 'PRESQUE',
  'verdict.work': 'PAS ENCORE',

  // Stats
  'stat.loudness': 'LOUDNESS',
  'stat.truePeak': 'TRUE PEAK',
  'stat.mono': 'MONO',

  // Step 04 — The Continuation (the fix worklist)
  'fix.step04': 'LA SOLUTION',
  'fix.moreRoutes': 'autres routes',
  'fix.characterLane': 'tu explores juste des sons ? par caractère',
  'fix.openRoute': 'la route complète',
  'fix.stepCount': 'étape',
  'fix.stepOf': 'sur',
  'fix.native': 'en natif Ableton',
  'fix.notes': 'les notes',
  'fix.closing': 'Reprends ton son quand t’as fait ça.',

  // The 5 producer-voice needs (cold-entry chips) — validated by the jury
  'need.low-end': 'Mon kick et ma basse se battent',
  'need.phase': 'Des éléments disparaissent en mono',
  'need.top-end': 'Le haut du spectre est trop dur',
  'need.loudness': "C'est trop fort, ou pas assez",
  'need.healthy': "Je veux juste savoir si c'est prêt",
  'need.character': 'Ajouter du caractère',

  // Cold-entry "The Question" — a typeset contents page of the 5 needs
  'cold.question': "C'est quoi qui te gêne ?",
  'cold.sub': 'Choisis ce que tu entends. Cue te donne la route, pas un catalogue.',
  'cold.characterFooter': 'ou explore le caractère · un seul son à la fois',
  'cold.mustHear': 'ça, faut que je l’écoute — dépose ton son.',
  'cold.back': '← retour',
  // short need labels for the contents-page rows (the dot-leader version)
  'coldrow.low-end': 'le bas (kick & basse)',
  'coldrow.phase': 'la largeur (mono)',
  'coldrow.top-end': 'le haut (dur / brillant)',
  'coldrow.loudness': 'le volume',
  'coldrow.healthy': 'est-ce que c’est prêt ?',
  'coldtag.low-end': 'bas',
  'coldtag.phase': 'phase',
  'coldtag.top-end': 'haut',
  'coldtag.loudness': 'loudness',
  'coldtag.healthy': 'à l’écoute',

  // Projects — memory timeline
  'projects.title': 'ce que t’as déjà entendu',
  'projects.keepIt': 'garder ça ? — connecte-toi.',
  'projects.empty': 'rien encore. dépose ton son.',
  'projects.newProject': '+ nouveau',

  // "The move" titles per IssueType (recommendationFor) — FR
  'move.headroom': 'Un limiteur true-peak',
  'move.phase': 'Un correcteur de mono / corrélation',
  'move.top-end': 'Un shelf doux dans le haut, pas un boost',
  'move.low-end': 'Répartis le kick et la basse',
  'move.loudness': 'Un loudness-mètre fiable',
  'move.healthy': 'Une référence en laquelle tu as confiance',

  // Auth (de-jargoned)
  'auth.title': 'Sauvegarde tes morceaux et laisse Cue suivre ta progression.',
  'auth.googleSub': 'Un tap avec Google. Pas de mot de passe, pas de spam.',
  'auth.google': 'Continuer avec Google',
  'auth.orEmail': 'ou par email',
  'auth.emailPlaceholder': 'ton@email.com',
  'auth.emailCta': 'Reçois un lien par email',
  'auth.emailSent': 'Lien envoyé. Vérifie ta boîte mail.',

  // Genre chips
  'genre.deep-house': 'Deep House',
  'genre.minimal': 'Minimal',
  'genre.techno': 'Techno',
  'genre.dub-techno': 'Dub Techno',
  'genre.electro': 'Electro',
  'genre.acid': 'Acid',
  'genre.uk-garage': 'UK Garage',
  'genre.ambient': 'Ambient',
  'genre.other': 'Pas sûr',
  // Toasts (user-facing, so localized — the verdict screen isn't the only screenshot moment)
  'toast.favSignin': 'Connecte-toi pour garder tes favoris — ils se synchronisent à ton compte.',
  'toast.favError': 'Impossible de mettre à jour les favoris. Vérifie ta connexion et réessaie.',
  'toast.noteSaved': 'Note enregistrée.',
  'toast.noteError': 'La note n’a pas pu être enregistrée. Vérifie ta connexion.',
  'toast.recipeAdded': 'Recette ajoutée au projet.',
  'toast.recipeAddError': 'Impossible d’ajouter au projet. Réessaie.',
  'toast.projectsError': 'Impossible de rafraîchir les projets. Vérifie ta connexion.',
  'toast.projectRecipesError': 'Impossible de rafraîchir les recettes du projet.',
  'toast.signoutError': 'Échec de la déconnexion. Tu as été déconnecté localement.',
  // Coach (paid AI read) — the quiet opt-in UNDER the free fix. Copy validated by the FR copy
  // jury: elegant, dry-warm, zero cliche, zero fear, no hyphens (middot separators in packs).
  'coach.link': 'Tu veux que Cue te le dise avec ses mots ?',
  'coach.linkSub': 'Première lecture offerte.',
  'coach.title': 'Cue te relit ton verdict',
  'coach.subtitle': 'Deux ou trois phrases sur ton morceau, et le geste d’après. Une lecture coûte un crédit.',
  'coach.pack1': '1 crédit · 1 € · pour voir',
  'coach.pack5': '5 crédits · 4 € · 0,80 la lecture',
  'coach.pack12': '12 crédits · 8 € · 0,67 la lecture, le meilleur prix',
  'coach.honesty': 'Cue ne touche à aucun chiffre. Il dit la même chose, dans ta langue à toi.',
  'coach.safety': 'Pas de crédit ce soir ? Le verdict et la recette restent là, gratuits.',
  'coach.back': 'Revenir au verdict',
  'coach.reading': 'Cue relit ton morceau…',
  'coach.credits': 'crédits',
  'coach.signin': 'Connecte-toi pour utiliser ta lecture offerte.',
  'pay.received': 'Paiement reçu. Tes crédits arrivent dans un instant.',
  'pay.canceled': 'Paiement annulé. Rien ne t’a été débité.',
  'pay.recap': 'Tu achètes des crédits pour le coach IA. 1 crédit = 1 lecture. Vendeur : CuePoint (Adam Chabbi). Prix TTC, sans abonnement, crédits sans expiration.',
  'pay.waiver': 'Je demande la fourniture immédiate de mes crédits et je reconnais perdre mon droit de rétractation dès qu’un crédit est utilisé (art. L221-28, 13° du Code de la consommation).',
  'pay.order': 'Commander avec obligation de paiement',
  'pay.terms': 'Voir les conditions et le remboursement',
  'pay.tickFirst': 'Coche la case ci-dessus pour débloquer les packs.',
  'pay.checkoutError': 'Le paiement n’a pas pu s’ouvrir. Réessaie dans un instant — rien ne t’a été débité.',
  // footer
  'foot.cgv': 'CGV', 'foot.refund': 'Remboursement', 'foot.legal': 'Mentions légales',
  'foot.privacy': 'Confidentialité', 'foot.contact': 'Contact',
};

// --- ENGLISH
const en: Dict = {
  'nav.analyzer': 'Analyzer',
  'nav.projects': 'Projects',
  'nav.admin': 'Admin',
  'nav.workspace': 'Workspace',
  'nav.signout': 'Sign out',
  'nav.getAccess': 'Get access',
  'nav.connected': 'Connected',
  'nav.subtitle': 'A studio ear, in your browser',

  'home.invite': 'Drop your track.',
  'home.whisper': 'Cue listens, then tells you the one thing to fix.',
  'home.dropNow': 'let it go',
  'home.knowAlready': 'I already know',
  'home.openProjects': 'My projects',
  'home.checkMix': 'Analyze a mix',

  'an.step01': 'STEP 01 / UPLOAD',
  'an.dropTitle1': 'DROP A',
  'an.dropTitle2': 'BOUNCE',
  'an.uploadLede': 'Your track, your machine. Cue listens for a few seconds and tells you the one thing to fix first.',
  'an.whatIsIt': 'WHAT IS IT?',
  'an.dropCta': 'Drop a track or click',
  'an.dropPrivacy': 'MP3 / WAV · NOTHING LEAVES YOUR BROWSER',
  'an.knowAlready': 'Already know what is wrong?',

  'an.step02': 'STEP 02 / LISTENING',
  'an.listening': 'Cue is listening',
  'an.scanning': 'SCANNING',
  'an.stageDecode': 'decode',
  'an.stageLoudness': 'loudness',
  'an.stageTruepeak': 'true peak',
  'an.stageSpectrum': 'the fix',

  'an.errorTitle': 'COULD NOT READ',
  'an.error': 'Could not analyze this file. Try a standard WAV, MP3, or FLAC export.',
  'an.tryAnother': 'Try another file',

  'an.theOneThing': 'THE ONE THING',
  'an.walkMeThrough': 'walk me through it',
  'an.numbers': 'the numbers',
  'an.hide': 'hide',
  'an.share': 'share',
  'an.analyzeAnother': 'analyze another',
  'an.mixScore': 'mix score',
  'an.evidence': 'the numbers',
  'an.pinProject': 'pin to a project…',
  'an.pinIt': 'pin it',
  'an.saving': 'saving…',
  'an.saved': 'saved',
  'an.genreCorrect': 'wrong style?',

  'verdict.ship': 'SEND IT',
  'verdict.almost': 'ALMOST',
  'verdict.work': 'NOT YET',

  'stat.loudness': 'LOUDNESS',
  'stat.truePeak': 'TRUE PEAK',
  'stat.mono': 'MONO',

  'fix.step04': 'THE FIX',
  'fix.moreRoutes': 'more routes',
  'fix.characterLane': 'just exploring sounds? by character',
  'fix.openRoute': 'the full route',
  'fix.stepCount': 'step',
  'fix.stepOf': 'of',
  'fix.native': 'native Ableton',
  'fix.notes': 'the notes',
  'fix.closing': 'Take your track back once you’ve done that.',

  'need.low-end': 'My kick and bass are fighting',
  'need.phase': 'Things vanish in mono',
  'need.top-end': 'The top end is too harsh',
  'need.loudness': 'Too loud, or not loud enough',
  'need.healthy': 'I just want to know if it is ready',
  'need.character': 'Add character',

  'cold.question': 'What is bothering you?',
  'cold.sub': 'Pick what you hear. Cue hands you the route, not a catalog.',
  'cold.characterFooter': 'or explore character · one sound at a time',
  'cold.mustHear': 'that one I have to hear — drop your track.',
  'cold.back': '← back',
  'coldrow.low-end': 'the low (kick & bass)',
  'coldrow.phase': 'the width (mono)',
  'coldrow.top-end': 'the top (harsh / bright)',
  'coldrow.loudness': 'the volume',
  'coldrow.healthy': 'is it ready?',
  'coldtag.low-end': 'low',
  'coldtag.phase': 'phase',
  'coldtag.top-end': 'top',
  'coldtag.loudness': 'loudness',
  'coldtag.healthy': 'listen',

  'projects.title': 'what you have already heard',
  'projects.keepIt': 'keep this? — sign in.',
  'projects.empty': 'nothing yet. drop your track.',
  'projects.newProject': '+ new',

  'move.headroom': 'A true-peak limiter',
  'move.phase': 'A mono-maker / correlation tool',
  'move.top-end': 'A gentle high shelf, not a boost',
  'move.low-end': 'Carve kick and bass ownership',
  'move.loudness': 'A loudness meter you trust',
  'move.healthy': 'One trusted reference track',

  'auth.title': 'Save your tracks and let Cue remember your progress.',
  'auth.googleSub': 'One tap with Google. No password, no spam.',
  'auth.google': 'Continue with Google',
  'auth.orEmail': 'or use email',
  'auth.emailPlaceholder': 'you@email.com',
  'auth.emailCta': 'Get a link by email',
  'auth.emailSent': 'Link sent. Check your inbox.',

  'genre.deep-house': 'Deep House',
  'genre.minimal': 'Minimal',
  'genre.techno': 'Techno',
  'genre.dub-techno': 'Dub Techno',
  'genre.electro': 'Electro',
  'genre.acid': 'Acid',
  'genre.uk-garage': 'UK Garage',
  'genre.ambient': 'Ambient',
  'genre.other': 'Not sure',
  'toast.favSignin': 'Sign in to save favorites — they sync to your account.',
  'toast.favError': 'Could not update favorites. Check your connection and try again.',
  'toast.noteSaved': 'Note saved.',
  'toast.noteError': 'Note could not be saved. Check your connection.',
  'toast.recipeAdded': 'Recipe added to project.',
  'toast.recipeAddError': 'Could not add to project. Try again.',
  'toast.projectsError': 'Could not refresh projects. Check your connection.',
  'toast.projectRecipesError': 'Could not refresh project recipes.',
  'toast.signoutError': 'Sign out failed. You have been logged out locally.',
  'coach.link': 'Want Cue to say it in its own words?',
  'coach.linkSub': 'First read is on us.',
  'coach.title': 'Cue reads your verdict back',
  'coach.subtitle': 'Two or three sentences on your track, and the next move. One read costs a credit.',
  'coach.pack1': '1 credit · 1 € · to try',
  'coach.pack5': '5 credits · 4 € · 0.80 a read',
  'coach.pack12': '12 credits · 8 € · 0.67 a read, best price',
  'coach.honesty': 'Cue changes no number. It says the same thing, in words that land.',
  'coach.safety': 'Out of credits tonight? The verdict and the recipe stay, free.',
  'coach.back': 'Back to the verdict',
  'coach.reading': 'Cue is reading your track…',
  'coach.credits': 'credits',
  'coach.signin': 'Sign in to use your free read.',
  'pay.received': 'Payment received. Your credits land in a moment.',
  'pay.canceled': 'Payment canceled. You were not charged.',
  'pay.recap': 'You are buying credits for the AI coach. 1 credit = 1 read. Seller: CuePoint (Adam Chabbi). Prices incl. tax, no subscription, credits never expire.',
  'pay.waiver': 'I request immediate delivery of my credits and acknowledge I lose my right of withdrawal once a credit is used (art. L221-28, 13° French Consumer Code).',
  'pay.order': 'Order with obligation to pay',
  'pay.terms': 'See the terms and refund policy',
  'pay.tickFirst': 'Tick the box above to unlock the packs.',
  'pay.checkoutError': 'Checkout could not open. Try again in a moment — you were not charged.',
  'foot.cgv': 'Terms', 'foot.refund': 'Refunds', 'foot.legal': 'Legal notice',
  'foot.privacy': 'Privacy', 'foot.contact': 'Contact',
};

const DICTS: Record<Locale, Dict> = { fr, en };

function detectInitial(): Locale {
  // Hard-default FR (user decision). Honour a stored choice if present; never auto-detect.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* non-fatal */ }
  return 'fr';
}

// Keep <html lang> tracking the resolved locale so the markup is honest for screen
// readers / SEO (the UI is FR-default; index.html ships lang="fr", but a stored EN
// choice must update the attribute too — on first paint and on every toggle).
function syncHtmlLang(loc: Locale): void {
  try { document.documentElement.lang = loc; } catch { /* SSR/no-DOM: non-fatal */ }
}

// The exported reactive object. Mutate i18n.locale; never reassign i18n itself.
const initialLocale = detectInitial();
export const i18n = $state<{ locale: Locale }>({ locale: initialLocale });
syncHtmlLang(initialLocale);

export function setLocale(next: Locale): void {
  i18n.locale = next; // in-place mutation — safe for an exported $state object property
  syncHtmlLang(next);
  try { localStorage.setItem(STORAGE_KEY, next); } catch { /* non-fatal */ }
}

export function toggleLocale(): void {
  setLocale(i18n.locale === 'fr' ? 'en' : 'fr');
}

// t(key) reads i18n.locale, so any component using it re-renders on locale change.
// Falls back to the EN string, then the raw key, so a missing key is visible, not blank.
export function t(key: string): string {
  return DICTS[i18n.locale][key] ?? en[key] ?? key;
}
