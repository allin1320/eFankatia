import { createHash } from 'node:crypto'

import { resolveSeedDbTarget, runSeedQuery } from './lib/db-target'

/**
 * Seed de test : deux lignées générales sur 6 générations.
 *
 * Chaque lignée part d'un couple racine, puis se ramifie en enfants,
 * petits-enfants, arrière-petits-enfants, arrière-arrière-petits-enfants et
 * arrière-arrière-arrière-petits-enfants. Les conjoints sont marqués
 * `estLigneeGenerale = false`, les descendants `true`.
 *
 * Le script est idempotent : il supprime d'abord les fiches qu'il a lui-même
 * créées (identifiants UUID déterministes), puis les recrée avec leurs unions
 * et leurs liens de parenté. Les données sont écrites via la CLI Supabase
 * (`db query`), sur une cible pilotée par `SUPABASE_DB_TARGET` : `local`
 * (défaut) pour la base locale, `linked` pour le projet cloud lié, comme
 * `scripts/seed-admin.ts`.
 *
 * Usage : `npm run seed:personne:test` (local)
 *         `SUPABASE_DB_TARGET=linked npm run seed:personne:test` (cloud)
 */

type Sexe = 'M' | 'F'

type PersonneSeed = {
  /** Identifiant stable, unique au sein de sa lignée. */
  cle: string
  /** Nom de famille. Absent = nom de la lignée (personne de sang). */
  nom?: string
  prenom: string
  appellation?: string
  sexe: Sexe
  dateNaissance: string
  dateDeces?: string
  profession?: string
  ville?: string
  quartier?: string
}

type ConjointSeed = PersonneSeed & {
  /** Le conjoint est extérieur à la lignée : son nom est obligatoire. */
  nom: string
}

type EnfantSeed = {
  personne: PersonneSeed
  conjoint?: ConjointSeed
  dateMariage?: string
  enfants?: Array<EnfantSeed>
}

type LigneeSeed = {
  /** Préfixe stable des clés et des UUID de la lignée. */
  cle: string
  nom: string
  racine: PersonneSeed
  conjoint: ConjointSeed
  dateMariage: string
  enfants: Array<EnfantSeed>
}

type PersonneRow = {
  id: string
  nom: string
  prenom: string
  appellation: string | null
  sexe: Sexe
  profession: string | null
  dateNaissance: string
  dateDeces: string | null
  pays: string
  ville: string | null
  quartier: string | null
  estLigneeGenerale: boolean
}

type MariageRow = {
  id: string
  personne1Id: string
  personne2Id: string
  dateMariage: string | null
}

type ParentEnfantRow = {
  parentId: string
  enfantId: string
  typeParent: 'pere' | 'mere'
}

type MariageEnfantRow = {
  mariageId: string
  enfantId: string
}

const PAYS = 'Madagascar'

/**
 * Deux lignées indépendantes de 6 générations chacune.
 *
 * Les dates suivent une chronologie cohérente : racines nées à la fin du
 * XIXe siècle, 6e génération née dans les années 2020. Les prénoms sont
 * uniques afin que le trigger anti-doublon (`personnes_guard_doublon`) ne
 * bloque jamais le seed.
 */
