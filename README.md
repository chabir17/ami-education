# AMI Education - Suite de Gestion Scolaire 🎓

Une suite d'outils web élégante et performante pour la gestion scolaire de l'AMI (Association Musulmane de l'Inde). Ce projet permet de générer des bulletins scolaires, d'imprimer des enveloppes et de consulter le calendrier scolaire, le tout dans une interface moderne et responsive.

## ✨ Fonctionnalités

### 📋 Bulletins Scolaires (`bulletins.html`)

- **Parsing CSV Intelligent** : Import automatique ou manuel des notes via PapaParse.
- **Design Premium** : Mise en page soignée avec typographie Noto Sans & Amiri, optimisée pour l'impression A4.
- **Calculs Automatisés** : Moyennes, rangs, min/max et appréciations générés à la volée.
- **Support Bilingue** : Affichage mixte Français/Arabe pour les matières concernées.

### ✉️ Impression d'Enveloppes (`enveloppes.html`)

- **Format C6** : Mise en page calibrée (162mm x 114mm) pour l'impression directe.
- **Données Élèves** : Extraction automatique des coordonnées depuis la base de données.
- **Tri & Filtre** : Organisation par classe et nom, avec filtrage dynamique.

### 📅 Calendrier Scolaire (`calendar.html`)

- **Vue Semestrielle** : Affichage clair des deux semestres côte à côte.
- **Codes Couleurs** : Distinction visuelle immédiate des vacances, examens et événements spéciaux.
- **Impression A4** : Mode d'impression optimisé pour tenir sur une seule page portrait, avec légende intégrée.
- **Design System** : Intégration complète avec le thème global (couleurs, arrondis, typographie).

## 🚀 Utilisation

### 1. Génération de Bulletins

Ouvrez `bulletins.html` :

- **Automatique** : `?year=2025-2026&sem=1&class=M06`
- **Manuel** : Chargez votre CSV et sélectionnez la classe via le tableau de bord.

### 2. Impression d'Enveloppes

Ouvrez `enveloppes.html` :

- **Filtrer** : Ajoutez `?class=M06` pour cibler un groupe.
- **Imprimer** : Utilisez le format papier **C6** ou **Personnalisé (162x114mm)**.

### 3. Calendrier Scolaire

Ouvrez `calendar.html` :

- **Consultation** : Naviguez entre les mois et consultez l'agenda détaillé.
- **Impression** : `Ctrl+P` pour obtenir une version papier A4 parfaite.

## 🎨 Design System & Responsivité

Le projet repose sur un **Design System** centralisé (`common.css`) garantissant une cohérence visuelle :

- **Palette de Couleurs** : Utilisation de variables CSS (`--brand`, `--bg-surface`, etc.) pour un thème unifié.
- **Typographie** : _Noto Sans_ pour le corps et _Poppins_ pour les titres.
- **Composants UI** : Boutons, cartes et formulaires stylisés avec des bordures arrondies (`--radius-lg`) et des ombres douces.
- **Dark Mode** : Support natif du mode sombre sur toutes les pages.

### Adaptabilité Mobile & Tablette

- **Sidebar** : Navigation latérale rétractable sur Desktop, convertie en barre de navigation inférieure sur Mobile.
- **Layout** : Grilles Flexbox/Grid fluides s'adaptant à la largeur de l'écran.
- **Tableaux** : Conteneurs à défilement horizontal pour les petits écrans.

## 🛠 Structure du Projet

```
/
├── assets/              # Images, logos et patterns
├── css/                 # Feuilles de style
│   ├── common.css       # Design System (Variables, Reset, Layout, Sidebar)
│   ├── bulletin.css     # Styles spécifiques (A4 Portrait)
│   ├── envelope.css     # Styles spécifiques (C6 Paysage)
│   └── calendar.css     # Styles spécifiques (Calendrier & Agenda)
├── js/                  # Logique applicative
│   ├── common.js        # Utilitaires globaux (Sidebar, Thème)
│   ├── config.js        # Configuration (Matières, Professeurs)
│   ├── bulletin.js      # Moteur de génération des bulletins
│   ├── envelope.js      # Moteur d'impression des enveloppes
│   └── calendar.js      # Logique du calendrier et des événements
├── data/                # Données CSV
├── header.html          # En-tête partagé
├── bulletins.html       # Page des bulletins
├── enveloppes.html      # Page des enveloppes
└── calendar.html        # Page du calendrier
```

## 📚 Technologies

- **HTML5 / CSS3** : Architecture moderne avec Custom Properties.
- **Vanilla JavaScript (ES6+)** : Pas de framework lourd, performance maximale.
- **PapaParse** : Traitement robuste des fichiers CSV.
- **Google Fonts** : Intégration de polices web optimisées.
