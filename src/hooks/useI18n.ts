'use client'

import { useState, useEffect, useCallback } from 'react'

const DICT: Record<string, Record<string, string>> = {
  'nav.idx': { hu: 'FŐOLDAL', en: 'HOME', de: 'STARTSEITE', es: 'INICIO', fr: 'ACCUEIL', no: 'HJEM', sv: 'HEM' },
  'nav.prf': { hu: 'PROFIL', en: 'PROFILE', de: 'PROFIL', es: 'PERFIL', fr: 'PROFIL', no: 'PROFIL', sv: 'PROFIL' },
  'nav.ctl': { hu: 'ADMIN', en: 'ADMIN', de: 'ADMIN', es: 'ADMIN', fr: 'ADMIN', no: 'ADMIN', sv: 'ADMIN' },
  'hero.title1': { hu: 'F3XYKEE', en: 'F3XYKEE', de: 'F3XYKEE', es: 'F3XYKEE', fr: 'F3XYKEE', no: 'F3XYKEE', sv: 'F3XYKEE' },
  'hero.title2': { hu: 'BLOG', en: 'BLOG', de: 'BLOG', es: 'BLOG', fr: 'BLOG', no: 'BLOG', sv: 'BLOG' },
  'hero.sub': { hu: 'Élo blog felület · adathálózati terminál', en: 'Live blog · data network terminal', de: 'Live Blog · Datennetzwerk', es: 'Blog en vivo · red de datos', fr: 'Blog en direct · réseau de données', no: 'Live blogg · datanettverk', sv: 'Live blogg · datanätverk' },
  'post.new': { hu: 'ÚJ POSZT', en: 'NEW POST', de: 'NEUER POST', es: 'NUEVO POST', fr: 'NOUVEAU POST', no: 'NY POST', sv: 'NY POST' },
  'post.draft': { hu: 'VÁZLAT', en: 'DRAFT', de: 'ENTWURF', es: 'BORRADOR', fr: 'BROUILLON', no: 'UTKAST', sv: 'UTKAST' },
  'post.preview': { hu: 'ELŐNÉZET', en: 'PREVIEW', de: 'VORSCHAU', es: 'VISTA PREVIA', fr: 'APERÇU', no: 'FORHÅNDSVISNING', sv: 'FÖRHANDSGRANSKNING' },
  'post.publish': { hu: 'KÖZZÉTESZ', en: 'PUBLISH', de: 'VERÖFFENTLICHEN', es: 'PUBLICAR', fr: 'PUBLIER', no: 'PUBLISER', sv: 'PUBLICERA' },
  'post.text': { hu: 'SZÖVEG', en: 'TEXT', de: 'TEXT', es: 'TEXTO', fr: 'TEXTE', no: 'TEKST', sv: 'TEXT' },
  'post.image': { hu: 'KÉP', en: 'IMAGE', de: 'BILD', es: 'IMAGEN', fr: 'IMAGE', no: 'BILDE', sv: 'BILD' },
  'post.video': { hu: 'VIDEÓ', en: 'VIDEO', de: 'VIDEO', es: 'VIDEO', fr: 'VIDÉO', no: 'VIDEO', sv: 'VIDEO' },
  'post.title': { hu: 'CÍM', en: 'TITLE', de: 'TITEL', es: 'TÍTULO', fr: 'TITRE', no: 'TITTEL', sv: 'TITEL' },
  'post.body': { hu: 'TARTALOM', en: 'CONTENT', de: 'INHALT', es: 'CONTENIDO', fr: 'CONTENU', no: 'INNHOLD', sv: 'INNEHÅLL' },
  'post.tags': { hu: 'TÉMÁK', en: 'TAGS', de: 'TAGS', es: 'ETIQUETAS', fr: 'TAGS', no: 'EMNER', sv: 'TAGGAR' },
  'post.week': { hu: 'HÉT', en: 'WEEK', de: 'WOCHE', es: 'SEMANA', fr: 'SEMAINE', no: 'UKE', sv: 'VECKA' },
  'post.author': { hu: 'SZERZŐ', en: 'AUTHOR', de: 'AUTOR', es: 'AUTOR', fr: 'AUTEUR', no: 'FORFATTER', sv: 'FÖRFATTARE' },
  'post.reads': { hu: 'OLVASÁS', en: 'READS', de: 'AUFRUFE', es: 'LECTURAS', fr: 'LECTURES', no: 'LESNINGER', sv: 'LÄSNINGAR' },
  'post.likes': { hu: 'KEDVELÉS', en: 'LIKES', de: 'LIKES', es: 'ME GUSTA', fr: 'MENTIONS', no: 'LIKES', sv: 'GILLANDEN' },
  'post.comments': { hu: 'KOMMENT', en: 'COMMENTS', de: 'KOMMENTARE', es: 'COMENTARIOS', fr: 'COMMENTAIRES', no: 'KOMMENTARER', sv: 'KOMMENTARER' },
  'post.archive': { hu: 'ARCHÍVUM', en: 'ARCHIVE', de: 'ARCHIV', es: 'ARCHIVO', fr: 'ARCHIVES', no: 'ARKIV', sv: 'ARKIV' },
  'comment.placeholder': { hu: 'Írj kommentet…', en: 'Write a comment…', de: 'Kommentar schreiben…', es: 'Escribe un comentario…', fr: 'Écrire un commentaire…', no: 'Skriv en kommentar…', sv: 'Skriv en kommentar…' },
  'user.posts': { hu: 'POSZTOK', en: 'POSTS', de: 'BEITRÄGE', es: 'PUBLICACIONES', fr: 'PUBLICATIONS', no: 'INNLEGG', sv: 'INLÄGG' },
  'user.likes': { hu: 'KEDVELÉSEK', en: 'LIKES', de: 'LIKES', es: 'LIKES', fr: 'MENTIONS', no: 'LIKES', sv: 'GILLANDEN' },
  'user.chain': { hu: 'LÁNC', en: 'CHAIN', de: 'KETTE', es: 'CADENA', fr: 'CHAÎNE', no: 'KJEDE', sv: 'KEDJA' },
  'user.readers': { hu: 'OLVASÓK', en: 'READERS', de: 'LESER', es: 'LECTORES', fr: 'LECTEURS', no: 'LESERE', sv: 'LÄSARE' },
  'user.comments': { hu: 'KOMMENTEK', en: 'COMMENTS', de: 'KOMMENTARE', es: 'COMENTARIOS', fr: 'COMMENTAIRES', no: 'KOMMENTARER', sv: 'KOMMENTARER' },
  'user.month': { hu: 'HÓNAP', en: 'MONTH', de: 'MONAT', es: 'MES', fr: 'MOIS', no: 'MÅNED', sv: 'MÅNAD' },
  'user.status': { hu: 'ÁLLAPOT', en: 'STATUS', de: 'STATUS', es: 'ESTADO', fr: 'ÉTAT', no: 'STATUS', sv: 'STATUS' },
  'user.level': { hu: 'SZINT', en: 'LEVEL', de: 'LEVEL', es: 'NIVEL', fr: 'NIVEAU', no: 'NIVÅ', sv: 'NIVÅ' },
  'user.joined': { hu: 'CSATLAKOZOTT', en: 'JOINED', de: 'BEIGETRETEN', es: 'UNIDO', fr: 'REJOINT', no: 'REGISTRERT', sv: 'REGISTRERAD' },
  'user.ping': { hu: 'PING', en: 'PING', de: 'PING', es: 'PING', fr: 'PING', no: 'PING', sv: 'PING' },
  'user.throughput': { hu: 'ÁTVITEL', en: 'THROUGHPUT', de: 'DURCHSATZ', es: 'DÉBITO', fr: 'DÉBIT', no: 'GJENNOMSTRØM', sv: 'GENOMSTRÖMNING' },
  'user.loss': { hu: 'VESZTESÉG', en: 'LOSS', de: 'VERLUST', es: 'PÉRDIDA', fr: 'PERTE', no: 'TAP', sv: 'FÖRLUST' },
  'auth.login': { hu: 'BELÉPÉS', en: 'LOGIN', de: 'ANMELDEN', es: 'INICIAR', fr: 'CONNEXION', no: 'LOGG INN', sv: 'LOGGA IN' },
  'auth.register': { hu: 'REGISZTRÁCIÓ', en: 'REGISTER', de: 'REGISTRIEREN', es: 'REGISTRARSE', fr: 'INSCRIPTION', no: 'REGISTRER', sv: 'REGISTRERA' },
  'auth.recovery': { hu: 'JELSZÓ VISSZAÁLLÍTÁS', en: 'RECOVERY', de: 'WIEDERHERSTELLUNG', es: 'RECUPERACIÓN', fr: 'RÉCUPÉRATION', no: 'GJENOPPRETTING', sv: 'ÅTERSTÄLLNING' },
  'auth.username': { hu: 'FELHASZNÁLÓNÉV', en: 'USERNAME', de: 'BENUTZERNAME', es: 'NOMBRE DE USUARIO', fr: 'NOM D\'UTILISATEUR', no: 'BRUKERNAVN', sv: 'ANVÄNDARNAMN' },
  'auth.password': { hu: 'JELSZÓ', en: 'PASSWORD', de: 'PASSWORT', es: 'CONTRASEÑA', fr: 'MOT DE PASSE', no: 'PASSORD', sv: 'LÖSENORD' },
  'auth.confirm': { hu: 'MEGERŐSÍTÉS', en: 'CONFIRM', de: 'BESTÄTIGEN', es: 'CONFIRMAR', fr: 'CONFIRMER', no: 'BEKREFT', sv: 'BEKRÄFTA' },
  'auth.remember': { hu: 'EMLÉKEZZ RÁM', en: 'REMEMBER ME', de: 'ANGEMELDET BLEIBEN', es: 'RECORDARME', fr: 'SE SOUVENIR', no: 'HUSK MEG', sv: 'KOM IHÅG MIG' },
  'auth.cancel': { hu: 'MÉGSE', en: 'CANCEL', de: 'ABBRECHEN', es: 'CANCELAR', fr: 'ANNULER', no: 'AVBRYT', sv: 'AVBRYT' },
  'auth.enter': { hu: 'BELÉP', en: 'ENTER', de: 'EINTRETEN', es: 'ENTRAR', fr: 'ENTRER', no: 'GÅ INN', sv: 'GÅ IN' },
  'profile.wall': { hu: 'PROFIL FAL', en: 'PROFILE WALL', de: 'PROFIL WAND', es: 'MURO DE PERFIL', fr: 'MUR DE PROFIL', no: 'PROFIL VEGG', sv: 'PROFILVÄGG' },
  'profile.leave_msg': { hu: 'HAGYJ ÜZENETET', en: 'LEAVE A MESSAGE', de: 'NACHRICHT HINTERLASSEN', es: 'DEJA UN MENSAJE', fr: 'LAISSEZ UN MESSAGE', no: 'LEGG IGJEN MELDING', sv: 'LÄMNA MEDDELANDE' },
  'profile.friend': { hu: 'ISMERŐS', en: 'FRIEND', de: 'FREUND', es: 'AMIGO', fr: 'AMI', no: 'VENN', sv: 'VÄN' },
  'profile.pending': { hu: 'FÜGGŐBEN', en: 'PENDING', de: 'AUSSTEHEND', es: 'PENDIENTE', fr: 'EN ATTENTE', no: 'VENTER', sv: 'VÄNTAR' },
  'profile.add': { hu: 'ISMERŐS KÉRÉS', en: 'ADD FRIEND', de: 'FREUNDSCHAFT', es: 'AGREGAR', fr: 'AJOUTER', no: 'LEGG TIL', sv: 'LÄGG TILL' },
  'admin.title': { hu: 'MODERÁTORI FELÜLET', en: 'ADMIN PANEL', de: 'ADMIN PANEL', es: 'PANEL ADMIN', fr: 'PANNEAU ADMIN', no: 'ADMIN PANEL', sv: 'ADMINPANEL' },
  'admin.posts_live': { hu: 'POSZTOK · KINT', en: 'POSTS · LIVE', de: 'BEITRÄGE · LIVE', es: 'PUBLICACIONES · VIVO', fr: 'PUBLICATIONS · EN LIGNE', no: 'INNLEGG · LIVE', sv: 'INLÄGG · LIVE' },
  'admin.users_online': { hu: 'FELHASZNÁLÓK · ONLINE', en: 'USERS · ONLINE', de: 'BENUTZER · ONLINE', es: 'USUARIOS · EN LÍNEA', fr: 'UTILISATEURS · EN LIGNE', no: 'BRUKERE · ONLINE', sv: 'ANVÄNDARE · ONLINE' },
  'admin.topics_open': { hu: 'TÉMÁK · NYITOTT', en: 'TOPICS · OPEN', de: 'THEMEN · OFFEN', es: 'TEMAS · ABIERTO', fr: 'SUJETS · OUVERTS', no: 'EMNER · ÅPNE', sv: 'ÄMNEN · ÖPPNA' },
  'admin.users': { hu: 'FELHASZNÁLÓK', en: 'USERS', de: 'BENUTZER', es: 'USUARIOS', fr: 'UTILISATEURS', no: 'BRUKERE', sv: 'ANVÄNDARE' },
  'admin.log': { hu: 'ESEMÉNYNAPLÓ', en: 'EVENT LOG', de: 'EREIGNISPROTOKOLL', es: 'REGISTRO', fr: 'JOURNAL', no: 'HENDELSESLOGG', sv: 'HÄNDELSELOGG' },
}

