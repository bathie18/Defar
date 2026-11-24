# DEFAR : architecture fonctionnelle et technique

*Document de travail CEGIT, proposition spontanée à la DPEP (Ministère de la Jeunesse et des Sports, Sénégal)*

---

## 1. Vue d'ensemble

DEFAR repose sur **un socle de données unique** (référentiel géographique des structures, parcours, indicateurs) exploité par **deux applications** :

| Couche | Composants |
|---|---|
| **Usagers** | Jeunes porteurs de projets · Agents DPEP et services régionaux · Structures partenaires · Cabinet, bailleurs, PTF |
| **Applications** | Guichet jeunes (grand public) · Pilotage DPEP (décisionnel) · Espace partenaires (back-office) |
| **Services** | API métier · Services cartographiques · Authentification · Calcul des indicateurs (ETL) · Notifications |
| **Données** | Entrepôt PostgreSQL/PostGIS · Connecteurs vers les sources partenaires |

---

## 2. Acteurs et droits

| Profil | Accès | Droits principaux |
|---|---|---|
| **Jeune (visiteur)** | Public, sans compte | Rechercher, consulter les fiches, voir son parcours conseillé |
| **Jeune (inscrit)** | Compte léger (téléphone + code SMS) | Demander un rendez-vous, suivre ses démarches |
| **Partenaire** | Compte structure | Mettre à jour sa fiche, gérer ses créneaux, traiter les demandes, déclarer ses accompagnements |
| **Agent régional** | Compte DPEP, périmètre région | Tableau de bord de sa région, validation des fiches partenaires |
| **Administrateur DPEP** | Compte DPEP national | Tout le pilotage, gestion des référentiels, des comptes et des indicateurs |
| **Décideur / bailleur** | Lecture, accès restreint | Tableaux de bord et fiches territoires, exports |

---

## 3. Modules fonctionnels

### M1. Référentiel des structures d'appui
- Fiche géolocalisée par structure : type, services (orientation, formation, idéation, mentorat, financement, formalisation), secteurs, stades de maturité ciblés, conditions d'éligibilité, horaires, contacts.
- Huit familles : Espaces Jeunes, incubateurs, DER/FJ, ADEPME, chambres consulaires, formation professionnelle, microfinance, guichets de formalisation.
- Cycle de vie : création par le partenaire, validation par l'agent régional, relance automatique si la fiche n'a pas été mise à jour depuis 6 mois.

### M2. Moteur d'orientation (guichet jeunes)
- Entrées : maturité du projet, besoins, secteur, position (GPS ou choix du département).
- Sorties : structures éligibles triées par distance, parcours conseillé en trois étapes.
- Règles paramétrables par la DPEP (correspondance maturité, besoins et types de structures).

### M3. Prise de rendez-vous et suivi de parcours
- Demande de rendez-vous avec consentement explicite, accusé de réception par SMS.
- Le partenaire confirme, reporte ou clôture la demande.
- Chaque étape alimente des indicateurs anonymisés (orientations, rendez-vous honorés, abandons).

### M4. Tableau de bord de l'objectif 2027
- Compteur national, trajectoire cumulée et cible, rythme mensuel requis.
- Indicateurs clés : créations, formalisations, part des femmes, taux d'abandon, nombre de zones blanches.

### M5. Cartographie décisionnelle
- Cartes choroplèthes par région, département et, à terme, par commune.
- Indicateurs : taux d'atteinte, formalisations, densité de structures, taux d'abandon, part des femmes.
- Fiche territoire : indicateurs, offre présente ou absente, filières porteuses, piste d'action.

### M6. Analyse des zones blanches
- Croisement de la population jeune (ANSD) et de l'offre d'accompagnement.
- À terme : temps d'accès réel au guichet le plus proche, calculé sur le réseau routier (OpenStreetMap, pgRouting).
- Simulation : « si j'ouvre un point d'accueil ici, combien de jeunes de plus sont couverts ? »

### M7. Opportunités sectorielles
- Bassins d'activité par territoire (agriculture, élevage, pêche, tourisme, mines, numérique…).
- Superposition avec les projets des jeunes et les structures spécialisées, pour favoriser les chaînes de valeur locales.

### M8. Espace partenaires et bailleurs
- Annuaire des familles de partenaires, statistiques d'activité.
- Fiches « besoins par territoire » exportables (PDF) pour la mobilisation de financements.

### M9. Interopérabilité
- API ouverte (OpenAPI) pour exposer le référentiel des structures.
- Connecteurs entrants : APIX (immatriculations), DER/FJ, ADEPME, ANSD, « Écosystème startup » du ministère en charge du Numérique.

---

## 4. Indicateurs et règles de calcul

