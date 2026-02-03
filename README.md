# AMI Report Card Generator 🎓

Un générateur de bulletins scolaires web-based conçu pour l'AMI (Association Musulmane de l'Inde). Ce projet permet de transformer des données CSV brutes en bulletins élégants, professionnels et prêts pour l'impression.

## ✨ Fonctionnalités

- **Parsing CSV Intelligent** : Utilise PapaParse pour traiter les exports de notes.
- **Identité Visuelle Premium** : Design doré/bronze avec une typographie soignée (Noto Sans & Amiri).
- **Mise en Page Automatique** : Génère dynamiquement une page A4 par élève.
- **Multi-langue** : Support complet du Français et de l'Arabe dans le même document.
- **Calculs Automatisés** : Calcule les moyennes générales, les rangs, ainsi que les min/max de la classe.
- **Optimisé pour l'Impression** : Masquage automatique de l'interface de contrôle lors de l'impression.

## 🚀 Utilisation

### Chargement des données

L'application peut charger les données de deux manières :

1. **Via URL (Automatique)** : Ajoutez des paramètres à l'URL pour pointer vers un fichier CSV spécifique :
   `index.html?year=2025&sem=1&class=M06`
   _(Cherchera le fichier dans `data/2025/1/M06.csv`)_
2. **Manuel** : Si le chargement via URL échoue (sécurité navigateur locale), un bouton d'import manuel apparaît.

### Impression

Une fois les bulletins générés, utilisez simplement la fonction d'impression de votre navigateur (`Ctrl+P` ou `Cmd+P`).

- **Destination** : Enregistrer en PDF ou choisir votre imprimante.
- **Mise en page** : Portrait.
- **Marges** : Aucune ou par défaut (le design inclut déjà ses propres marges A4).

## 🛠 Structure du Projet

- `index.html` : Structure de base et templates des bulletins.
- `style.css` : Design system complet (Variables, Layout, Print).
- `script.js` : Moteur de rendu et logique de parsing.
- `config.js` : Mappages des matières et traductions.
- `data/` : Dossier recommandé pour stocker vos fichiers CSV.

## 📚 Technologies utilisées

- **HTML5 / CSS3** (Variables CSS, Flexbox)
- **Vanilla JavaScript** (ES6+)
- **[PapaParse](https://www.papaparse.com/)** : Pour le traitement des fichiers CSV.
- **Google Fonts** : Noto Sans et Noto Naskh Arabic.

---

_Ce projet a été développé pour assurer une présentation de haute qualité des résultats scolaires de l'AMI._
