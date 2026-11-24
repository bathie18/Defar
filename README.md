# DEFAR : Atlas de l'entrepreneuriat jeune

**Prototype de plateforme cartocentrée** proposé par le **CEGIT** à la Direction de la Promotion de l'Entrepreneuriat et des Partenariats (**DPEP**) du Ministère de la Jeunesse et des Sports du Sénégal.

> *Defar* : « faire, construire » en wolof. **D**ispositif d'**E**ntrepreneuriat, de **F**ormalisation, d'**A**ccompagnement et de **R**essources territoriales.

## Ce que montre le prototype

| Volet | Fonctionnalités |
|---|---|
| **Guichet jeunes** | Carte des structures d'appui, orientation par maturité / besoin / secteur, tri par distance (GPS ou département), parcours conseillé, fiche pratique, demande de rendez-vous simulée |
| **Pilotage DPEP** | Compteur « 100 000 formalisés », trajectoire 2027, cartes choroplèthes (département / région), zones blanches, opportunités sectorielles, fiche territoire, classement |
| **Partenaires** | Familles de partenaires, fiches « besoins par territoire » pour les bailleurs, interopérabilité (APIX, DER/FJ, ANSD, Écosystème startup) |
| **Le projet** | Valeur ajoutée, architecture, démarche de déploiement, documents complets |

## Documents

- [Argumentaire de proposition](docs/argumentaire.md)
- [Architecture fonctionnelle et technique](docs/architecture-fonctionnelle.md)

## Publier sur GitHub Pages

1. Créer le dépôt (par exemple `defar`) et y pousser le contenu de ce dossier à la racine.
2. *Settings → Pages → Build and deployment* : source **Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. L'adresse sera `https://<compte>.github.io/defar/`.

Le fichier `.nojekyll` est volontaire : il permet de servir les fichiers Markdown tels quels (ils sont affichés dans une visionneuse intégrée au prototype).

## Tester en local

```bash
python -m http.server 8000
# puis ouvrir http://localhost:8000
```

Une ouverture directe du fichier `index.html` (double-clic) ne fonctionne pas : les navigateurs bloquent la lecture des fichiers GeoJSON locaux.

## Structure

```
index.html                  application (4 vues)
assets/css/style.css        charte graphique
assets/js/app.js            logique (orientation, pilotage, partenaires)
assets/vendor/              Leaflet 1.9.4, Chart.js 4.4.1, marked (embarqués)
data/departements.geojson   45 départements + indicateurs simulés
data/regions.geojson        14 régions + bassins d'activité
data/structures.geojson     284 structures d'appui fictives
data/serie_nationale.json   série mensuelle des formalisations (simulée)
docs/                       argumentaire et architecture
```

## Données

- **Limites administratives** : [geoBoundaries](https://www.geoboundaries.org) (licence CC BY 4.0), simplifiées. La version utilisée compte 45 départements ; le département de Keur Massar (créé en 2021) sera ajouté avec le référentiel officiel.
- **Fond de carte** : © OpenStreetMap contributors, © CARTO.
- **Indicateurs, structures, séries** : **entièrement simulés**. Ils ne représentent aucune donnée réelle et servent uniquement à illustrer les fonctionnalités.

## Pile cible (production)

PostgreSQL/PostGIS · QGIS / QGIS Server · pg_tileserv · FastAPI · Leaflet/MapLibre · Keycloak : 100 % open source, hébergeable au Sénégal.

---

**CEGIT** (Centre d'Expertise en Géomatique et Ingénierie Territoriale) · [cegitgroup.com](https://cegitgroup.com)
Contact : Bathie NDIAYE, consultant en SIG, géodonnées et ingénierie territoriale
