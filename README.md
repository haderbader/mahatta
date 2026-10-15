# Mahatta Conducteur — démo fonctionnelle

Tablette de cabine du conducteur (SNTF), portée du prototype HTML vers une vraie application.

- **Cabine** `/` : prise de service par scan QR (caméra réelle, `qr-scanner`), 8 causes d'arrêt, durée, aperçu voyageurs, prolongation, reprise, accusé des messages du centre, changement de rame, fin de service. FR / AR (RTL), jour / nuit.
- **Hors réseau** : les envois partent dans une file persistée (IndexedDB) et sont rejoués à la reconnexion, de façon idempotente (`clientId`).
- **Centre de pilotage** `/centre` : la maquette `SNTF Centre de pilotage` reprise telle quelle (cartes schématiques, synoptique, graphique de circulation, statistiques). Les trains qui ont un service ouvert en cabine (1042, 1047) sont pilotés par les vraies déclarations ; le reste de la flotte reste simulé. Le régulateur valide les causes sensibles avant diffusion aux voyageurs et peut envoyer des messages (modèles FR/AR) au conducteur.
- **QR cabines** `/cabines` : codes à imprimer (`qrcode`) pour les rames Z-217 et Z-305.
- **GPS réel** : bouton « GPS réel » dans la barre de démo (vitesse via Geolocation API) ; sinon vitesse simulée.

## Application voyageur `/voyageur`

PWA mobile (FR / AR RTL) : état du trafic **alimenté en direct par les déclarations des conducteurs** (Socket.IO), prochains départs, itinéraires (calcul testé dans `shared/routing.ts`), suivi du train déclaré, billets achetés (paiement simulé) avec **QR tournant signé HMAC toutes les 30 s**, contrôle de billet `/voyageur/controle`, signalements envoyés au centre.

Limites : horaires de banlieue théoriques (pas de GTFS SNTF public), position du train fixe (démo), prix indicatifs.

Stack : Vite + React + TypeScript, Tailwind v4, vaul, motion, lucide-react, sonner, react-router, zustand, i18next-ready strings, vite-plugin-pwa, Fastify + Socket.IO, SQLite (`node:sqlite`, Node ≥ 22).

```bash
pnpm install
pnpm dev        # api :3001 + web :5173
pnpm build && pnpm start   # tout sur :3001
```

Limites de la démo : conducteur fixe (CDT-0458), pas d'authentification, position des arrêts non dérivée du GPS.