const LIGNEES: Array<LigneeSeed> = [
  {
    cle: 'rakoto',
    nom: 'Rakoto',
    racine: {
      cle: 'jean-baptiste',
      prenom: 'Jean-Baptiste',
      appellation: 'Dadabe',
      sexe: 'M',
      dateNaissance: '1895-03-12',
      dateDeces: '1968-08-04',
      profession: 'Cultivateur',
      quartier: 'Analakely',
    },
    conjoint: {
      cle: 'marie-rasoa',
      nom: 'Rasoa',
      prenom: 'Marie',
      appellation: 'Neny',
      sexe: 'F',
      dateNaissance: '1898-07-21',
      dateDeces: '1972-11-15',
      profession: 'Ménagère',
      quartier: 'Isotry',
    },
    dateMariage: '1920-06-15',
    // Génération 2
    enfants: [
      {
        personne: {
          cle: 'paul',
          prenom: 'Paul',
          appellation: 'Paoly',
          sexe: 'M',
          dateNaissance: '1922-02-14',
          dateDeces: '1998-04-20',
          profession: 'Mécanicien',
          quartier: 'Ambohipo',
        },
        conjoint: {
          cle: 'claire-andrianina',
          nom: 'Andrianina',
          prenom: 'Claire',
          appellation: 'Clarisse',
          sexe: 'F',
          dateNaissance: '1925-06-05',
          dateDeces: '2012-03-10',
          profession: 'Enseignante',
          quartier: 'Mahamasina',
        },
        dateMariage: '1946-09-09',
        // Génération 3
        enfants: [
          {
            personne: {
              cle: 'david',
              prenom: 'David',
              appellation: 'Dave',
              sexe: 'M',
              dateNaissance: '1949-01-20',
              profession: 'Informaticien',
              quartier: 'Ivandry',
            },
            conjoint: {
              cle: 'emma-ratsimba',
              nom: 'Ratsimba',
              prenom: 'Emma',
              appellation: 'Emy',
              sexe: 'F',
              dateNaissance: '1952-03-08',
              profession: 'Graphiste',
              quartier: 'Ivandry',
            },
            dateMariage: '1974-06-19',
            // Génération 4
            enfants: [
              {
                personne: {
                  cle: 'lucas',
                  prenom: 'Lucas',
                  appellation: 'Lulu',
                  sexe: 'M',
                  dateNaissance: '1976-04-18',
                  profession: 'Développeur',
                  quartier: 'Ivandry',
                },
                conjoint: {
                  cle: 'nadia-ravao',
                  nom: 'Ravao',
                  prenom: 'Nadia',
                  sexe: 'F',
                  dateNaissance: '1978-05-12',
                  profession: 'Architecte',
                  quartier: 'Ivandry',
                },
                dateMariage: '1998-10-10',
                // Génération 5
                enfants: [
                  {
                    personne: {
                      cle: 'loic',
                      prenom: 'Loïc',
                      sexe: 'M',
                      dateNaissance: '2000-02-17',
                      profession: 'Développeur',
                      quartier: 'Ivandry',
                    },
                    conjoint: {
                      cle: 'miora-rakotoarisoa',
                      nom: 'Rakotoarisoa',
                      prenom: 'Miora',
                      sexe: 'F',
                      dateNaissance: '2001-06-14',
                      profession: 'Designer',
                      quartier: 'Ivandry',
                    },
                    dateMariage: '2022-09-17',
                    // Génération 6
                    enfants: [
                      {
                        personne: {
                          cle: 'rayan',
                          prenom: 'Rayan',
                          sexe: 'M',
                          dateNaissance: '2023-11-05',
                          quartier: 'Ivandry',
                        },
                      },
                    ],
                  },
                  {
                    personne: {
                      cle: 'lina',
                      prenom: 'Lina',
                      sexe: 'F',
                      dateNaissance: '2003-07-09',
                      profession: 'Designer',
                      quartier: 'Ivandry',
                    },
                    conjoint: {
                      cle: 'tahina-razafimandimby',
                      nom: 'Razafimandimby',
                      prenom: 'Tahina',
                      sexe: 'M',
                      dateNaissance: '2002-03-21',
                      profession: 'Ingénieur',
                      quartier: 'Ivandry',
                    },
                    dateMariage: '2024-07-20',
                    // Génération 6
                    enfants: [
                      {
                        personne: {
                          cle: 'zoe',
                          prenom: 'Zoé',
                          sexe: 'F',
                          dateNaissance: '2025-04-12',
                          quartier: 'Ivandry',
                        },
                      },
                    ],
                  },
                ],
              },
              {
                personne: {
                  cle: 'eva',
                  prenom: 'Eva',
                  sexe: 'F',
                  dateNaissance: '1980-11-02',
                  profession: 'Avocate',
                  quartier: 'Ivandry',
                },
              },
            ],
          },
          {
            personne: {
              cle: 'sarah',
              prenom: 'Sarah',
              appellation: 'Sary',
              sexe: 'F',
              dateNaissance: '1953-09-12',
              profession: 'Vétérinaire',
              quartier: 'Ankadifotsy',
            },
            conjoint: {
              cle: 'julien-rakotondrabe',
              nom: 'Rakotondrabe',
              prenom: 'Julien',
              appellation: 'Juju',
              sexe: 'M',
              dateNaissance: '1951-04-25',
              profession: 'Photographe',
              quartier: 'Ankadifotsy',
            },
            dateMariage: '1975-11-04',
            // Génération 4
            enfants: [
              {
                personne: {
                  cle: 'noah',
                  prenom: 'Noah',
                  sexe: 'M',
                  dateNaissance: '1977-08-27',
                  profession: 'Architecte',
                  quartier: 'Ankadifotsy',
                },
                conjoint: {
                  cle: 'clara-andriantsitohaina',
                  nom: 'Andriantsitohaina',
                  prenom: 'Clara',
                  sexe: 'F',
                  dateNaissance: '1980-01-30',
                  profession: 'Journaliste',
                  quartier: 'Ankadifotsy',
                },
                dateMariage: '2004-05-22',
                // Génération 5
                enfants: [
                  {
                    personne: {
                      cle: 'gabriel',
                      prenom: 'Gabriel',
                      appellation: 'Gaby',
                      sexe: 'M',
                      dateNaissance: '2006-03-11',
                      profession: 'Étudiant',
                      quartier: 'Ankadifotsy',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        personne: {
          cle: 'jeanne',
          prenom: 'Jeanne',
          appellation: 'Jeannette',
          sexe: 'F',
          dateNaissance: '1927-10-30',
          dateDeces: '2015-01-18',
          profession: 'Infirmière',
          quartier: 'Ambohipo',
        },
        conjoint: {
          cle: 'andre-rasolofo',
          nom: 'Rasolofo',
          prenom: 'André',
          appellation: 'Dédé',
          sexe: 'M',
          dateNaissance: '1924-12-03',
          dateDeces: '2001-06-22',
          profession: 'Chauffeur',
          quartier: 'Ambohipo',
        },
        dateMariage: '1948-12-15',
        // Génération 3
        enfants: [
          {
            personne: {
              cle: 'lalao',
              prenom: 'Lalao',
              sexe: 'F',
              dateNaissance: '1951-12-01',
              profession: 'Sage-femme',
              quartier: 'Analamahitsy',
            },
            conjoint: {
              cle: 'patrick-ramaroson',
              nom: 'Ramaroson',
              prenom: 'Patrick',
              appellation: 'Pat',
              sexe: 'M',
              dateNaissance: '1949-08-17',
              profession: 'Professeur',
              quartier: 'Analamahitsy',
            },
            dateMariage: '1973-09-26',
            // Génération 4
            enfants: [
              {
                personne: {
                  cle: 'chloe',
                  prenom: 'Chloé',
                  sexe: 'F',
                  dateNaissance: '1979-03-15',
                  profession: 'Médecin',
                  quartier: 'Analamahitsy',
                },
                conjoint: {
                  cle: 'hery-randrianarisoa',
                  nom: 'Randrianarisoa',
                  prenom: 'Hery',
                  sexe: 'M',
                  dateNaissance: '1978-09-05',
                  profession: 'Ingénieur',
                  quartier: 'Analamahitsy',
                },
                dateMariage: '2000-08-19',
                // Génération 5
                enfants: [
                  {
                    personne: {
                      cle: 'mia',
                      prenom: 'Mia',
                      appellation: 'Mimi',
                      sexe: 'F',
                      dateNaissance: '2001-12-04',
                      profession: 'Chargée de projet',
                      quartier: 'Analamahitsy',
                    },
                    conjoint: {
                      cle: 'mathis-rakotondrazaka',
                      nom: 'Rakotondrazaka',
                      prenom: 'Mathis',
                      sexe: 'M',
                      dateNaissance: '1999-12-08',
                      profession: 'Développeur',
                      quartier: 'Analamahitsy',
                    },
                    dateMariage: '2021-12-11',
                    // Génération 6
                    enfants: [
                      {
                        personne: {
                          cle: 'amelia',
                          prenom: 'Amélia',
                          sexe: 'F',
                          dateNaissance: '2022-06-30',
                          quartier: 'Analamahitsy',
                        },
                      },
                    ],
                  },
                  {
                    personne: {
                      cle: 'kanto',
                      prenom: 'Kanto',
                      sexe: 'M',
                      dateNaissance: '2005-06-27',
                      profession: 'Étudiant',
                      quartier: 'Analamahitsy',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        personne: {
          cle: 'michel',
          prenom: 'Michel',
          appellation: 'Michely',
          sexe: 'M',
          dateNaissance: '1932-05-22',
          dateDeces: '2010-09-05',
          profession: 'Comptable',
          quartier: 'Ambatobe',
        },
        conjoint: {
          cle: 'helene-randriamampionona',
          nom: 'Randriamampionona',
          prenom: 'Hélène',
          appellation: 'Lèna',
          sexe: 'F',
          dateNaissance: '1934-08-11',
          dateDeces: '2018-02-14',
          profession: 'Pharmacienne',
          quartier: 'Ambatobe',
        },
        dateMariage: '1955-07-07',
        // Génération 3
        enfants: [
          {
            personne: {
              cle: 'nicolas',
              prenom: 'Nicolas',
              appellation: 'Nico',
              sexe: 'M',
              dateNaissance: '1957-06-06',
              profession: 'Ingénieur',
              quartier: 'Ambatobe',
            },
            conjoint: {
              cle: 'laura-bemetra',
              nom: 'Bemetra',
              prenom: 'Laura',
              appellation: 'Lolo',
              sexe: 'F',
              dateNaissance: '1958-10-23',
              profession: 'Avocate',
              quartier: 'Ambatobe',
            },
            dateMariage: '1980-07-16',
            // Génération 4
            enfants: [
              {
                personne: {
                  cle: 'nathan',
                  prenom: 'Nathan',
                  appellation: 'Nath',
                  sexe: 'M',
                  dateNaissance: '1985-12-09',
                  profession: 'Ingénieur',
                  quartier: 'Ambatobe',
                },
              },
            ],
          },
          {
            // Branche monoparentale : aucun conjoint, l'enfant n'a qu'une mère.
            personne: {
              cle: 'tiana',
              prenom: 'Tiana',
              appellation: 'Tia',
              sexe: 'F',
              dateNaissance: '1960-02-28',
              profession: 'Médecin',
              quartier: 'Ambatobe',
            },
            // Génération 4
            enfants: [
              {
                personne: {
                  cle: 'maeva',
                  prenom: 'Maëva',
                  sexe: 'F',
                  dateNaissance: '1986-09-24',
                  profession: 'Enseignante',
                  quartier: 'Ambatobe',
                },
                conjoint: {
                  cle: 'tojo-rakotobe',
                  nom: 'Rakotobe',
                  prenom: 'Tojo',
                  sexe: 'M',
                  dateNaissance: '1984-11-11',
                  profession: 'Artisan',
                  quartier: 'Ambatobe',
                },
                dateMariage: '2010-04-03',
                // Génération 5
                enfants: [
                  {
                    personne: {
                      cle: 'elio',
                      prenom: 'Elio',
                      sexe: 'M',
                      dateNaissance: '2013-01-26',
                      profession: 'Collégien',
                      quartier: 'Ambatobe',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    cle: 'randria',
    nom: 'Randria',
    racine: {
      cle: 'honore',
      prenom: 'Honoré',
      appellation: 'Papa Honoré',
      sexe: 'M',
      dateNaissance: '1898-01-09',
      dateDeces: '1970-05-30',
      profession: 'Instituteur',
      quartier: 'Amparibe',
    },
    conjoint: {
      cle: 'odette-razafy',
      nom: 'Razafy',
      prenom: 'Odette',
      appellation: 'Mamy',
      sexe: 'F',
      dateNaissance: '1901-09-18',
      dateDeces: '1975-02-11',
      profession: 'Couturière',
      quartier: 'Amparibe',
    },
    dateMariage: '1923-04-02',
    // Génération 2
    enfants: [
      {
        personne: {
          cle: 'brigitte',
          prenom: 'Brigitte',
          sexe: 'F',
          dateNaissance: '1925-03-27',
          dateDeces: '2008-06-14',
          profession: 'Secrétaire',
          quartier: 'Tsaralalàna',
        },
        conjoint: {
          cle: 'serge-andriamalala',
          nom: 'Andriamalala',
          prenom: 'Serge',
          appellation: 'Sergio',
          sexe: 'M',
          dateNaissance: '1924-11-19',
          dateDeces: '2003-08-07',
          profession: 'Technicien',
          quartier: 'Tsaralalàna',
        },
        dateMariage: '1948-05-08',
        // Génération 3
        enfants: [
          {
            personne: {
              cle: 'kevin',
              prenom: 'Kevin',
              appellation: 'Kev',
              sexe: 'M',
              dateNaissance: '1950-05-03',
              profession: 'Pilote',
              quartier: 'Andravoahangy',
            },
            conjoint: {
              cle: 'aina-raveloson',
              nom: 'Raveloson',
              prenom: 'Aina',
              sexe: 'F',
              dateNaissance: '1952-12-12',
              profession: 'Dentiste',
              quartier: 'Andravoahangy',
            },
            dateMariage: '1974-04-12',
            // Génération 4
            enfants: [
              {
                personne: {
                  cle: 'ethan',
                  prenom: 'Ethan',
                  sexe: 'M',
                  dateNaissance: '1976-05-14',
                  profession: 'Ingénieur',
                  quartier: 'Andravoahangy',
                },
                conjoint: {
                  cle: 'vola-ramanantsoa',
                  nom: 'Ramanantsoa',
                  prenom: 'Vola',
                  sexe: 'F',
                  dateNaissance: '1978-08-03',
                  profession: 'Pharmacienne',
                  quartier: 'Andravoahangy',
                },
                dateMariage: '2001-06-16',
                // Génération 5
                enfants: [
                  {
                    personne: {
                      cle: 'mickael',
                      prenom: 'Mickaël',
                      appellation: 'Micka',
                      sexe: 'M',
                      dateNaissance: '2002-09-21',
                      profession: 'Développeur',
                      quartier: 'Andravoahangy',
                    },
                    conjoint: {
                      cle: 'constance-razafindrazaka',
                      nom: 'Razafindrazaka',
                      prenom: 'Constance',
                      sexe: 'F',
                      dateNaissance: '2003-10-30',
                      profession: 'Designer',
                      quartier: 'Andravoahangy',
                    },
                    dateMariage: '2023-12-02',
                    // Génération 6
                    enfants: [
                      {
                        personne: {
                          cle: 'aaron',
                          prenom: 'Aaron',
                          sexe: 'M',
                          dateNaissance: '2025-02-14',
                          quartier: 'Andravoahangy',
                        },
                      },
                    ],
                  },
                  {
                    personne: {
                      cle: 'andrea',
                      prenom: 'Andréa',
                      sexe: 'F',
                      dateNaissance: '2005-12-02',
                      profession: 'Étudiante',
                      quartier: 'Andravoahangy',
                    },
                  },
                ],
              },
              {
                personne: {
                  cle: 'lea',
                  prenom: 'Léa',
                  sexe: 'F',
                  dateNaissance: '1979-02-07',
                  profession: 'Pharmacienne',
                  quartier: 'Andravoahangy',
                },
                conjoint: {
                  cle: 'dimitri-randrianasolo',
                  nom: 'Randrianasolo',
                  prenom: 'Dimitri',
                  sexe: 'M',
                  dateNaissance: '1977-04-18',
                  profession: 'Médecin',
                  quartier: 'Andravoahangy',
                },
                dateMariage: '2003-09-13',
                // Génération 5
                enfants: [
                  {
                    personne: {
                      cle: 'louna',
                      prenom: 'Louna',
                      sexe: 'F',
                      dateNaissance: '2004-05-27',
                      profession: 'Architecte',
                      quartier: 'Andravoahangy',
                    },
                    conjoint: {
                      cle: 'nathaniel-rakotoarisoa',
                      nom: 'Rakotoarisoa',
                      prenom: 'Nathaniel',
                      sexe: 'M',
                      dateNaissance: '2003-06-08',
                      profession: 'Ingénieur',
                      quartier: 'Andravoahangy',
                    },
                    dateMariage: '2024-11-23',
                    // Génération 6
                    enfants: [
                      {
                        personne: {
                          cle: 'lily',
                          prenom: 'Lily',
                          sexe: 'F',
                          dateNaissance: '2026-01-30',
                          quartier: 'Andravoahangy',
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            personne: {
              cle: 'prisca',
              prenom: 'Prisca',
              appellation: 'Priscy',
              sexe: 'F',
              dateNaissance: '1954-11-07',
              profession: 'Chargée de communication',
              quartier: 'Andravoahangy',
            },
            conjoint: {
              cle: 'marc-razafindrakoto',
              nom: 'Razafindrakoto',
              prenom: 'Marc',
              appellation: 'Marco',
              sexe: 'M',
              dateNaissance: '1953-09-14',
              profession: 'Chef cuisinier',
              quartier: 'Andravoahangy',
            },
            dateMariage: '1976-08-22',
            // Génération 4
            enfants: [
              {
                personne: {
                  cle: 'hugo',
                  prenom: 'Hugo',
                  sexe: 'M',
                  dateNaissance: '1978-10-31',
                  profession: 'Journaliste',
                  quartier: 'Andravoahangy',
                },
                conjoint: {
                  cle: 'sandrine-andrianjafy',
                  nom: 'Andrianjafy',
                  prenom: 'Sandrine',
                  sexe: 'F',
                  dateNaissance: '1980-11-25',
                  profession: 'Avocate',
                  quartier: 'Andravoahangy',
                },
                dateMariage: '2006-04-08',
                // Génération 5
                enfants: [
                  {
                    personne: {
                      cle: 'maxime',
                      prenom: 'Maxime',
                      appellation: 'Max',
                      sexe: 'M',
                      dateNaissance: '2007-10-19',
                      profession: 'Lycéen',
                      quartier: 'Andravoahangy',
                    },
                  },
                  {
                    personne: {
                      cle: 'ines',
                      prenom: 'Inès',
                      sexe: 'F',
                      dateNaissance: '2010-03-05',
                      profession: 'Collégienne',
                      quartier: 'Andravoahangy',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        personne: {
          cle: 'lucien',
          prenom: 'Lucien',
          sexe: 'M',
          dateNaissance: '1930-07-14',
          dateDeces: '2014-02-25',
          profession: 'Architecte',
          quartier: 'Ambohipo',
        },
        conjoint: {
          cle: 'nathalie-rakotomalala',
          nom: 'Rakotomalala',
          prenom: 'Nathalie',
          appellation: 'Nathy',
          sexe: 'F',
          dateNaissance: '1932-04-02',
          dateDeces: '2020-01-15',
          profession: 'Journaliste',
          quartier: 'Ambohipo',
        },
        dateMariage: '1954-10-11',
        // Génération 3
        enfants: [
          {
            personne: {
              cle: 'yann',
              prenom: 'Yann',
              appellation: 'Yanou',
              sexe: 'M',
              dateNaissance: '1956-01-30',
              profession: 'Analyste données',
              quartier: 'Ambatoroka',
            },
            conjoint: {
              cle: 'fiona-ratsara',
              nom: 'Ratsara',
              prenom: 'Fiona',
              appellation: 'Fifi',
              sexe: 'F',
              dateNaissance: '1958-07-19',
              profession: 'Sage-femme',
              quartier: 'Ambatoroka',
            },
            dateMariage: '1980-03-08',
            // Génération 4
            enfants: [
              {
                personne: {
                  cle: 'jade',
                  prenom: 'Jade',
                  sexe: 'F',
                  dateNaissance: '1982-06-21',
                  profession: 'Avocate',
                  quartier: 'Ambatoroka',
                },
              },
            ],
          },
          {
            // Branche monoparentale : aucun conjoint, l'enfant n'a qu'une mère.
            personne: {
              cle: 'sophie',
              prenom: 'Sophie',
              sexe: 'F',
              dateNaissance: '1959-06-11',
              profession: 'Enseignante',
              quartier: 'Ambatoroka',
            },
            // Génération 4
            enfants: [
              {
                personne: {
                  cle: 'adam',
                  prenom: 'Adam',
                  sexe: 'M',
                  dateNaissance: '1984-01-22',
                  profession: 'Développeur',
                  quartier: 'Ambatoroka',
                },
                conjoint: {
                  cle: 'marina-rakotoson',
                  nom: 'Rakotoson',
                  prenom: 'Marina',
                  sexe: 'F',
                  dateNaissance: '1986-02-17',
                  profession: 'Graphiste',
                  quartier: 'Ambatoroka',
                },
                dateMariage: '2012-07-21',
                // Génération 5
                enfants: [
                  {
                    personne: {
                      cle: 'elodie',
                      prenom: 'Élodie',
                      appellation: 'Élo',
                      sexe: 'F',
                      dateNaissance: '2014-01-09',
                      profession: 'Collégienne',
                      quartier: 'Ambatoroka',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

/** UUID déterministe : le seed peut être relancé sans créer de doublons. */
function seedUuid(cle: string): string {
  const hex = createHash('sha256')
    .update(`efankatia:seed-personne:${cle}`)
    .digest('hex')

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-')
}

function sqlLiteral(value: string | null): string {
  if (value === null) return 'null'

  if (value.includes('\0')) {
    throw new Error(
      'Les valeurs du seed ne peuvent pas contenir de caractère nul.',
    )
  }

  return `'${value.replaceAll("'", "''")}'`
}

function sqlDate(value: string | null): string {
  return value === null ? 'null' : `${sqlLiteral(value)}::date`
}

/** Construit les lignes à insérer à partir de l'arbre déclaratif. */
function buildSeedRows(): {
  personnes: Array<PersonneRow>
  mariages: Array<MariageRow>
  parentEnfants: Array<ParentEnfantRow>
  mariageEnfants: Array<MariageEnfantRow>
  resume: Array<{ lignee: string; personnes: number; mariages: number }>
} {
  const personnes = new Map<string, PersonneRow>()
  const personnesParId = new Map<string, PersonneRow>()
  const mariages = new Map<string, MariageRow>()
  const parentEnfants = new Map<string, ParentEnfantRow>()
  const mariageEnfants = new Map<string, MariageEnfantRow>()
  const resume: Array<{ lignee: string; personnes: number; mariages: number }> =
    []

  function registerPersonne(
    lignee: LigneeSeed,
    personne: PersonneSeed,
    estLigneeGenerale: boolean,
  ): string {
    const cle = `${lignee.cle}:${personne.cle}`
    const nom = personne.nom ?? lignee.nom
    const existante = personnes.get(cle)

    if (existante) {
      const identique =
        existante.nom === nom &&
        existante.prenom === personne.prenom &&
        existante.dateNaissance === personne.dateNaissance &&
        existante.estLigneeGenerale === estLigneeGenerale

      if (!identique) {
        throw new Error(
          `Clé de seed dupliquée avec des données différentes : ${cle}`,
        )
      }

      return existante.id
    }

    const row: PersonneRow = {
      id: seedUuid(`personne:${cle}`),
      nom,
      prenom: personne.prenom,
      appellation: personne.appellation ?? null,
      sexe: personne.sexe,
      profession: personne.profession ?? null,
      dateNaissance: personne.dateNaissance,
      dateDeces: personne.dateDeces ?? null,
      pays: PAYS,
      ville: personne.ville ?? 'Antananarivo',
      quartier: personne.quartier ?? null,
      estLigneeGenerale,
    }

    personnes.set(cle, row)
    personnesParId.set(row.id, row)
    return row.id
  }

  function registerMariage(
    personne1Id: string,
    personne2Id: string,
    dateMariage: string | null,
  ): string {
    const [premier, second] = [personne1Id, personne2Id].sort()
    const cle = `${premier}:${second}`
    const existant = mariages.get(cle)

    if (existant) {
      if (existant.dateMariage !== dateMariage) {
        throw new Error(`Mariage dupliqué avec une date différente : ${cle}`)
      }

      return existant.id
    }

    const row: MariageRow = {
      id: seedUuid(`mariage:${cle}`),
      personne1Id,
      personne2Id,
      dateMariage,
    }

    mariages.set(cle, row)
    return row.id
  }

  function addParentEnfant(parentId: string, enfantId: string): void {
    const parent = personnesParId.get(parentId)

    if (!parent) {
      throw new Error(`Parent introuvable dans le seed : ${parentId}`)
    }

    parentEnfants.set(`${parentId}:${enfantId}`, {
      parentId,
      enfantId,
      typeParent: parent.sexe === 'M' ? 'pere' : 'mere',
    })
  }

  function addFamille(
    lignee: LigneeSeed,
    personne: PersonneSeed,
    conjoint: ConjointSeed | undefined,
    dateMariage: string | undefined,
    enfants: Array<EnfantSeed>,
  ): void {
    const personneId = registerPersonne(lignee, personne, true)
    let conjointId: string | undefined
    let mariageId: string | undefined

    if (conjoint) {
      conjointId = registerPersonne(lignee, conjoint, false)
      mariageId = registerMariage(personneId, conjointId, dateMariage ?? null)
    }

    for (const enfant of enfants) {
      const enfantId = registerPersonne(lignee, enfant.personne, true)

      addParentEnfant(personneId, enfantId)
      if (conjointId) addParentEnfant(conjointId, enfantId)
      if (mariageId) {
        mariageEnfants.set(`${mariageId}:${enfantId}`, {
          mariageId,
          enfantId,
        })
      }

      addFamille(
        lignee,
        enfant.personne,
        enfant.conjoint,
        enfant.dateMariage,
        enfant.enfants ?? [],
      )
    }
  }

  for (const lignee of LIGNEES) {
    const personnesAvant = personnes.size
    const mariagesAvant = mariages.size

    addFamille(
      lignee,
      lignee.racine,
      lignee.conjoint,
      lignee.dateMariage,
      lignee.enfants,
    )

    resume.push({
      lignee: lignee.nom,
      personnes: personnes.size - personnesAvant,
      mariages: mariages.size - mariagesAvant,
    })
  }

  return {
    personnes: [...personnes.values()],
    mariages: [...mariages.values()],
    parentEnfants: [...parentEnfants.values()],
    mariageEnfants: [...mariageEnfants.values()],
    resume,
  }
}

function buildSeedSql({
  personnes,
  mariages,
  parentEnfants,
  mariageEnfants,
}: ReturnType<typeof buildSeedRows>): string {
  const personneIds = personnes.map((personne) => personne.id)

  const personnesSql = personnes
    .map(
      (personne) => `    (
      ${sqlLiteral(personne.id)}::uuid,
      ${sqlLiteral(personne.nom)},
      ${sqlLiteral(personne.prenom)},
      ${sqlLiteral(personne.appellation)},
      ${sqlLiteral(personne.sexe)},
      ${sqlLiteral(personne.profession)},
      ${sqlDate(personne.dateNaissance)},
      ${sqlDate(personne.dateDeces)},
      ${sqlLiteral(personne.pays)},
      ${sqlLiteral(personne.ville)},
      ${sqlLiteral(personne.quartier)},
      ${personne.estLigneeGenerale ? 'true' : 'false'}
    )`,
    )
    .join(',\n')

  const mariagesSql = mariages
    .map(
      (mariage) => `    (
      ${sqlLiteral(mariage.id)}::uuid,
      ${sqlLiteral(mariage.personne1Id)}::uuid,
      ${sqlLiteral(mariage.personne2Id)}::uuid,
      ${sqlDate(mariage.dateMariage)}
    )`,
    )
    .join(',\n')

  const parentEnfantsSql = parentEnfants
    .map(
      (lien) => `    (
      ${sqlLiteral(lien.parentId)}::uuid,
      ${sqlLiteral(lien.enfantId)}::uuid,
      ${sqlLiteral(lien.typeParent)}
    )`,
    )
    .join(',\n')

  const mariageEnfantsSql = mariageEnfants
    .map(
      (lien) => `    (
      ${sqlLiteral(lien.mariageId)}::uuid,
      ${sqlLiteral(lien.enfantId)}::uuid
    )`,
    )
    .join(',\n')

  return `
do $efankatia_seed_personnes$
begin
  -- Réinitialise uniquement les fiches créées par ce seed (liens compris).
  delete from public.mariage_enfants
   where enfant_id = any (array[${personneIds.map(sqlLiteral).join(', ')}]::uuid[]);

  delete from public.parent_enfants
   where parent_id = any (array[${personneIds.map(sqlLiteral).join(', ')}]::uuid[])
      or enfant_id = any (array[${personneIds.map(sqlLiteral).join(', ')}]::uuid[]);

  delete from public.mariages
   where personne_1_id = any (array[${personneIds.map(sqlLiteral).join(', ')}]::uuid[])
      or personne_2_id = any (array[${personneIds.map(sqlLiteral).join(', ')}]::uuid[]);

  delete from public.personnes
   where id = any (array[${personneIds.map(sqlLiteral).join(', ')}]::uuid[]);

  insert into public.personnes (
    id,
    nom,
    prenom,
    appellation,
    sexe,
    profession,
    date_naissance,
    date_deces,
    pays,
    ville,
    quartier,
    "estLigneeGenerale"
  )
  values
${personnesSql};

  insert into public.mariages (
    id,
    personne_1_id,
    personne_2_id,
    date_mariage
  )
  values
${mariagesSql};

  insert into public.parent_enfants (
    parent_id,
    enfant_id,
    type_parent
  )
  values
${parentEnfantsSql};

  insert into public.mariage_enfants (
    mariage_id,
    enfant_id
  )
  values
${mariageEnfantsSql};
end
$efankatia_seed_personnes$;
`.trimStart()
}

function main(): void {
  const rows = buildSeedRows()
  const { personnes, mariages, parentEnfants, mariageEnfants, resume } = rows

  console.log('🌱 Seed de test — 2 lignées sur 6 générations')
  for (const lignee of resume) {
    console.log(
      `   • ${lignee.lignee} : ${lignee.personnes} personnes, ${lignee.mariages} unions`,
    )
  }
  console.log(
    `   Total : ${personnes.length} personnes, ${mariages.length} unions, ` +
      `${parentEnfants.length} liens parent-enfant, ` +
      `${mariageEnfants.length} liens mariage-enfant.`,
  )
  console.log(`   Cible : ${resolveSeedDbTarget()}`)

  runSeedQuery(buildSeedSql(rows))

  console.log('✅ Seed personnes de test terminé.')
}

try {
  main()
} catch (error: unknown) {
  console.error(
    '❌ Échec du seed personnes de test :',
    error instanceof Error ? error.message : error,
  )
  process.exitCode = 1
}
