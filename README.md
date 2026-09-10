# 1stdate

Rendez-vous à distance pour deux. Créez une invitation, partagez le code, et tirez des questions ensemble — en français.

## Jeux

- **Premier rendez-vous** — brise-glace → confidences → profondeur + défis
- **Original** — le deck profond classique

## Lancer en local

```bash
npm install
npm run dev
```

- App : http://localhost:5173
- Serveur : http://localhost:3001

## Production

```bash
npm run build
npm start
```

Le serveur sert le build Vite et le WebSocket sur le même port (`PORT`).

## Privé

Les decks dans `data/decks/` sont des seeds privés — à remplacer avant une sortie publique.