| Indicateur | Définition | Source cible |
|---|---|---|
| Jeunes entreprises formalisées | Entreprises immatriculées (NINEA / RCCM) dont le dirigeant a moins de 35 ans | APIX, registres |
| Taux d'atteinte | Formalisées ÷ objectif territorial × 100 | Calculé |
| Objectif territorial | Répartition des 100 000 au prorata de la population jeune (règle à valider avec la DPEP) | ANSD, DPEP |
| Densité de structures | Nombre de structures ÷ (population 15-35 ans ÷ 10 000) | Référentiel M1, ANSD |
| Zone blanche | Densité < 0,35 ou temps d'accès au guichet le plus proche supérieur à un seuil (ex. 45 min) | Calculé |
| Taux d'abandon | Parcours sans suite après 90 jours ÷ parcours ouverts | M3 |
| Part des femmes | Formalisées dirigées par une femme ÷ total des formalisées | APIX, partenaires |
| Score de levier (bailleurs) | (jeunes ÷ (structures + 1)) × (1 − taux d'atteinte) | Calculé |

Les seuils et pondérations sont **paramétrables** et seront fixés avec la DPEP lors du cadrage.

---

## 5. Modèle de données (simplifié)

| Table | Contenu principal | Géométrie |
|---|---|---|
| `territoire` | Région, département, commune, codes officiels, population jeune | Polygone |
| `structure` | Identité, type, services, secteurs, maturités, horaires, éligibilité, statut de validation | Point |
| `partenaire` | Organisme de rattachement (DER/FJ, ADEPME, chambre…), conventions | — |
| `creneau` / `rendez_vous` | Disponibilités, demandes, statut | — |
| `parcours` | Étapes anonymisées d'un porteur (orientation, RDV, accompagnement, formalisation) | Territoire de rattachement |
| `formalisation` | Immatriculations de jeunes (agrégats par commune et par mois) | Territoire |
| `bassin_activite` | Filières porteuses par territoire | Polygone |
| `indicateur_valeur` | Valeurs calculées par territoire, indicateur et période | — |

---

## 6. Architecture technique (100 % open source)

| Couche | Technologies | Rôle |
|---|---|---|
| Base de données | **PostgreSQL 16 + PostGIS**, pgRouting | Stockage, calculs spatiaux, temps d'accès |
| Préparation des données | **QGIS**, scripts Python / PyQGIS | Intégration, contrôle qualité, cartographie de référence |
| Services cartographiques | **QGIS Server** (WMS/WFS), **pg_tileserv** (tuiles vectorielles), pg_featureserv | Diffusion légère et standardisée |
| API métier | **FastAPI** (Python), documentation OpenAPI | Orientation, rendez-vous, indicateurs |
| Front-end | **Leaflet** ou MapLibre GL, Chart.js, application web progressive (PWA) | Interfaces mobile-first, fonctionnement en connexion dégradée |
| Authentification | **Keycloak** (OpenID Connect) | Comptes, rôles, périmètres territoriaux |
| Traitements planifiés | Python, cron ou **Apache Airflow** | Calcul des indicateurs, connecteurs, relances |
| Notifications | Passerelle SMS, e-mail, API WhatsApp Business | Confirmations, rappels |
| Canaux alternatifs (V2) | Passerelle **USSD** | Accès sans data mobile |
| Hébergement | Conteneurs Docker, serveur de l'État ou hébergeur national | Souveraineté et réversibilité |

**Le prototype de démonstration** est volontairement allégé : un site statique (HTML, CSS, JavaScript, Leaflet, Chart.js) qui lit des fichiers GeoJSON, publiable sur GitHub Pages sans serveur.

---

## 7. Sobriété numérique et accessibilité

- Tuiles vectorielles et GeoJSON simplifiés : une carte départementale complète pèse moins de 100 Ko.
- Bibliothèques embarquées localement, aucune dépendance obligatoire à un CDN.
- Mise en cache des données de référence (PWA) pour un usage en connexion intermittente.
- Interface en français, contenus d'aide en wolof et en langues nationales en V2.
- Contrastes et tailles de police adaptés aux écrans d'entrée de gamme.

---

## 8. Sécurité et données personnelles

- Collecte minimale : nom, téléphone, description courte du projet, uniquement pour les demandes de rendez-vous.
- Consentement explicite, droit d'accès et de suppression, durée de conservation limitée.
- Indicateurs de pilotage **anonymisés et agrégés**, jamais de données nominatives dans les tableaux de bord.
- Chiffrement des échanges (HTTPS), journalisation des accès, sauvegardes quotidiennes.
- Conformité à la loi n° 2008-12 sur les données à caractère personnel et déclaration auprès de la CDP.

---

## 9. Feuille de route fonctionnelle

| Version | Périmètre |
|---|---|
| **Prototype** (disponible) | Guichet jeunes, pilotage cartographique, zones blanches, opportunités sectorielles, espace partenaires, données simulées |
| **MVP pilote** (3 régions) | Référentiel réel des structures, rendez-vous par SMS, comptes partenaires, tableau de bord alimenté par les données réelles |
| **V1 nationale** | 14 régions, connecteurs APIX / DER/FJ / ADEPME, exports bailleurs, formation des agents |
| **V2** | Temps d'accès réels (pgRouting), simulation d'implantation, USSD / WhatsApp, échelle communale, contenus en langues nationales, passerelle « Écosystème startup » |