export const LANGS = ['hu', 'en', 'de', 'es', 'fr', 'no', 'sv'] as const
export type Lang = typeof LANGS[number]

const LANG_LABELS: Record<Lang, string> = { hu: 'HU', en: 'EN', de: 'DE', es: 'ES', fr: 'FR', no: 'NO', sv: 'SV' }

let globalLang: Lang = 'hu'
const listeners = new Set<() => void>()

function getLang(): Lang {
  if (typeof window === 'undefined') return 'hu'
  return (localStorage.getItem('f3x_lang') as Lang) || 'hu'
}

export function setLang(lang: Lang) {
  globalLang = lang
  if (typeof window !== 'undefined') localStorage.setItem('f3x_lang', lang)
  listeners.forEach(fn => fn())
}

export function useI18n() {
  const [lang, setLangState] = useState<Lang>('hu')

  useEffect(() => {
    const l = getLang()
    globalLang = l
    setLangState(l)
    const fn = () => setLangState(getLang())
    listeners.add(fn)
    return () => { listeners.delete(fn) }
  }, [])

  const t = useCallback((key: string): string => {
    return DICT[key]?.[lang] ?? DICT[key]?.['hu'] ?? key
  }, [lang])

  return { t, lang, setLang, LANGS, LANG_LABELS }
}
