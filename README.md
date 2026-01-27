# Flower garden server

# Table des matière

- [Flower garden server](#flower-garden-server)
- [Table des matière](#table-des-matière)
- [Présentation](#présentation)
- [Auteur](#auteur)
- [License](#license)

# Présentation

Flower garden app est un projet open-source qui permet de scanner un nom de domaine pour afficher toutes les applications web qui y sont associées.

Dans mon cas, j'utilise ce projet pour générer automatiquement une liste de toutes mes applications web avec leur URL, leur nom, leur icons ainsi qu'une description.

Toutes les informations sont récupérées automatiquement via des requêtes DNS, ainsi que du parsing des headers HTML des pages web renvoyer par un appel HTTP à la racine de chaque sous-domaine récupéré par les requêtes DNS.

# Auteur

Flower garden est un projet open-source développé uniquement par [Floris Robart](https://florobart.github.io/)

# License

Flower garden est un projet open-source sous licence [GNU General Public License v3.0](https://opensource.org/licenses/GPL-3.0).
