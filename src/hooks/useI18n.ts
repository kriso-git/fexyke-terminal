'use client'

import { useState, useEffect, useCallback } from 'react'

const DICT: Record<string, Record<string, string>> = {
  // Nav
  'nav.idx': { hu:'FŐOLDAL', en:'HOME', de:'STARTSEITE', es:'INICIO', fr:'ACCUEIL', no:'HJEM', sv:'HEM', ua:'ГОЛОВНА', ru:'ГЛАВНАЯ' },
  'nav.prf': { hu:'PROFIL', en:'PROFILE', de:'PROFIL', es:'PERFIL', fr:'PROFIL', no:'PROFIL', sv:'PROFIL', ua:'ПРОФІЛЬ', ru:'ПРОФИЛЬ' },
  'nav.ctl': { hu:'ADMIN', en:'ADMIN', de:'ADMIN', es:'ADMIN', fr:'ADMIN', no:'ADMIN', sv:'ADMIN', ua:'АДМІН', ru:'АДМИН' },
  'nav.search': { hu:'⌕ KERESÉS', en:'⌕ SEARCH', de:'⌕ SUCHE', es:'⌕ BUSCAR', fr:'⌕ RECHERCHE', no:'⌕ SØK', sv:'⌕ SÖK', ua:'⌕ ПОШУК', ru:'⌕ ПОИСК' },

  // TopBar / Footer
  'top.live': { hu:'◢ ÉLŐ BLOG FELÜLET · V0.1', en:'◢ LIVE BLOG · V0.1', de:'◢ LIVE BLOG · V0.1', es:'◢ BLOG EN VIVO · V0.1', fr:'◢ BLOG EN DIRECT · V0.1', no:'◢ LIVE BLOGG · V0.1', sv:'◢ LIVE BLOGG · V0.1' },
  'top.server': { hu:'SZERVER · BUD-01', en:'SERVER · BUD-01', de:'SERVER · BUD-01', es:'SERVIDOR · BUD-01', fr:'SERVEUR · BUD-01', no:'SERVER · BUD-01', sv:'SERVER · BUD-01' },
  'top.guest': { hu:'◯ VENDÉG', en:'◯ GUEST', de:'◯ GAST', es:'◯ INVITADO', fr:'◯ INVITÉ', no:'◯ GJEST', sv:'◯ GÄST', ua:'◯ ГІСТЬ', ru:'◯ ГОСТЬ' },
  'top.logout': { hu:'KILÉPÉS', en:'LOGOUT', de:'ABMELDEN', es:'CERRAR SESIÓN', fr:'DÉCONNEXION', no:'LOGG UT', sv:'LOGGA UT', ua:'ВИЙТИ', ru:'ВЫЙТИ' },
  'top.week': { hu:'HÉT', en:'WK', de:'KW', es:'SEM', fr:'SEM', no:'UKE', sv:'V' },
  'top.online': { hu:'ONLINE', en:'ONLINE', de:'ONLINE', es:'EN LÍNEA', fr:'EN LIGNE', no:'PÅLOGGET', sv:'ANSLUTEN', ua:'ОНЛАЙН', ru:'ОНЛАЙН' },

  // Hero
  'hero.live': { hu:'◢ ADÁSBAN', en:'◢ LIVE', de:'◢ LIVE', es:'◢ EN VIVO', fr:'◢ EN DIRECT', no:'◢ LIVE', sv:'◢ LIVE' },
  'hero.link': { hu:'KAPCSOLAT · STABIL', en:'LINK · STABLE', de:'VERBINDUNG · STABIL', es:'CONEXIÓN · ESTABLE', fr:'LIAISON · STABLE', no:'TILKOBLING · STABIL', sv:'ANSLUTNING · STABIL' },
  'hero.platform': { hu:'F3XYKEE / BLOG FELÜLET', en:'F3XYKEE / BLOG PLATFORM', de:'F3XYKEE / BLOG-PLATTFORM', es:'F3XYKEE / PLATAFORMA BLOG', fr:'F3XYKEE / PLATEFORME BLOG', no:'F3XYKEE / BLOGGPLATTFORM', sv:'F3XYKEE / BLOGGPLATTFORM' },
  'hero.sub': { hu:'Élő blog felület — posztok, videók, kommentek.', en:'Live blog — posts, videos, comments.', de:'Live-Blog — Beiträge, Videos, Kommentare.', es:'Blog en vivo — publicaciones, videos, comentarios.', fr:'Blog en direct — publications, vidéos, commentaires.', no:'Live blogg — innlegg, videoer, kommentarer.', sv:'Live blogg — inlägg, videor, kommentarer.' },
  'hero.enter': { hu:'◢ BELÉPÉS', en:'◢ ENTER', de:'◢ EINTRETEN', es:'◢ ENTRAR', fr:'◢ ENTRER', no:'◢ GÅ INN', sv:'◢ GÅ IN', ua:'◢ УВІЙТИ', ru:'◢ ВОЙТИ' },
  'hero.posts': { hu:'⌕ POSZTOK', en:'⌕ POSTS', de:'⌕ BEITRÄGE', es:'⌕ PUBLICACIONES', fr:'⌕ PUBLICATIONS', no:'⌕ INNLEGG', sv:'⌕ INLÄGG', ua:'⌕ ДОПИСИ', ru:'⌕ ПОСТЫ' },
  'hero.profile': { hu:'AKTÍV FELHASZNÁLÓ', en:'ACTIVE USER', de:'AKTIVER NUTZER', es:'USUARIO ACTIVO', fr:'UTILISATEUR ACTIF', no:'AKTIV BRUKER', sv:'AKTIV ANVÄNDARE' },
  'hero.notlogged': { hu:'NEM BEJELENTKEZETT', en:'NOT LOGGED IN', de:'NICHT ANGEMELDET', es:'NO CONECTADO', fr:'NON CONNECTÉ', no:'IKKE PÅLOGGET', sv:'INTE INLOGGAD' },

  // Post panel / kinds
  'post.new': { hu:'ÚJ POSZT', en:'NEW POST', de:'NEUER POST', es:'NUEVO POST', fr:'NOUVEAU POST', no:'NY POST', sv:'NY POST' },
  'post.create': { hu:'LÉTREHOZÁS', en:'CREATE', de:'ERSTELLEN', es:'CREAR', fr:'CRÉER', no:'OPPRETT', sv:'SKAPA' },
  'post.open': { hu:'◢ NYIT', en:'◢ OPEN', de:'◢ ÖFFNEN', es:'◢ ABRIR', fr:'◢ OUVRIR', no:'◢ ÅPNE', sv:'◢ ÖPPNA' },
  'post.close': { hu:'◢ BEZÁR', en:'◢ CLOSE', de:'◢ SCHLIESSEN', es:'◢ CERRAR', fr:'◢ FERMER', no:'◢ LUKK', sv:'◢ STÄNG' },
  'post.text': { hu:'SZÖVEG', en:'TEXT', de:'TEXT', es:'TEXTO', fr:'TEXTE', no:'TEKST', sv:'TEXT' },
  'post.image': { hu:'KÉP', en:'IMAGE', de:'BILD', es:'IMAGEN', fr:'IMAGE', no:'BILDE', sv:'BILD' },
  'post.video': { hu:'VIDEÓ', en:'VIDEO', de:'VIDEO', es:'VIDEO', fr:'VIDÉO', no:'VIDEO', sv:'VIDEO' },
  'post.title_text': { hu:'Poszt címe…', en:'Post title…', de:'Titel des Beitrags…', es:'Título de la publicación…', fr:'Titre de la publication…', no:'Innleggets tittel…', sv:'Inläggets titel…' },
  'post.title_image': { hu:'Kép felirata…', en:'Image caption…', de:'Bildunterschrift…', es:'Pie de imagen…', fr:'Légende de l\'image…', no:'Bildetekst…', sv:'Bildtext…' },
  'post.title_video': { hu:'Videó címe…', en:'Video title…', de:'Videotitel…', es:'Título del video…', fr:'Titre de la vidéo…', no:'Videotittel…', sv:'Videotitel…' },
  'post.body': { hu:'TARTALOM', en:'CONTENT', de:'INHALT', es:'CONTENIDO', fr:'CONTENU', no:'INNHOLD', sv:'INNEHÅLL' },
  'post.body_optional': { hu:'LEÍRÁS (opcionális)', en:'DESCRIPTION (optional)', de:'BESCHREIBUNG (optional)', es:'DESCRIPCIÓN (opcional)', fr:'DESCRIPTION (optionnel)', no:'BESKRIVELSE (valgfri)', sv:'BESKRIVNING (valfri)' },
  'post.body_ph': { hu:'Írd be a poszt szövegét…', en:'Write your post…', de:'Schreibe deinen Beitrag…', es:'Escribe tu publicación…', fr:'Écris ta publication…', no:'Skriv ditt innlegg…', sv:'Skriv ditt inlägg…' },
  'post.body_ph_video': { hu:'Rövid leírás…', en:'Short description…', de:'Kurze Beschreibung…', es:'Descripción breve…', fr:'Brève description…', no:'Kort beskrivelse…', sv:'Kort beskrivning…' },
  'post.tags': { hu:'# TÉMÁK', en:'# TAGS', de:'# TAGS', es:'# ETIQUETAS', fr:'# TAGS', no:'# EMNER', sv:'# TAGGAR' },
  'post.tags_ph': { hu:'#hírek, #vélemény', en:'#news, #opinion', de:'#nachrichten, #meinung', es:'#noticias, #opinion', fr:'#actu, #avis', no:'#nyheter, #mening', sv:'#nyheter, #åsikt' },
  'post.image_required': { hu:'⊡ KÉP (kötelező)', en:'⊡ IMAGE (required)', de:'⊡ BILD (erforderlich)', es:'⊡ IMAGEN (requerido)', fr:'⊡ IMAGE (requis)', no:'⊡ BILDE (påkrevd)', sv:'⊡ BILD (krävs)' },
  'post.image_optional': { hu:'⊡ KÉP VAGY ♪ HANG (opcionális)', en:'⊡ IMAGE OR ♪ AUDIO (optional)', de:'⊡ BILD ODER ♪ AUDIO (optional)', es:'⊡ IMAGEN O ♪ AUDIO (opcional)', fr:'⊡ IMAGE OU ♪ AUDIO (optionnel)', no:'⊡ BILDE ELLER ♪ LYD (valgfri)', sv:'⊡ BILD ELLER ♪ LJUD (valfri)' },
  'post.upload_hint': { hu:'⬆ Húzd ide vagy kattints · gif · jpg · png · mp3 · wav — max 100 MB', en:'⬆ Drop or click · gif · jpg · png · mp3 · wav — max 100 MB', de:'⬆ Ziehen oder klicken · gif · jpg · png · mp3 · wav — max 100 MB', es:'⬆ Arrastra o haz clic · gif · jpg · png · mp3 · wav — máx 100 MB', fr:'⬆ Glisse ou clique · gif · jpg · png · mp3 · wav — max 100 MB', no:'⬆ Slipp eller klikk · gif · jpg · png · mp3 · wav — maks 100 MB', sv:'⬆ Släpp eller klicka · gif · jpg · png · mp3 · wav — max 100 MB' },
  'post.uploading': { hu:'Feltöltés', en:'Uploading', de:'Hochladen', es:'Subiendo', fr:'Téléversement', no:'Laster opp', sv:'Laddar upp' },
  'post.caption': { hu:'Felirat (opcionális)', en:'Caption (optional)', de:'Beschriftung (optional)', es:'Leyenda (opcional)', fr:'Légende (optionnel)', no:'Tekst (valgfri)', sv:'Bildtext (valfri)' },
  'post.yt_url': { hu:'▶ YOUTUBE URL', en:'▶ YOUTUBE URL', de:'▶ YOUTUBE URL', es:'▶ URL DE YOUTUBE', fr:'▶ URL YOUTUBE', no:'▶ YOUTUBE URL', sv:'▶ YOUTUBE URL' },
  'post.meta': { hu:'◢ META', en:'◢ META', de:'◢ META', es:'◢ META', fr:'◢ META', no:'◢ META', sv:'◢ META' },
  'post.kind_label': { hu:'TÍPUS', en:'TYPE', de:'TYP', es:'TIPO', fr:'TYPE', no:'TYPE', sv:'TYP' },
  'post.author': { hu:'SZERZŐ', en:'AUTHOR', de:'AUTOR', es:'AUTOR', fr:'AUTEUR', no:'FORFATTER', sv:'FÖRFATTARE' },
  'post.video_id': { hu:'VIDEÓ ID', en:'VIDEO ID', de:'VIDEO-ID', es:'ID DE VIDEO', fr:'ID VIDÉO', no:'VIDEO-ID', sv:'VIDEO-ID' },
  'post.priority': { hu:'Kitűzés', en:'Pin', de:'Anheften', es:'Fijar', fr:'Épingler', no:'Fest', sv:'Fäst' },
  'post.draft': { hu:'VÁZLAT', en:'DRAFT', de:'ENTWURF', es:'BORRADOR', fr:'BROUILLON', no:'UTKAST', sv:'UTKAST' },
  'post.preview': { hu:'ELŐNÉZET', en:'PREVIEW', de:'VORSCHAU', es:'VISTA PREVIA', fr:'APERÇU', no:'FORHÅNDSVISNING', sv:'FÖRHANDSGRANSKNING' },
  'post.publish': { hu:'◢ KÖZZÉTESZ', en:'◢ PUBLISH', de:'◢ VERÖFFENTLICHEN', es:'◢ PUBLICAR', fr:'◢ PUBLIER', no:'◢ PUBLISER', sv:'◢ PUBLICERA' },
  'post.publishing': { hu:'Küldés…', en:'Sending…', de:'Senden…', es:'Enviando…', fr:'Envoi…', no:'Sender…', sv:'Skickar…' },
  'post.success': { hu:'✓ Sikeres!', en:'✓ Success!', de:'✓ Erfolg!', es:'✓ ¡Éxito!', fr:'✓ Succès!', no:'✓ Vellykket!', sv:'✓ Lyckades!' },
  'post.created': { hu:'◢ Poszt sikeresen létrehozva!', en:'◢ Post created successfully!', de:'◢ Beitrag erfolgreich erstellt!', es:'◢ ¡Publicación creada!', fr:'◢ Publication créée!', no:'◢ Innlegg opprettet!', sv:'◢ Inlägg skapat!' },

  // Feed
  'feed.head_tag': { hu:'◢ BEJEGYZÉSEK', en:'◢ ENTRIES', de:'◢ EINTRÄGE', es:'◢ ENTRADAS', fr:'◢ ENTRÉES', no:'◢ INNLEGG', sv:'◢ INLÄGG' },
  'feed.head_title': { hu:'POSZTOK', en:'POSTS', de:'BEITRÄGE', es:'PUBLICACIONES', fr:'PUBLICATIONS', no:'INNLEGG', sv:'INLÄGG' },
  'feed.head_sub': { hu:'Posztok, képek és videók időrendben.', en:'Posts, images and videos in chronological order.', de:'Beiträge, Bilder und Videos chronologisch.', es:'Publicaciones, imágenes y videos en orden cronológico.', fr:'Publications, images et vidéos par ordre chronologique.', no:'Innlegg, bilder og videoer i kronologisk rekkefølge.', sv:'Inlägg, bilder och videor i kronologisk ordning.' },
  'feed.all': { hu:'MIND', en:'ALL', de:'ALLE', es:'TODO', fr:'TOUT', no:'ALLE', sv:'ALLA' },
  'feed.empty': { hu:'Még nincsenek bejegyzések.', en:'No entries yet.', de:'Noch keine Einträge.', es:'No hay entradas todavía.', fr:'Aucune entrée pour le moment.', no:'Ingen innlegg ennå.', sv:'Inga inlägg ännu.' },
  'feed.no_match': { hu:'Nincs találat a szűrőre.', en:'No results for filter.', de:'Keine Ergebnisse für Filter.', es:'Sin resultados para el filtro.', fr:'Aucun résultat pour ce filtre.', no:'Ingen resultater for filter.', sv:'Inga resultat för filter.' },

  // Post card
  'card.reads': { hu:'OLVASÁS', en:'READS', de:'AUFRUFE', es:'LECTURAS', fr:'LECTURES', no:'LESNINGER', sv:'LÄSNINGAR' },
  'card.likes': { hu:'KEDVELÉS', en:'LIKES', de:'GEFÄLLT MIR', es:'ME GUSTA', fr:'MENTIONS', no:'LIKES', sv:'GILLANDEN' },
  'card.open': { hu:'↗ MEGNYITÁS', en:'↗ OPEN', de:'↗ ÖFFNEN', es:'↗ ABRIR', fr:'↗ OUVRIR', no:'↗ ÅPNE', sv:'↗ ÖPPNA' },
  'card.delete': { hu:'◢ TÖRLÉS', en:'◢ DELETE', de:'◢ LÖSCHEN', es:'◢ ELIMINAR', fr:'◢ SUPPRIMER', no:'◢ SLETT', sv:'◢ RADERA' },
  'card.featured': { hu:'KITŰZÖTT', en:'PINNED', de:'ANGEHEFTET', es:'FIJADO', fr:'ÉPINGLÉ', no:'FESTET', sv:'FÄST' },
  'card.pin':       { hu:'KITŰZ', en:'PIN', de:'ANHEFTEN', es:'FIJAR', fr:'ÉPINGLER', no:'FEST', sv:'FÄST' },
  'card.unpin':     { hu:'LEVESZ', en:'UNPIN', de:'LÖSEN', es:'DESFIJAR', fr:'DÉSÉPINGLER', no:'LØSNE', sv:'AVFÄST' },
  'card.author': { hu:'SZERZŐ', en:'AUTHOR', de:'AUTOR', es:'AUTOR', fr:'AUTEUR', no:'FORFATTER', sv:'FÖRFATTARE' },
  'card.confirm_delete': { hu:'Biztosan törlöd?', en:'Are you sure you want to delete?', de:'Wirklich löschen?', es:'¿Eliminar de verdad?', fr:'Vraiment supprimer?', no:'Slett helt sikkert?', sv:'Verkligen radera?' },

  // Comment composer
  'comment.placeholder': { hu:'Írj kommentet…', en:'Write a comment…', de:'Kommentar schreiben…', es:'Escribe un comentario…', fr:'Écrire un commentaire…', no:'Skriv en kommentar…', sv:'Skriv en kommentar…' },
  'comment.attach': { hu:'Kép csatolása', en:'Attach image', de:'Bild anhängen', es:'Adjuntar imagen', fr:'Joindre une image', no:'Legg ved bilde', sv:'Bifoga bild' },

  // Archive
  'archive.tag': { hu:'◢ ARCHÍVUM', en:'◢ ARCHIVE', de:'◢ ARCHIV', es:'◢ ARCHIVO', fr:'◢ ARCHIVES', no:'◢ ARKIV', sv:'◢ ARKIV' },
  'archive.title': { hu:'HETI VISSZATEKINTŐ', en:'WEEKLY DIGEST', de:'WOCHENRÜCKBLICK', es:'REPASO SEMANAL', fr:'RÉCAPITULATIF HEBDO', no:'UKENS OVERSIKT', sv:'VECKOÖVERSIKT' },
  'archive.sub': { hu:'Posztok hetek szerint csoportosítva.', en:'Posts grouped by week.', de:'Beiträge nach Woche gruppiert.', es:'Publicaciones agrupadas por semana.', fr:'Publications regroupées par semaine.', no:'Innlegg gruppert etter uke.', sv:'Inlägg grupperade per vecka.' },
  'archive.week': { hu:'HÉT', en:'WEEK', de:'WOCHE', es:'SEMANA', fr:'SEMAINE', no:'UKE', sv:'VECKA' },
  'archive.posts': { hu:'POSZTOK', en:'POSTS', de:'BEITRÄGE', es:'PUBLICACIONES', fr:'PUBLICATIONS', no:'INNLEGG', sv:'INLÄGG' },
  'archive.videos': { hu:'VIDEÓK', en:'VIDEOS', de:'VIDEOS', es:'VIDEOS', fr:'VIDÉOS', no:'VIDEOER', sv:'VIDEOR' },
  'archive.top': { hu:'TOP POSZT', en:'TOP POST', de:'TOP-BEITRAG', es:'PUBLICACIÓN TOP', fr:'TOP PUBLICATION', no:'TOPP INNLEGG', sv:'TOPP INLÄGG' },

  // Profile
  'profile.wall': { hu:'◢ PROFIL FAL', en:'◢ PROFILE WALL', de:'◢ PROFILWAND', es:'◢ MURO DE PERFIL', fr:'◢ MUR DE PROFIL', no:'◢ PROFILVEGG', sv:'◢ PROFILVÄGG' },
  'profile.leave_msg': { hu:'HAGYJ ÜZENETET', en:'LEAVE A MESSAGE', de:'NACHRICHT HINTERLASSEN', es:'DEJA UN MENSAJE', fr:'LAISSE UN MESSAGE', no:'LEGG IGJEN MELDING', sv:'LÄMNA ETT MEDDELANDE' },
  'profile.msg_count': { hu:'ÜZENET', en:'MESSAGES', de:'NACHRICHTEN', es:'MENSAJES', fr:'MESSAGES', no:'MELDINGER', sv:'MEDDELANDEN' },
  'profile.msg_ph': { hu:'Írj üzenetet a profilra…', en:'Write a message on the profile…', de:'Nachricht ins Profil schreiben…', es:'Escribe un mensaje en el perfil…', fr:'Écris un message sur le profil…', no:'Skriv en melding på profilen…', sv:'Skriv ett meddelande på profilen…' },
  'profile.send': { hu:'◢ ALÁÍR + KÜLD', en:'◢ SIGN + SEND', de:'◢ SIGNIEREN + SENDEN', es:'◢ FIRMAR + ENVIAR', fr:'◢ SIGNER + ENVOYER', no:'◢ SIGNER + SEND', sv:'◢ SIGNERA + SKICKA' },
  'profile.sending': { hu:'◢ KÜLDÉS…', en:'◢ SENDING…', de:'◢ SENDEN…', es:'◢ ENVIANDO…', fr:'◢ ENVOI…', no:'◢ SENDER…', sv:'◢ SKICKAR…' },
  'profile.sent': { hu:'◢ Üzenet elküldve!', en:'◢ Message sent!', de:'◢ Nachricht gesendet!', es:'◢ ¡Mensaje enviado!', fr:'◢ Message envoyé!', no:'◢ Melding sendt!', sv:'◢ Meddelande skickat!' },
  'profile.as': { hu:'MINT', en:'AS', de:'ALS', es:'COMO', fr:'EN TANT QUE', no:'SOM', sv:'SOM' },
  'profile.attach_img': { hu:'⊡ KÉP', en:'⊡ IMAGE', de:'⊡ BILD', es:'⊡ IMAGEN', fr:'⊡ IMAGE', no:'⊡ BILDE', sv:'⊡ BILD' },
  'profile.login_for_msg': { hu:'üzenet küldéséhez', en:'to send a message', de:'um eine Nachricht zu senden', es:'para enviar un mensaje', fr:'pour envoyer un message', no:'for å sende melding', sv:'för att skicka meddelande' },
  'profile.no_bio': { hu:'Nincs bemutatkozó szöveg.', en:'No bio.', de:'Keine Biografie.', es:'Sin biografía.', fr:'Pas de bio.', no:'Ingen bio.', sv:'Ingen bio.' },
  'profile.edit': { hu:'PROFIL SZERKESZTÉSE', en:'EDIT PROFILE', de:'PROFIL BEARBEITEN', es:'EDITAR PERFIL', fr:'MODIFIER PROFIL', no:'REDIGER PROFIL', sv:'REDIGERA PROFIL' },
  'profile.bio_ph': { hu:'Bemutatkozó szöveg…', en:'Bio…', de:'Biografie…', es:'Biografía…', fr:'Bio…', no:'Bio…', sv:'Bio…' },
  'profile.cancel': { hu:'MÉGSE', en:'CANCEL', de:'ABBRECHEN', es:'CANCELAR', fr:'ANNULER', no:'AVBRYT', sv:'AVBRYT' },
  'profile.save': { hu:'◢ MENTÉS', en:'◢ SAVE', de:'◢ SPEICHERN', es:'◢ GUARDAR', fr:'◢ ENREGISTRER', no:'◢ LAGRE', sv:'◢ SPARA' },
  'profile.saving': { hu:'◢ MENTÉS…', en:'◢ SAVING…', de:'◢ SPEICHERN…', es:'◢ GUARDANDO…', fr:'◢ ENREGISTREMENT…', no:'◢ LAGRER…', sv:'◢ SPARAR…' },
  'profile.saved': { hu:'◢ Profil mentve!', en:'◢ Profile saved!', de:'◢ Profil gespeichert!', es:'◢ ¡Perfil guardado!', fr:'◢ Profil enregistré!', no:'◢ Profil lagret!', sv:'◢ Profil sparad!' },
  'profile.avatar_change': { hu:'◢ AVATAR CSERE', en:'◢ CHANGE AVATAR', de:'◢ AVATAR ÄNDERN', es:'◢ CAMBIAR AVATAR', fr:'◢ CHANGER AVATAR', no:'◢ BYTT AVATAR', sv:'◢ BYT AVATAR' },
  'profile.avatar_uploading': { hu:'◢ FELTÖLTÉS…', en:'◢ UPLOADING…', de:'◢ HOCHLADEN…', es:'◢ SUBIENDO…', fr:'◢ TÉLÉVERSEMENT…', no:'◢ LASTER OPP…', sv:'◢ LADDAR UPP…' },
  'profile.user_search': { hu:'⌕ Felhasználó keresése…', en:'⌕ Search user…', de:'⌕ Benutzer suchen…', es:'⌕ Buscar usuario…', fr:'⌕ Rechercher utilisateur…', no:'⌕ Søk bruker…', sv:'⌕ Sök användare…' },

  // Profile labels
  'profile.id': { hu:'AZONOSÍTÓ', en:'IDENTIFIER', de:'KENNUNG', es:'IDENTIFICADOR', fr:'IDENTIFIANT', no:'ID', sv:'ID' },
  'profile.data': { hu:'ADATOK', en:'DATA', de:'DATEN', es:'DATOS', fr:'DONNÉES', no:'DATA', sv:'DATA' },
  'profile.name': { hu:'NÉV', en:'NAME', de:'NAME', es:'NOMBRE', fr:'NOM', no:'NAVN', sv:'NAMN' },
  'profile.level_label': { hu:'SZINT', en:'LEVEL', de:'STUFE', es:'NIVEL', fr:'NIVEAU', no:'NIVÅ', sv:'NIVÅ' },
  'profile.joined': { hu:'CSATLAKOZOTT', en:'JOINED', de:'BEIGETRETEN', es:'UNIDO', fr:'REJOINT', no:'BLE MED', sv:'GICK MED' },
  'profile.topics': { hu:'ÉRDEKLŐDÉSI KÖR', en:'INTERESTS', de:'INTERESSEN', es:'INTERESES', fr:'INTÉRÊTS', no:'INTERESSER', sv:'INTRESSEN' },
  'profile.network': { hu:'KAPCSOLATOK', en:'CONNECTIONS', de:'VERBINDUNGEN', es:'CONEXIONES', fr:'CONNEXIONS', no:'TILKOBLINGER', sv:'KONTAKTER' },
  'profile.no_friends': { hu:'Még nincsenek ismerősök.', en:'No friends yet.', de:'Noch keine Freunde.', es:'Aún sin amigos.', fr:'Pas encore d\'amis.', no:'Ingen venner ennå.', sv:'Inga vänner än.' },
  'profile.incoming': { hu:'BEJÖVŐ', en:'INCOMING', de:'EINGEHEND', es:'ENTRANTES', fr:'ENTRANTES', no:'INNGÅENDE', sv:'INKOMMANDE' },
  'profile.requests': { hu:'KÉRÉSEK', en:'REQUESTS', de:'ANFRAGEN', es:'SOLICITUDES', fr:'DEMANDES', no:'FORESPØRSLER', sv:'FÖRFRÅGNINGAR' },
  'profile.metrics': { hu:'METRIKÁK', en:'METRICS', de:'METRIKEN', es:'MÉTRICAS', fr:'MÉTRIQUES', no:'STATISTIKK', sv:'STATISTIK' },
  'profile.stats': { hu:'◢ STATISZTIKA', en:'◢ STATS', de:'◢ STATISTIK', es:'◢ ESTADÍSTICAS', fr:'◢ STATS', no:'◢ STATISTIKK', sv:'◢ STATISTIK' },
  'profile.next_lvl': { hu:'KÖV. SZINT', en:'NEXT LVL', de:'NÄCHSTE STUFE', es:'SIG. NIVEL', fr:'NIV. SUIV.', no:'NESTE NIVÅ', sv:'NÄSTA NIVÅ' },
  'profile.activity': { hu:'◢ AKTIVITÁS · 30 NAP', en:'◢ ACTIVITY · 30 DAYS', de:'◢ AKTIVITÄT · 30 TAGE', es:'◢ ACTIVIDAD · 30 DÍAS', fr:'◢ ACTIVITÉ · 30 JOURS', no:'◢ AKTIVITET · 30 DAGER', sv:'◢ AKTIVITET · 30 DAGAR' },
  'profile.posts': { hu:'POSZTOK', en:'POSTS', de:'BEITRÄGE', es:'PUBLICACIONES', fr:'PUBLICATIONS', no:'INNLEGG', sv:'INLÄGG' },
  'profile.friend_count': { hu:'ISMERŐS', en:'FRIENDS', de:'FREUNDE', es:'AMIGOS', fr:'AMIS', no:'VENNER', sv:'VÄNNER' },
  'profile.chain': { hu:'LÁNC', en:'CHAIN', de:'KETTE', es:'CADENA', fr:'CHAÎNE', no:'KJEDE', sv:'KEDJA' },
  'profile.readers': { hu:'OLVASÓK', en:'READERS', de:'LESER', es:'LECTORES', fr:'LECTEURS', no:'LESERE', sv:'LÄSARE' },
  'profile.comments': { hu:'KOMMENTEK', en:'COMMENTS', de:'KOMMENTARE', es:'COMENTARIOS', fr:'COMMENTAIRES', no:'KOMMENTARER', sv:'KOMMENTARER' },
  'profile.month': { hu:'HÓNAP', en:'MONTH', de:'MONAT', es:'MES', fr:'MOIS', no:'MÅNED', sv:'MÅNAD' },
  'profile.role_super': { hu:'SUPERADMIN', en:'SUPERADMIN', de:'SUPERADMIN', es:'SUPERADMIN', fr:'SUPERADMIN', no:'SUPERADMIN', sv:'SUPERADMIN' },
  'profile.role_admin': { hu:'ADMIN', en:'ADMIN', de:'ADMIN', es:'ADMIN', fr:'ADMIN', no:'ADMIN', sv:'ADMIN' },
  'profile.role_user': { hu:'TAG', en:'MEMBER', de:'MITGLIED', es:'MIEMBRO', fr:'MEMBRE', no:'MEDLEM', sv:'MEDLEM' },

  // Friend states
  'friend.request': { hu:'◢ ISMERŐS KÉRÉS', en:'◢ ADD FRIEND', de:'◢ FREUND HINZUFÜGEN', es:'◢ AGREGAR AMIGO', fr:'◢ AJOUTER AMI', no:'◢ LEGG TIL VENN', sv:'◢ LÄGG TILL VÄN' },
  'friend.pending': { hu:'FÜGGŐBEN', en:'PENDING', de:'AUSSTEHEND', es:'PENDIENTE', fr:'EN ATTENTE', no:'VENTER', sv:'VÄNTAR' },
  'friend.cancel': { hu:'MÉGSE', en:'CANCEL', de:'ABBRECHEN', es:'CANCELAR', fr:'ANNULER', no:'AVBRYT', sv:'AVBRYT' },
  'friend.incoming': { hu:'BEJÖVŐ KÉRÉS', en:'INCOMING REQUEST', de:'EINGEHENDE ANFRAGE', es:'SOLICITUD ENTRANTE', fr:'DEMANDE REÇUE', no:'INNGÅENDE FORESPØRSEL', sv:'INKOMMANDE FÖRFRÅGAN' },
  'friend.accept': { hu:'◢ ELFOGAD', en:'◢ ACCEPT', de:'◢ ANNEHMEN', es:'◢ ACEPTAR', fr:'◢ ACCEPTER', no:'◢ AKSEPTER', sv:'◢ ACCEPTERA' },
  'friend.reject': { hu:'ELUTASÍT', en:'REJECT', de:'ABLEHNEN', es:'RECHAZAR', fr:'REFUSER', no:'AVVIS', sv:'AVVISA' },
  'friend.is_friend': { hu:'ISMERŐS', en:'FRIEND', de:'FREUND', es:'AMIGO', fr:'AMI', no:'VENN', sv:'VÄN' },
  'friend.remove': { hu:'ELTÁVOLÍT', en:'REMOVE', de:'ENTFERNEN', es:'ELIMINAR', fr:'RETIRER', no:'FJERN', sv:'TA BORT' },

  // Auth
  'auth.login': { hu:'BELÉPÉS', en:'LOGIN', de:'ANMELDEN', es:'INICIAR SESIÓN', fr:'CONNEXION', no:'LOGG INN', sv:'LOGGA IN', ua:'УВІЙТИ', ru:'ВХОД' },
  'auth.register': { hu:'REGISZTRÁCIÓ', en:'REGISTER', de:'REGISTRIEREN', es:'REGISTRARSE', fr:'INSCRIPTION', no:'REGISTRER', sv:'REGISTRERA', ua:'РЕЄСТРАЦІЯ', ru:'РЕГИСТРАЦИЯ' },
  'auth.recovery': { hu:'JELSZÓ VISSZAÁLLÍTÁS', en:'PASSWORD RECOVERY', de:'PASSWORT WIEDERHERSTELLEN', es:'RECUPERAR CONTRASEÑA', fr:'RÉCUP. MOT DE PASSE', no:'GLEMT PASSORD', sv:'ÅTERSTÄLL LÖSENORD', ua:'ВІДНОВИТИ ПАРОЛЬ', ru:'ВОССТАНОВИТЬ ПАРОЛЬ' },
  'auth.username': { hu:'◢ FELHASZNÁLÓNÉV', en:'◢ USERNAME', de:'◢ BENUTZERNAME', es:'◢ NOMBRE', fr:'◢ NOM D\'UTILISATEUR', no:'◢ BRUKERNAVN', sv:'◢ ANVÄNDARNAMN' },
  'auth.password': { hu:'◢ JELSZÓ', en:'◢ PASSWORD', de:'◢ PASSWORT', es:'◢ CONTRASEÑA', fr:'◢ MOT DE PASSE', no:'◢ PASSORD', sv:'◢ LÖSENORD' },
  'auth.password_confirm': { hu:'◢ JELSZÓ MEGERŐSÍTÉSE', en:'◢ CONFIRM PASSWORD', de:'◢ PASSWORT BESTÄTIGEN', es:'◢ CONFIRMAR CONTRASEÑA', fr:'◢ CONFIRMER MOT DE PASSE', no:'◢ BEKREFT PASSORD', sv:'◢ BEKRÄFTA LÖSENORD' },
  'auth.remember': { hu:'EMLÉKEZZ RÁM', en:'REMEMBER ME', de:'ANGEMELDET BLEIBEN', es:'RECORDARME', fr:'SE SOUVENIR', no:'HUSK MEG', sv:'KOM IHÅG MIG' },
  'auth.forgot': { hu:'Elfelejtett jelszó?', en:'Forgot password?', de:'Passwort vergessen?', es:'¿Olvidó la contraseña?', fr:'Mot de passe oublié?', no:'Glemt passord?', sv:'Glömt lösenordet?' },
  'auth.cancel': { hu:'MÉGSE', en:'CANCEL', de:'ABBRECHEN', es:'CANCELAR', fr:'ANNULER', no:'AVBRYT', sv:'AVBRYT' },
  'auth.enter': { hu:'◢ BELÉPÉS', en:'◢ ENTER', de:'◢ EINTRETEN', es:'◢ ENTRAR', fr:'◢ ENTRER', no:'◢ GÅ INN', sv:'◢ GÅ IN' },
  'auth.entering': { hu:'◢ AZONOSÍTÁS…', en:'◢ AUTHENTICATING…', de:'◢ AUTHENTIFIZIERUNG…', es:'◢ AUTENTICANDO…', fr:'◢ AUTHENTIFICATION…', no:'◢ AUTENTISERER…', sv:'◢ AUTENTISERAR…' },
  'auth.success': { hu:'◢ SIKERES…', en:'◢ SUCCESS…', de:'◢ ERFOLG…', es:'◢ ÉXITO…', fr:'◢ SUCCÈS…', no:'◢ VELLYKKET…', sv:'◢ LYCKADES…' },
  'auth.create': { hu:'◢ FIÓK LÉTREHOZÁSA', en:'◢ CREATE ACCOUNT', de:'◢ KONTO ERSTELLEN', es:'◢ CREAR CUENTA', fr:'◢ CRÉER UN COMPTE', no:'◢ OPPRETT KONTO', sv:'◢ SKAPA KONTO' },
  'auth.creating': { hu:'◢ REGISZTRÁCIÓ…', en:'◢ REGISTERING…', de:'◢ REGISTRIEREN…', es:'◢ REGISTRANDO…', fr:'◢ INSCRIPTION…', no:'◢ REGISTRERER…', sv:'◢ REGISTRERAR…' },
  'auth.created': { hu:'◢ LÉTREHOZVA…', en:'◢ CREATED…', de:'◢ ERSTELLT…', es:'◢ CREADA…', fr:'◢ CRÉÉ…', no:'◢ OPPRETTET…', sv:'◢ SKAPAD…' },
  'auth.login_success': { hu:'◢ AZONOSÍTÁS SIKERES · ÁTIRÁNYÍTÁS...', en:'◢ AUTH SUCCESS · REDIRECTING...', de:'◢ ANMELDUNG ERFOLGREICH · WEITERLEITUNG...', es:'◢ ÉXITO · REDIRIGIENDO...', fr:'◢ SUCCÈS · REDIRECTION...', no:'◢ VELLYKKET · OMDIRIGERER...', sv:'◢ LYCKADES · OMDIRIGERAR...' },
  'auth.register_success': { hu:'◢ FIÓK LÉTREHOZVA · ÁTIRÁNYÍTÁS...', en:'◢ ACCOUNT CREATED · REDIRECTING...', de:'◢ KONTO ERSTELLT · WEITERLEITUNG...', es:'◢ CUENTA CREADA · REDIRIGIENDO...', fr:'◢ COMPTE CRÉÉ · REDIRECTION...', no:'◢ KONTO OPPRETTET · OMDIRIGERER...', sv:'◢ KONTO SKAPAT · OMDIRIGERAR...' },
  'auth.required': { hu:'◢ BELÉPÉS SZÜKSÉGES', en:'◢ LOGIN REQUIRED', de:'◢ ANMELDUNG ERFORDERLICH', es:'◢ INICIO REQUERIDO', fr:'◢ CONNEXION REQUISE', no:'◢ INNLOGGING KREVES', sv:'◢ INLOGGNING KRÄVS' },
  'auth.intro': { hu:'A F3XYKEE blog felülete regisztrált felhasználók számára érhető el. Lépj be vagy hozz létre fiókot.', en:'The F3XYKEE blog is for registered users. Log in or create an account.', de:'Der F3XYKEE-Blog ist nur für registrierte Nutzer. Melde dich an oder registriere dich.', es:'El blog F3XYKEE es para usuarios registrados. Inicia sesión o crea una cuenta.', fr:'Le blog F3XYKEE est réservé aux membres. Connecte-toi ou crée un compte.', no:'F3XYKEE-bloggen er for registrerte brukere. Logg inn eller opprett konto.', sv:'F3XYKEE-bloggen är för registrerade användare. Logga in eller skapa konto.' },
  'auth.gate_log': { hu:'UTOLSÓ BELÉPÉSEK', en:'RECENT LOGINS', de:'LETZTE ANMELDUNGEN', es:'INICIOS RECIENTES', fr:'CONNEXIONS RÉCENTES', no:'SISTE INNLOGGINGER', sv:'SENASTE INLOGGNINGAR' },
  'auth.recovery_warn': { hu:'A jelszó visszaállítás funkció fejlesztés alatt. Kérjük, lépj kapcsolatba az adminisztrátorral.', en:'Password recovery is under development. Please contact an admin.', de:'Passwort-Wiederherstellung in Entwicklung. Bitte Admin kontaktieren.', es:'Recuperación en desarrollo. Contacta a un admin.', fr:'Récupération en développement. Contacte un admin.', no:'Glemt passord under utvikling. Kontakt admin.', sv:'Återställning utvecklas. Kontakta admin.' },

  // Lang picker label
  'lang.label': { hu:'NYELV', en:'LANG', de:'SPRACHE', es:'IDIOMA', fr:'LANGUE', no:'SPRÅK', sv:'SPRÅK' },

  // Share
  'share.label': { hu:'MEGOSZTÁS', en:'SHARE', de:'TEILEN', es:'COMPARTIR', fr:'PARTAGER', no:'DEL', sv:'DELA', ua:'ПОДІЛИТИСЯ', ru:'ПОДЕЛИТЬСЯ' },
  'share.copied': { hu:'LINK MÁSOLVA', en:'LINK COPIED', de:'LINK KOPIERT', es:'ENLACE COPIADO', fr:'LIEN COPIÉ', no:'LENKE KOPIERT', sv:'LÄNK KOPIERAD', ua:'ПОСИЛАННЯ СКОПІЙОВАНО', ru:'ССЫЛКА СКОПИРОВАНА' },

  // Admin / Moderator panel
  'admin.banner': { hu:'MODERÁTORI FELÜLET · {NAME} · MINDEN MŰVELET NAPLÓZVA', en:'MODERATOR PANEL · {NAME} · ALL ACTIONS LOGGED', de:'MODERATOR-PANEL · {NAME} · ALLE AKTIONEN PROTOKOLLIERT', es:'PANEL DE MODERADOR · {NAME} · ACCIONES REGISTRADAS', fr:'PANNEAU MODÉRATEUR · {NAME} · ACTIONS JOURNALISÉES', no:'MODERATORPANEL · {NAME} · ALLE HANDLINGER LOGGFØRES', sv:'MODERATORPANEL · {NAME} · ALLA ÅTGÄRDER LOGGAS', ua:'ПАНЕЛЬ МОДЕРАТОРА · {NAME} · ВСІ ДІЇ ЗАПИСУЮТЬСЯ', ru:'ПАНЕЛЬ МОДЕРАТОРА · {NAME} · ВСЕ ДЕЙСТВИЯ ЗАПИСЫВАЮТСЯ' },
  'admin.head_tag': { hu:'◢ IRÁNYÍTÁS · CTL-01', en:'◢ CONTROL · CTL-01', de:'◢ STEUERUNG · CTL-01', es:'◢ CONTROL · CTL-01', fr:'◢ CONTRÔLE · CTL-01', no:'◢ KONTROLL · CTL-01', sv:'◢ KONTROLL · CTL-01', ua:'◢ УПРАВЛІННЯ · CTL-01', ru:'◢ УПРАВЛЕНИЕ · CTL-01' },
  'admin.head_title': { hu:'MODERÁTORI FELÜLET', en:'MODERATOR PANEL', de:'MODERATOR-PANEL', es:'PANEL DE MODERADOR', fr:'PANNEAU MODÉRATEUR', no:'MODERATORPANEL', sv:'MODERATORPANEL', ua:'ПАНЕЛЬ МОДЕРАТОРА', ru:'ПАНЕЛЬ МОДЕРАТОРА' },
  'admin.system_stable': { hu:'RENDSZER · STABIL', en:'SYSTEM · STABLE', de:'SYSTEM · STABIL', es:'SISTEMA · ESTABLE', fr:'SYSTÈME · STABLE', no:'SYSTEM · STABILT', sv:'SYSTEM · STABILT', ua:'СИСТЕМА · СТАБІЛЬНА', ru:'СИСТЕМА · СТАБИЛЬНА' },
  'admin.cleanup': { hu:'◢ PLACEHOLDER TISZTÍTÁS', en:'◢ CLEAN PLACEHOLDERS', de:'◢ PLATZHALTER LÖSCHEN', es:'◢ LIMPIAR MARCADORES', fr:'◢ NETTOYER PLACEHOLDERS', no:'◢ FJERN PLACEHOLDERS', sv:'◢ RENSA PLATSHÅLLARE', ua:'◢ ОЧИСТИТИ ЗАГЛУШКИ', ru:'◢ ОЧИСТИТЬ ЗАГЛУШКИ' },
  'admin.cleanup_progress': { hu:'◢ TÖRLÉS…', en:'◢ DELETING…', de:'◢ LÖSCHEN…', es:'◢ ELIMINANDO…', fr:'◢ SUPPRESSION…', no:'◢ SLETTER…', sv:'◢ TAR BORT…', ua:'◢ ВИДАЛЕННЯ…', ru:'◢ УДАЛЕНИЕ…' },
  'admin.cleanup_confirm': { hu:'Töröljünk minden auth-azonosító nélküli (seed/placeholder) felhasználót és tartalmaikat? Ez nem visszafordítható.', en:'Delete all users without an auth ID (seed/placeholder accounts) and their content? This is irreversible.', de:'Alle Benutzer ohne Auth-ID (Seed/Platzhalter) und deren Inhalte löschen? Unumkehrbar.', es:'¿Eliminar todos los usuarios sin ID de auth (placeholder) y su contenido? Es irreversible.', fr:'Supprimer tous les utilisateurs sans ID d\'auth (placeholder) et leur contenu? Irréversible.', no:'Slett alle brukere uten auth-ID (placeholder) og deres innhold? Ugjenkallelig.', sv:'Ta bort alla användare utan auth-ID (platshållare) och deras innehåll? Oåterkalleligt.', ua:'Видалити всіх користувачів без auth ID та їх контент? Незворотно.', ru:'Удалить всех пользователей без auth ID и их контент? Необратимо.' },
  'admin.cleanup_done': { hu:'◢ Törölve: {N} placeholder fiók.', en:'◢ Deleted: {N} placeholder accounts.', de:'◢ Gelöscht: {N} Platzhalter-Konten.', es:'◢ Eliminadas: {N} cuentas placeholder.', fr:'◢ Supprimés: {N} comptes placeholder.', no:'◢ Slettet: {N} placeholder-kontoer.', sv:'◢ Raderade: {N} platshållarkonton.', ua:'◢ Видалено: {N} облікових записів-заглушок.', ru:'◢ Удалено: {N} учётных записей-заглушек.' },

  'admin.tab_overview': { hu:'ÁTTEKINTÉS', en:'OVERVIEW', de:'ÜBERSICHT', es:'RESUMEN', fr:'APERÇU', no:'OVERSIKT', sv:'ÖVERSIKT', ua:'ОГЛЯД', ru:'ОБЗОР' },
  'admin.tab_users': { hu:'FELHASZNÁLÓK', en:'USERS', de:'BENUTZER', es:'USUARIOS', fr:'UTILISATEURS', no:'BRUKERE', sv:'ANVÄNDARE', ua:'КОРИСТУВАЧІ', ru:'ПОЛЬЗОВАТЕЛИ' },
  'admin.tab_posts': { hu:'POSZTOK', en:'POSTS', de:'BEITRÄGE', es:'PUBLICACIONES', fr:'PUBLICATIONS', no:'INNLEGG', sv:'INLÄGG', ua:'ДОПИСИ', ru:'ПОСТЫ' },
  'admin.tab_log': { hu:'NAPLÓ', en:'LOG', de:'PROTOKOLL', es:'REGISTRO', fr:'JOURNAL', no:'LOGG', sv:'LOGG', ua:'ЖУРНАЛ', ru:'ЖУРНАЛ' },

  'admin.kpi_posts_total': { hu:'POSZTOK · ÖSSZESEN', en:'POSTS · TOTAL', de:'BEITRÄGE · GESAMT', es:'PUBLICACIONES · TOTAL', fr:'PUBLICATIONS · TOTAL', no:'INNLEGG · TOTAL', sv:'INLÄGG · TOTALT', ua:'ДОПИСИ · УСЬОГО', ru:'ПОСТЫ · ВСЕГО' },
  'admin.kpi_posts_hint': { hu:'rendszerben', en:'in system', de:'im System', es:'en el sistema', fr:'dans le système', no:'i systemet', sv:'i systemet', ua:'у системі', ru:'в системе' },
  'admin.kpi_users_real': { hu:'FELHASZNÁLÓK · VALÓS', en:'USERS · REAL', de:'BENUTZER · ECHT', es:'USUARIOS · REALES', fr:'UTILISATEURS · RÉELS', no:'BRUKERE · EKTE', sv:'ANVÄNDARE · RIKTIGA', ua:'КОРИСТУВАЧІ · СПРАВЖНІ', ru:'ПОЛЬЗОВАТЕЛИ · РЕАЛЬНЫЕ' },
  'admin.kpi_users_clean': { hu:'tiszta', en:'clean', de:'sauber', es:'limpio', fr:'propre', no:'rent', sv:'rent', ua:'чисто', ru:'чисто' },
  'admin.kpi_users_placeholder': { hu:'{N} placeholder', en:'{N} placeholder', de:'{N} Platzhalter', es:'{N} placeholder', fr:'{N} placeholder', no:'{N} placeholder', sv:'{N} platshållare', ua:'{N} заглушок', ru:'{N} заглушек' },
  'admin.kpi_total_xp': { hu:'ÖSSZES XP', en:'TOTAL XP', de:'GESAMT-XP', es:'XP TOTAL', fr:'XP TOTAL', no:'TOTAL XP', sv:'TOTAL XP', ua:'ВСЬОГО XP', ru:'ВСЕГО XP' },
  'admin.kpi_xp_hint': { hu:'rendszer aktivitás', en:'system activity', de:'Systemaktivität', es:'actividad del sistema', fr:'activité système', no:'systemaktivitet', sv:'systemaktivitet', ua:'активність системи', ru:'активность системы' },
  'admin.kpi_my_role': { hu:'SAJÁT JOG', en:'MY ROLE', de:'MEINE ROLLE', es:'MI ROL', fr:'MON RÔLE', no:'MIN ROLLE', sv:'MIN ROLL', ua:'МОЯ РОЛЬ', ru:'МОЯ РОЛЬ' },

  'admin.quick_view': { hu:'◢ GYORS NÉZET', en:'◢ QUICK VIEW', de:'◢ SCHNELLANSICHT', es:'◢ VISTA RÁPIDA', fr:'◢ VUE RAPIDE', no:'◢ HURTIGVISNING', sv:'◢ SNABBVY', ua:'◢ ШВИДКИЙ ОГЛЯД', ru:'◢ БЫСТРЫЙ ПРОСМОТР' },
  'admin.latest_posts': { hu:'LEGÚJABB POSZTOK', en:'LATEST POSTS', de:'NEUESTE BEITRÄGE', es:'PUBLICACIONES RECIENTES', fr:'PUBLICATIONS RÉCENTES', no:'NYESTE INNLEGG', sv:'SENASTE INLÄGG', ua:'ОСТАННІ ДОПИСИ', ru:'ПОСЛЕДНИЕ ПОСТЫ' },
  'admin.no_posts': { hu:'Nincs poszt.', en:'No posts.', de:'Keine Beiträge.', es:'Sin publicaciones.', fr:'Aucune publication.', no:'Ingen innlegg.', sv:'Inga inlägg.', ua:'Немає дописів.', ru:'Нет постов.' },

  'admin.users_panel': { hu:'◢ FELHASZNÁLÓK', en:'◢ USERS', de:'◢ BENUTZER', es:'◢ USUARIOS', fr:'◢ UTILISATEURS', no:'◢ BRUKERE', sv:'◢ ANVÄNDARE', ua:'◢ КОРИСТУВАЧІ', ru:'◢ ПОЛЬЗОВАТЕЛИ' },
  'admin.users_register': { hu:'REGISZTER · {N}', en:'REGISTER · {N}', de:'REGISTER · {N}', es:'REGISTRO · {N}', fr:'REGISTRE · {N}', no:'REGISTER · {N}', sv:'REGISTER · {N}', ua:'РЕЄСТР · {N}', ru:'РЕЕСТР · {N}' },
  'admin.search': { hu:'⌕ Keresés…', en:'⌕ Search…', de:'⌕ Suche…', es:'⌕ Buscar…', fr:'⌕ Recherche…', no:'⌕ Søk…', sv:'⌕ Sök…', ua:'⌕ Пошук…', ru:'⌕ Поиск…' },
  'admin.search_post': { hu:'⌕ Cím vagy ID…', en:'⌕ Title or ID…', de:'⌕ Titel oder ID…', es:'⌕ Título o ID…', fr:'⌕ Titre ou ID…', no:'⌕ Tittel eller ID…', sv:'⌕ Titel eller ID…', ua:'⌕ Назва або ID…', ru:'⌕ Название или ID…' },
  'admin.no_match': { hu:'Nincs találat.', en:'No matches.', de:'Keine Treffer.', es:'Sin resultados.', fr:'Aucun résultat.', no:'Ingen treff.', sv:'Inga träffar.', ua:'Немає збігів.', ru:'Совпадений нет.' },
  'admin.posts_panel': { hu:'◢ POSZTOK', en:'◢ POSTS', de:'◢ BEITRÄGE', es:'◢ PUBLICACIONES', fr:'◢ PUBLICATIONS', no:'◢ INNLEGG', sv:'◢ INLÄGG', ua:'◢ ДОПИСИ', ru:'◢ ПОСТЫ' },
  'admin.posts_manage': { hu:'KEZELÉS · {N}', en:'MANAGE · {N}', de:'VERWALTEN · {N}', es:'GESTIONAR · {N}', fr:'GÉRER · {N}', no:'ADMIN · {N}', sv:'HANTERA · {N}', ua:'УПРАВЛІННЯ · {N}', ru:'УПРАВЛЕНИЕ · {N}' },
  'admin.log_panel': { hu:'◢ ESEMÉNYNAPLÓ', en:'◢ EVENT LOG', de:'◢ EREIGNISLOG', es:'◢ REGISTRO DE EVENTOS', fr:'◢ JOURNAL', no:'◢ HENDELSESLOGG', sv:'◢ HÄNDELSELOGG', ua:'◢ ЖУРНАЛ ПОДІЙ', ru:'◢ ЖУРНАЛ СОБЫТИЙ' },
  'admin.log_live': { hu:'RENDSZER NAPLÓ · ÉLŐ', en:'SYSTEM LOG · LIVE', de:'SYSTEMLOG · LIVE', es:'REGISTRO · EN VIVO', fr:'JOURNAL · DIRECT', no:'SYSTEMLOGG · LIVE', sv:'SYSTEMLOGG · LIVE', ua:'ЖУРНАЛ · НАЖИВО', ru:'ЖУРНАЛ · ЖИВОЙ' },
  'admin.no_events': { hu:'Nincs esemény.', en:'No events.', de:'Keine Ereignisse.', es:'Sin eventos.', fr:'Aucun événement.', no:'Ingen hendelser.', sv:'Inga händelser.', ua:'Немає подій.', ru:'Нет событий.' },

  'admin.col_id': { hu:'ID', en:'ID', de:'ID', es:'ID', fr:'ID', no:'ID', sv:'ID', ua:'ID', ru:'ID' },
  'admin.col_user': { hu:'FELHASZNÁLÓ', en:'USER', de:'BENUTZER', es:'USUARIO', fr:'UTILISATEUR', no:'BRUKER', sv:'ANVÄNDARE', ua:'КОРИСТУВАЧ', ru:'ПОЛЬЗОВАТЕЛЬ' },
  'admin.col_role': { hu:'JOGOSULTSÁG', en:'ROLE', de:'ROLLE', es:'ROL', fr:'RÔLE', no:'ROLLE', sv:'ROLL', ua:'РОЛЬ', ru:'РОЛЬ' },
  'admin.col_level': { hu:'SZINT', en:'LEVEL', de:'STUFE', es:'NIVEL', fr:'NIVEAU', no:'NIVÅ', sv:'NIVÅ', ua:'РІВЕНЬ', ru:'УРОВЕНЬ' },
  'admin.col_status': { hu:'STÁTUSZ', en:'STATUS', de:'STATUS', es:'ESTADO', fr:'STATUT', no:'STATUS', sv:'STATUS', ua:'СТАТУС', ru:'СТАТУС' },
  'admin.col_type': { hu:'TÍPUS', en:'TYPE', de:'TYP', es:'TIPO', fr:'TYPE', no:'TYPE', sv:'TYP', ua:'ТИП', ru:'ТИП' },
  'admin.col_title': { hu:'CÍM', en:'TITLE', de:'TITEL', es:'TÍTULO', fr:'TITRE', no:'TITTEL', sv:'TITEL', ua:'НАЗВА', ru:'НАЗВАНИЕ' },
  'admin.col_author': { hu:'SZERZŐ', en:'AUTHOR', de:'AUTOR', es:'AUTOR', fr:'AUTEUR', no:'FORFATTER', sv:'FÖRFATTARE', ua:'АВТОР', ru:'АВТОР' },
  'admin.col_time': { hu:'IDŐPONT', en:'TIME', de:'ZEIT', es:'HORA', fr:'HEURE', no:'TID', sv:'TID', ua:'ЧАС', ru:'ВРЕМЯ' },
  'admin.col_reads': { hu:'OLV.', en:'RD.', de:'AUF.', es:'LEC.', fr:'LEC.', no:'LES.', sv:'LÄS.', ua:'ЧИТ.', ru:'ЧТ.' },
  'admin.col_log_time': { hu:'IDŐ', en:'TIME', de:'ZEIT', es:'HORA', fr:'HEURE', no:'TID', sv:'TID', ua:'ЧАС', ru:'ВРЕМЯ' },
  'admin.col_log_level': { hu:'SZINT', en:'LEVEL', de:'STUFE', es:'NIVEL', fr:'NIVEAU', no:'NIVÅ', sv:'NIVÅ', ua:'РІВЕНЬ', ru:'УРОВЕНЬ' },
  'admin.col_log_actor': { hu:'SZEREPLŐ', en:'ACTOR', de:'AKTEUR', es:'ACTOR', fr:'ACTEUR', no:'AKTØR', sv:'AKTÖR', ua:'АКТОР', ru:'АКТОР' },
  'admin.col_log_event': { hu:'ESEMÉNY', en:'EVENT', de:'EREIGNIS', es:'EVENTO', fr:'ÉVÉNEMENT', no:'HENDELSE', sv:'HÄNDELSE', ua:'ПОДІЯ', ru:'СОБЫТИЕ' },

  'admin.role_member': { hu:'TAG', en:'MEMBER', de:'MITGLIED', es:'MIEMBRO', fr:'MEMBRE', no:'MEDLEM', sv:'MEDLEM', ua:'УЧАСНИК', ru:'УЧАСТНИК' },
  'admin.role_admin': { hu:'ADMIN', en:'ADMIN', de:'ADMIN', es:'ADMIN', fr:'ADMIN', no:'ADMIN', sv:'ADMIN', ua:'АДМІН', ru:'АДМИН' },
  'admin.role_super': { hu:'SUPERADMIN', en:'SUPERADMIN', de:'SUPERADMIN', es:'SUPERADMIN', fr:'SUPERADMIN', no:'SUPERADMIN', sv:'SUPERADMIN', ua:'СУПЕРАДМІН', ru:'СУПЕРАДМИН' },
  'admin.status_active': { hu:'AKTÍV', en:'ACTIVE', de:'AKTIV', es:'ACTIVO', fr:'ACTIF', no:'AKTIV', sv:'AKTIV', ua:'АКТИВНИЙ', ru:'АКТИВЕН' },
  'admin.status_no_auth': { hu:'NINCS AUTH', en:'NO AUTH', de:'KEIN AUTH', es:'SIN AUTH', fr:'PAS D\'AUTH', no:'INGEN AUTH', sv:'INGEN AUTH', ua:'НЕМАЄ AUTH', ru:'НЕТ AUTH' },

  'admin.delete': { hu:'◢ TÖRÖL', en:'◢ DELETE', de:'◢ LÖSCHEN', es:'◢ ELIMINAR', fr:'◢ SUPPRIMER', no:'◢ SLETT', sv:'◢ RADERA', ua:'◢ ВИДАЛИТИ', ru:'◢ УДАЛИТЬ' },
  'admin.delete_user_confirm': { hu:'Biztosan törlöd {NAME} fiókját? Ez minden posztját, kommentjét és reakcióját is törli.', en:'Really delete {NAME}\'s account? This deletes all their posts, comments and reactions too.', de:'{NAME}-Konto wirklich löschen? Dies löscht alle Beiträge, Kommentare und Reaktionen.', es:'¿Eliminar la cuenta de {NAME}? Esto borra publicaciones, comentarios y reacciones.', fr:'Supprimer le compte de {NAME}? Cela efface aussi posts, commentaires et réactions.', no:'Slett {NAME} konto? Dette fjerner også alle innlegg, kommentarer og reaksjoner.', sv:'Radera {NAME}s konto? Detta tar även bort inlägg, kommentarer och reaktioner.', ua:'Видалити обліковий запис {NAME}? Це також видалить дописи, коментарі та реакції.', ru:'Удалить учётную запись {NAME}? Это также удалит посты, комментарии и реакции.' },
  'admin.delete_post_confirm': { hu:'Biztosan törlöd a posztot: "{TITLE}"?', en:'Really delete post: "{TITLE}"?', de:'Beitrag wirklich löschen: "{TITLE}"?', es:'¿Eliminar publicación: "{TITLE}"?', fr:'Supprimer la publication: "{TITLE}"?', no:'Slette innlegget: "{TITLE}"?', sv:'Radera inlägget: "{TITLE}"?', ua:'Видалити допис: "{TITLE}"?', ru:'Удалить пост: "{TITLE}"?' },
  'admin.callsign_edit': { hu:'◢ HÍVÓJEL ÁTÍRÁS', en:'◢ EDIT CALLSIGN', de:'◢ RUFZEICHEN ÄNDERN', es:'◢ EDITAR CALLSIGN', fr:'◢ MODIFIER CALLSIGN', no:'◢ ENDRE CALLSIGN', sv:'◢ ÄNDRA CALLSIGN', ua:'◢ ЗМІНИТИ ПОЗИВНИЙ', ru:'◢ ИЗМЕНИТЬ ПОЗЫВНОЙ' },
  'admin.password_reset': { hu:'◢ JELSZÓ RESET', en:'◢ RESET PASSWORD', de:'◢ PASSWORT ZURÜCKSETZEN', es:'◢ RESET CONTRASEÑA', fr:'◢ RESET MOT DE PASSE', no:'◢ TILBAKESTILL PASSORD', sv:'◢ ÅTERSTÄLL LÖSENORD', ua:'◢ СКИНУТИ ПАРОЛЬ', ru:'◢ СБРОСИТЬ ПАРОЛЬ' },
  'admin.new_password_ph': { hu:'Új jelszó (min. 6)', en:'New password (min 6)', de:'Neues Passwort (min 6)', es:'Nueva contraseña (mín 6)', fr:'Nouveau mot de passe (6+)', no:'Nytt passord (min 6)', sv:'Nytt lösenord (min 6)', ua:'Новий пароль (мін 6)', ru:'Новый пароль (мин 6)' },
  'admin.own_password_ph': { hu:'Saját jelszavad (megerősítés)', en:'Your own password (confirm)', de:'Eigenes Passwort (Bestätigung)', es:'Tu propia contraseña (confirmar)', fr:'Votre mot de passe (confirmer)', no:'Ditt eget passord (bekreft)', sv:'Ditt eget lösenord (bekräfta)', ua:'Ваш власний пароль (підтвердження)', ru:'Ваш собственный пароль (подтверждение)' },
  'admin.save': { hu:'MENTÉS', en:'SAVE', de:'SPEICHERN', es:'GUARDAR', fr:'ENREGISTRER', no:'LAGRE', sv:'SPARA', ua:'ЗБЕРЕГТИ', ru:'СОХРАНИТЬ' },
  'admin.cancel': { hu:'MÉGSE', en:'CANCEL', de:'ABBRECHEN', es:'CANCELAR', fr:'ANNULER', no:'AVBRYT', sv:'AVBRYT', ua:'СКАСУВАТИ', ru:'ОТМЕНА' },
  'admin.password_set_confirm': { hu:'Beállítsuk {NAME} új jelszavát: "{PW}" ?', en:'Set new password for {NAME}: "{PW}" ?', de:'Neues Passwort für {NAME} setzen: "{PW}" ?', es:'¿Establecer nueva contraseña para {NAME}: "{PW}" ?', fr:'Définir le nouveau mot de passe de {NAME}: "{PW}" ?', no:'Sett nytt passord for {NAME}: "{PW}" ?', sv:'Sätt nytt lösenord för {NAME}: "{PW}" ?', ua:'Встановити новий пароль для {NAME}: "{PW}" ?', ru:'Установить новый пароль для {NAME}: "{PW}" ?' },
  'admin.password_min': { hu:'A jelszó legalább 6 karakter.', en:'Password must be at least 6 characters.', de:'Passwort mindestens 6 Zeichen.', es:'Contraseña mínima 6 caracteres.', fr:'Mot de passe min 6 caractères.', no:'Passord minst 6 tegn.', sv:'Lösenord minst 6 tecken.', ua:'Пароль мінімум 6 символів.', ru:'Пароль минимум 6 символов.' },
  'admin.confirm_own_password': { hu:'Add meg a saját jelszavadat a megerősítéshez.', en:'Enter your own password to confirm.', de:'Eigenes Passwort zur Bestätigung eingeben.', es:'Ingresa tu contraseña para confirmar.', fr:'Entrez votre propre mot de passe pour confirmer.', no:'Skriv inn ditt eget passord for å bekrefte.', sv:'Ange ditt eget lösenord för att bekräfta.', ua:'Введіть свій пароль для підтвердження.', ru:'Введите свой пароль для подтверждения.' },
  'admin.callsign_updated': { hu:'Hívójel frissítve: {V}', en:'Callsign updated: {V}', de:'Rufzeichen aktualisiert: {V}', es:'Callsign actualizado: {V}', fr:'Callsign mis à jour: {V}', no:'Callsign oppdatert: {V}', sv:'Callsign uppdaterat: {V}', ua:'Позивний оновлено: {V}', ru:'Позывной обновлён: {V}' },
  'admin.password_updated': { hu:'Jelszó frissítve.', en:'Password updated.', de:'Passwort aktualisiert.', es:'Contraseña actualizada.', fr:'Mot de passe mis à jour.', no:'Passord oppdatert.', sv:'Lösenord uppdaterat.', ua:'Пароль оновлено.', ru:'Пароль обновлён.' },
  'admin.event_post_published': { hu:'Poszt publikálva · {ID} · "{T}"', en:'Post published · {ID} · "{T}"', de:'Beitrag veröffentlicht · {ID} · "{T}"', es:'Publicación publicada · {ID} · "{T}"', fr:'Publication publiée · {ID} · "{T}"', no:'Innlegg publisert · {ID} · "{T}"', sv:'Inlägg publicerat · {ID} · "{T}"', ua:'Допис опубліковано · {ID} · "{T}"', ru:'Пост опубликован · {ID} · "{T}"' },
  'admin.event_pinned': { hu:'KITŰZÖTT', en:'PINNED', de:'ANGEHEFTET', es:'FIJADO', fr:'ÉPINGLÉ', no:'FESTET', sv:'FÄST', ua:'ЗАКРІПЛЕНО', ru:'ЗАКРЕПЛЕНО' },
  'admin.event_info': { hu:'INFO', en:'INFO', de:'INFO', es:'INFO', fr:'INFO', no:'INFO', sv:'INFO', ua:'ІНФО', ru:'ИНФО' },
}

function format(template: string, vars: Record<string, string | number>): string {
  let s = template
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v))
  }
  return s
}

export const LANGS = ['hu', 'en', 'es', 'de', 'fr', 'no', 'sv', 'ua', 'ru'] as const
export type Lang = typeof LANGS[number]

const LANG_LABELS: Record<Lang, string> = { hu: 'HU', en: 'EN', es: 'ES', de: 'DE', fr: 'FR', no: 'NO', sv: 'SV', ua: 'UA', ru: 'RU' }

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

  const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
    const entry = DICT[key]
    if (!entry) return key
    const tpl = entry[lang] ?? entry['en'] ?? entry['hu'] ?? key
    return vars ? format(tpl, vars) : tpl
  }, [lang])

  return { t, lang, setLang, LANGS, LANG_LABELS }
}
