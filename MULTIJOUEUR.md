# VIRAGE multijoueur local

Le jeu solo reste accessible dans `index.html`. Cette première version multijoueur utilise Socket.IO et permet jusqu’à 8 joueurs dans un salon.

## Lancer le serveur

Prérequis : Node.js 18 ou plus récent.

```bash
npm install
npm start
```

Ouvre ensuite <http://localhost:3000/multiplayer.html>. Crée un salon et partage son code avec les autres joueurs. Pour jouer sur le même réseau local, les autres appareils doivent ouvrir `http://ADRESSE-IP-DE-L-ORDINATEUR:3000/multiplayer.html` ; le pare-feu doit autoriser le port 3000.

Le serveur doit rester lancé. GitHub Pages seul ne peut pas exécuter ce serveur Node.js : pour jouer sur Internet depuis des réseaux différents, il faudra déployer `server.js` sur un hébergeur Node compatible et utiliser son URL.
