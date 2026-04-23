# DocScan — Product Requirements Document
> Version 1.1 — Mars 2025 — Solo dev / Cursor

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Modèle de données métier — Workspaces](#2-modèle-de-données-métier--workspaces)
3. [Utilisateurs & Personas](#3-utilisateurs--personas)
4. [Fonctionnalités](#4-fonctionnalités)
5. [Architecture technique](#5-architecture-technique)
6. [Design & UX](#6-design--ux)
7. [Roadmap](#7-roadmap)
8. [Sécurité](#8-sécurité)
9. [Contraintes & Hypothèses](#9-contraintes--hypothèses)
10. [Coûts estimatifs](#10-coûts-estimatifs)
11. [Checklist de démarrage](#11-checklist-de-démarrage)

---

## 1. Vue d'ensemble

### Problème résolu

Un entrepreneur gérant plusieurs entreprises doit aujourd'hui jongler entre des fichiers Excel séparés, des catégories comptables différentes par entité, et des règles de saisie propres à chaque structure. Chaque document capturé doit atterrir au bon endroit, dans le bon Google Sheet, avec les bonnes catégories — sans erreur de destination.

### Solution

**DocScan** est une application web multi-workspace qui permet de :
- Switcher en un clic entre ses entreprises (workspaces)
- Capturer ou uploader une pièce comptable dans le contexte de l'entreprise active
- Extraire automatiquement les données clés via IA (OpenAI Vision)
- Valider et corriger avec les catégories et règles propres à cette entreprise
- Exporter automatiquement vers le **Google Sheet dédié** à cette entreprise
- Préparer l'intégration **QuickBooks** par entité (Phase 3)

### Principe clé : le Workspace

> Chaque entreprise est un **Workspace** isolé.
> Changer de Workspace = changer de Google Sheet + catégories + règles comptables.
> Un document ne peut appartenir qu'à **un seul Workspace**.

### Objectifs produit

- Zéro erreur de destination : impossible d'exporter dans le mauvais Sheet
- Standardisation des catégories par entreprise, pas par utilisateur
- Historique isolé et auditable par entité légale
- Navigation fluide entre entreprises sans reconnexion
- Préparer l'intégration QuickBooks par entité (Phase 3)

### KPIs de succès

| Indicateur | Cible MVP | Cible Phase 3 |
|---|---|---|
| Temps moyen de traitement / document | < 45 secondes | < 20 secondes |
| Taux d'extraction correcte (IA) | > 85% | > 95% |
| Documents traités / mois | 300 | 1 000+ |
| Réduction des erreurs manuelles | 80% | 98% |
| Workspaces actifs | 3–5 entreprises | Illimité |

---

## 2. Modèle de données métier — Workspaces

### Hiérarchie des entités

```
Utilisateur (owner)
└── Workspace A  (ex: Clinique Makati)
│   ├── Google Sheet propre
│   ├── Catégories propres  (Transport, Fournitures médicales...)
│   ├── Règles comptables propres  (Grab → Transport)
│   └── Documents  (historique isolé)
│
└── Workspace B  (ex: Clinique BGC)
│   ├── Google Sheet propre
│   ├── Catégories propres
│   ├── Règles comptables propres
│   └── Documents
│
└── Workspace C  (ex: Holding / Management Co)
    ├── Google Sheet propre
    ├── Catégories propres  (Dividendes, Frais de gestion...)
    ├── Règles comptables propres
    └── Documents
```

### Règles de gestion fondamentales

- Un document appartient à **exactement un Workspace** — non modifiable après validation
- Les catégories d'un Workspace **ne sont pas visibles** dans un autre
- Le Google Sheet configuré pour un Workspace reçoit **uniquement** les documents de ce Workspace
- Un utilisateur peut avoir **autant de Workspaces qu'il veut**
- Un Workspace peut avoir **plusieurs membres** avec des rôles différents (Phase 2)
- Le Workspace actif est **persistant en session** (mémorisé à la reconnexion)

### Ce qui est partagé vs isolé

| Élément | Partagé entre Workspaces | Isolé par Workspace |
|---|:---:|:---:|
| Compte utilisateur | ✅ | |
| Documents | | ✅ |
| Google Sheet de destination | | ✅ |
| Catégories comptables | | ✅ |
| Règles fournisseur → catégorie | | ✅ |
| Historique & recherche | | ✅ |
| Membres / accès | | ✅ |

---

## 3. Utilisateurs & Personas

### Persona A — L'entrepreneur multi-entités

| Attribut | Détail |
|---|---|
| Profil | Thomas, 41 ans, entrepreneur |
| Contexte | Possède 3–5 entreprises (cliniques, holding, société de gestion) |
| Problème | Mélange des dépenses entre entités, mauvais Sheets, retraitement comptable mensuel |
| Objectif | Capturer un reçu, choisir la bonne entité, que ça parte au bon endroit automatiquement |
| Niveau tech | À l'aise web, pas développeur |
| Usage principal | Desktop pour validation, mobile pour capture rapide |

### Persona B — Le comptable / responsable financier

| Attribut | Détail |
|---|---|
| Profil | Jerome, 42 ans, CFO ou comptable externe |
| Contexte | Accède à un ou plusieurs Workspaces pour validation et export |
| Problème | Reçoit des données désorganisées, perd du temps à retraiter |
| Objectif | Trouver tous les documents d'une entité, proprement catégorisés |
| Niveau tech | Utilisateur QuickBooks, à l'aise avec les tableaux |
| Usage principal | Interface web desktop uniquement |

### Rôles & permissions

| Rôle | Permissions | Périmètre |
|---|---|---|
| `owner` | Tout + créer/supprimer Workspace + configurer Sheet | Son Workspace |
| `admin` | Tout sauf supprimer le Workspace | Son Workspace |
| `operator` | Upload, photo, valider ses propres docs | Son Workspace |

> MVP : un seul owner par Workspace, pas de partage entre users.
> Phase 2 : invitations membres avec rôles.

---

## 4. Fonctionnalités

### Matrice de priorité

| Fonctionnalité | MVP | Phase 2 | Phase 3 |
|---|:---:|:---:|:---:|
| Création et gestion de Workspaces | ✅ | | |
| Sélecteur de Workspace (sidebar) | ✅ | | |
| Upload photo / PDF par Workspace | ✅ | | |
| OCR + parsing IA (OpenAI Vision) | ✅ | | |
| Catégories propres par Workspace | ✅ | | |
| Règles fournisseur → catégorie | ✅ | | |
| Écran de review & correction | ✅ | | |
| Export Google Sheet dédié par Workspace | ✅ | | |
| Authentification (email + Google OAuth) | ✅ | | |
| Historique isolé par Workspace | ✅ | | |
| Invitation membres dans un Workspace | | ✅ | |
| Ingestion email par Workspace (Make.com) | | ✅ | |
| WhatsApp Business API | | ✅ | |
| Feedback loop / apprentissage IA | | ✅ | |
| Export QuickBooks par Workspace | | | ✅ |
| Dashboard analytique par Workspace | | | ✅ |
| App mobile native | | | ✅ |

---

### F-00 : Gestion des Workspaces ⭐

**Création d'un Workspace :**
- Nom de l'entreprise
- Couleur d'identification (utilisée dans la sidebar et les badges)
- Logo (optionnel)
- Devise principale (PHP par défaut)
- Configuration Google Sheet (ID du Sheet + nom de l'onglet)
- Catégories initiales (choisir parmi les défauts ou créer les siennes)

**Sélecteur de Workspace (sidebar gauche) :**
- Liste de tous les Workspaces de l'utilisateur
- Workspace actif mis en évidence (couleur + nom dans le header)
- Bouton "+ Nouveau Workspace" en bas de liste
- Clic sur un Workspace → switch instantané, contenu rechargé
- Workspace actif mémorisé en session

```
[Sidebar]
  🟦 Clinique Makati     ← actif (highlight)
  🟩 Clinique BGC
  🟧 Holding Co
  ─────────────────
  + Nouveau Workspace
```

---

### F-01 : Capture de document

Le Workspace actif est affiché en permanence dans le header.

- **Photo** : prise de photo depuis la caméra du device
- **Upload** : drag & drop — formats : `PNG`, `JPG`, `HEIC`, `PDF`
- Pré-traitement : recadrage, correction perspective, amélioration contraste

> ⚠️ Le Workspace de destination est affiché et confirmé avant validation. Non modifiable après export.

---

### F-02 : Extraction IA (OpenAI GPT-4o Vision)

| Champ extrait | Exemple | Requis |
|---|---|:---:|
| Date du document | 2025-03-15 | ✅ |
| Nom du fournisseur | Grab Philippines | ✅ |
| Montant total (TTC) | 350.00 | ✅ |
| Devise | PHP | ✅ |
| Montant TVA / VAT | 37.50 | |
| Montant HT | 312.50 | |
| Mode de paiement | Cash / GCash / Card | |
| Type de document | Facture / Reçu / Ticket | ✅ |
| Numéro de référence | INV-2025-0042 | |
| Catégorie suggérée | Transport | ✅ (suggérée) |

La catégorie suggérée est matchée contre les catégories **du Workspace actif uniquement**.

Si une règle fournisseur existe (ex: "Grab" → "Transport"), la catégorie est pré-remplie automatiquement.

**Format JSON retourné :**
```json
{
  "date": "2025-03-15",
  "vendor": "Grab Philippines",
  "total_amount": 350.00,
  "currency": "PHP",
  "vat_amount": 37.50,
  "net_amount": 312.50,
  "payment_method": "GCash",
  "document_type": "receipt",
  "reference_number": "GRB-20250315-001",
  "suggested_category": "Transport",
  "confidence": 0.92
}
```

---

### F-03 : Écran de review & validation

Split-view avec le Workspace actif affiché dans le header :
- **Gauche** : aperçu du document original (zoomable)
- **Droite** : formulaire avec les champs extraits, tous éditables inline

Champs du formulaire :
- Tous les champs IA (éditables)
- **Catégorie** : dropdown avec les catégories **du Workspace actif uniquement**
- Note libre
- Workspace de destination (affiché, non modifiable)

Actions :
- **Valider & Exporter** → écrit dans le Google Sheet du Workspace actif
- **Rejeter** → archive sans export

---

### F-04 : Export Google Sheets (par Workspace)

Chaque Workspace a son propre `sheets_id` + `sheets_tab` configurés dans les paramètres. L'export écrit toujours dans le Sheet du Workspace actif.

**Structure de la ligne exportée :**

| Colonne | Contenu | Source |
|---|---|---|
| Date | Date du document | IA |
| Fournisseur | Nom extrait | IA |
| Montant TTC | Valeur numérique | IA |
| TVA | Valeur numérique | IA |
| Montant HT | Calculé | Système |
| Devise | PHP par défaut | IA |
| Catégorie | Choisie en review | Utilisateur |
| Mode paiement | Extrait ou saisi | IA / Utilisateur |
| Notes | Texte libre | Utilisateur |
| Source | upload / photo / email | Système |
| Lien document | URL Supabase Storage | Système |
| Statut | Validé / Rejeté | Système |
| Ajouté par | Email utilisateur | Auth |

---

### F-05 : Catégories & Règles par Workspace

**Catégories :**
- Liste propre par Workspace — invisible depuis les autres Workspaces
- CRUD complet dans `/settings/categories`
- Code comptable par catégorie (pour QuickBooks Phase 3)

**Catégories par défaut proposées à la création :**
```
Transport, Repas & Représentation, Fournitures médicales,
Équipements, Loyer, Utilities, Marketing, Salaires,
Frais bancaires, Autres
```

**Règles fournisseur → catégorie :**
- Associer un nom de fournisseur → une catégorie automatique
- Ex : "Grab" → "Transport" | "Mercury Drug" → "Fournitures médicales"
- Propres au Workspace, gérées dans `/settings/rules`
- Si règle trouvée → catégorie pré-remplie en review (modifiable)

---

## 5. Architecture technique

### Stack retenue

| Couche | Technologie | Justification |
|---|---|---|
| Frontend + Backend | **Next.js 14** (App Router) | Full-stack TS en un projet, idéal Cursor |
| Base de données | **Supabase** (PostgreSQL) | DB + Auth + Storage en un service |
| Stockage fichiers | **Supabase Storage** | Inclus, S3-compatible, signed URLs |
| Authentification | **Supabase Auth** | OAuth Google + email + RLS natif |
| IA / OCR | **OpenAI GPT-4o Vision** | OCR + parsing en un seul appel API |
| Export MVP | **Google Sheets API v4** | Écriture dans le Sheet du Workspace |
| Automatisation | **Make.com** | Ingestion email Phase 2, zéro code |
| Déploiement | **Vercel** | CI/CD Next.js natif, preview branches |
| Export final | **QuickBooks API** | Phase 3 — OAuth 2.0 par Workspace |

---

### Flux de données MVP

```
[Utilisateur — Workspace "Clinique Makati" actif]
    │
    └── Upload photo/PDF
           │
           ▼
[Next.js Frontend]
    │  Upload → Supabase Storage (/workspace_id/doc_id/file)
    ▼
[Next.js API Route : /api/process]
    │  workspace_id transmis dans la requête
    │  Appel OpenAI GPT-4o Vision
    ▼
[OpenAI API]  ← retourne JSON structuré
    │
    ▼
[Supabase DB]
    │  document créé avec workspace_id (status: pending)
    │  suggested_category matchée contre categories du Workspace
    │  règles fournisseur appliquées
    ▼
[Next.js Frontend : /documents/[id]/review]
    │  Catégories = celles du Workspace actif uniquement
    │  Utilisateur valide / corrige
    ▼
[Next.js API Route : /api/export]
    │  Récupère sheets_id + sheets_tab du Workspace
    │  Appel Google Sheets API v4
    ▼
[Google Sheet du Workspace "Clinique Makati"]
    │
    ▼
[Supabase DB]  ← status: validated, exported_at: now()
```

---

### Schéma de base de données

#### Table `workspaces` ⭐ CENTRALE
```sql
CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID REFERENCES auth.users(id) NOT NULL,
  name        TEXT NOT NULL,
  logo_url    TEXT,
  currency    TEXT DEFAULT 'PHP',
  color       TEXT DEFAULT '#1A56DB',  -- couleur d'identification UI
  sheets_id   TEXT,                    -- ID Google Sheet dédié
  sheets_tab  TEXT,                    -- Nom de l'onglet cible
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table `workspace_members` (Phase 2)
```sql
CREATE TABLE workspace_members (
  workspace_id  UUID REFERENCES workspaces(id),
  user_id       UUID REFERENCES auth.users(id),
  role          TEXT CHECK (role IN ('owner', 'admin', 'operator')),
  PRIMARY KEY (workspace_id, user_id)
);
```

#### Table `categories` (propres à chaque Workspace)
```sql
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) NOT NULL,
  name          TEXT NOT NULL,
  account_code  TEXT,            -- Code QuickBooks (Phase 3)
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table `vendor_rules` (règles par Workspace)
```sql
CREATE TABLE vendor_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  UUID REFERENCES workspaces(id) NOT NULL,
  vendor_match  TEXT NOT NULL,   -- Ex: "Grab", "Mercury Drug"
  category_id   UUID REFERENCES categories(id) NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table `documents`
```sql
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id    UUID REFERENCES workspaces(id) NOT NULL,
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  file_url        TEXT NOT NULL,
  extracted_data  JSONB,
  validated_data  JSONB,
  category_id     UUID REFERENCES categories(id),
  status          TEXT CHECK (status IN ('pending', 'validated', 'rejected')),
  source          TEXT CHECK (source IN ('upload', 'photo', 'email', 'whatsapp')),
  exported_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

#### Row Level Security (RLS)
```sql
-- Documents : isolation stricte par Workspace owner
CREATE POLICY "workspace_isolation" ON documents
  FOR ALL USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Même logique sur categories et vendor_rules
```

---

### Structure du projet Next.js

```
docscan/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                    # Layout avec sidebar Workspaces
│   │   ├── dashboard/page.tsx
│   │   ├── documents/
│   │   │   ├── page.tsx                  # Historique du Workspace actif
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/review/page.tsx
│   │   ├── settings/
│   │   │   ├── categories/page.tsx       # Catégories du Workspace actif
│   │   │   ├── rules/page.tsx            # Règles fournisseur → catégorie
│   │   │   └── sheets/page.tsx           # Config Google Sheet du Workspace
│   │   └── workspaces/
│   │       └── new/page.tsx
│   └── api/
│       ├── process/route.ts              # Upload → OpenAI → DB
│       └── export/route.ts              # DB → Google Sheet du Workspace
├── components/
│   ├── WorkspaceSidebar.tsx              # Liste + switch Workspaces
│   ├── WorkspaceBadge.tsx                # Badge Workspace actif dans header
│   ├── DocumentCard.tsx
│   ├── ReviewPanel.tsx
│   ├── UploadZone.tsx
│   ├── CategorySelector.tsx             # Filtrée par Workspace actif
│   └── StatusBadge.tsx
├── lib/
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   ├── openai.ts
│   ├── sheets.ts                        # Utilise sheets_id du Workspace
│   └── workspace.ts                     # getActiveWorkspace()
├── hooks/
│   └── useWorkspace.ts                  # Context + state Workspace actif
├── PRD.md
└── .env.local
```

---

### Gestion du Workspace actif

```typescript
// hooks/useWorkspace.ts
// Stocké dans : React Context + localStorage + Supabase profil user

interface WorkspaceContext {
  activeWorkspace: Workspace | null
  workspaces: Workspace[]
  switchWorkspace: (id: string) => void
  isLoading: boolean
}
```

---

### Variables d'environnement

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## 6. Design & UX

### Principes

- **Workspace toujours visible** : nom + couleur du Workspace actif dans le header et la sidebar en permanence
- **Pas d'ambiguïté** : le Workspace de destination est confirmé visuellement avant chaque export
- **Switch rapide** : changer de Workspace en 1 clic, sans rechargement de page
- **Épuré et professionnel** : zéro bruit visuel
- **Mobile-first** : optimisé pour la capture photo sur smartphone

### Palette de couleurs

```
Primary   : Indigo  #1A56DB
Accent    : Sky     #0EA5E9
Success   : Green   #059669
Warning   : Amber   #D97706
Text      : Slate   #1E293B
Muted     : #64748B
Background: #F8FAFC
```

> Chaque Workspace a sa propre couleur d'identification (sidebar + badge header).

### Layout principal

```
┌──────────────────────────────────────────────────────────┐
│  Header : [DocScan]     [🟦 Clinique Makati ▾]    [User] │
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  Sidebar   │           Contenu principal                 │
│            │                                             │
│ 🟦 Makati  │  Dashboard / Documents / Review...          │
│ 🟩 BGC     │                                             │
│ 🟧 Holding │                                             │
│ ────────── │                                             │
│ + Nouveau  │                                             │
│            │                                             │
└────────────┴─────────────────────────────────────────────┘
```

### Parcours utilisateur principal

| Étape | Ce que voit l'utilisateur | Durée visée |
|---|---|---|
| 1 — Accueil | Dashboard du Workspace actif | 0s |
| 2 — Switch | Clic sur autre Workspace dans la sidebar | 1s |
| 3 — Capture | Bouton "Nouveau document" → Photo / Upload | 5s |
| 4 — Upload | Drag & drop + Workspace affiché en header | 10s |
| 5 — Traitement | Loader "Analyse en cours..." | 5–10s |
| 6 — Review | Split-view + catégories du Workspace actif | 20–30s |
| 7 — Validation | Bouton Valider + confirmation Workspace | 2s |
| 8 — Confirmation | Toast "Exporté vers [Clinique Makati] ✓" | 0s |

---

## 7. Roadmap

### Phase 1 — MVP (8 semaines)

| Semaine | Objectif | Livrables |
|---|---|---|
| S1 | Setup infrastructure | Next.js + Supabase + Auth + Vercel |
| S2 | Système Workspaces | CRUD Workspaces + sidebar + context global |
| S3 | Upload & stockage | Upload photo/PDF isolé par Workspace |
| S4 | Intégration OpenAI | GPT-4o Vision + parsing + matching catégories |
| S5 | Écran de review | Split-view + catégories Workspace + validation |
| S6 | Export Google Sheets | API Sheets par Workspace + config settings |
| S7 | Règles & catégories | CRUD catégories + règles fournisseur par Workspace |
| S8 | Polish & go-live | Design final, 3 entreprises pilotes |

### Phase 2 (S9–S14)

| Fonctionnalité | Approche | Complexité |
|---|---|---|
| Ingestion email par Workspace | Make.com : email dédié → webhook DocScan | Faible |
| Invitation membres Workspace | Email invite + rôle | Moyenne |
| WhatsApp Business | Twilio / Meta API | Moyenne |
| Feedback loop IA | Corrections → prompt enrichi par Workspace | Moyenne |

### Phase 3 (S15+)

| Fonctionnalité | Notes |
|---|---|
| Export QuickBooks par Workspace | OAuth 2.0 configuré par entité |
| Dashboard analytique | Charts par Workspace, catégorie, fournisseur |
| App mobile native | React Native ou PWA |
| Rapports PDF par Workspace | Généré par période |

---

## 8. Sécurité

### Isolation des Workspaces

- **RLS Supabase** : toutes les tables filtrées par `workspace_id` + `owner_id`
- **API Routes** : vérification systématique que le `workspace_id` de la requête appartient à l'utilisateur authentifié
- **Storage** : fichiers organisés par Workspace (`/workspace_id/doc_id/file`)
- **Google Sheets** : `sheets_id` stocké en DB uniquement, jamais exposé côté client

### Risques & mitigations

| Risque | Mitigation |
|---|---|
| Export dans le mauvais Workspace | `workspace_id` non modifiable après création document |
| Accès cross-Workspace | RLS + vérification `owner_id` dans chaque API route |
| Clé OpenAI exposée | Serveur-side uniquement (API routes Next.js) |
| Clé Google Service Account exposée | `.env.local` serveur, jamais dans le bundle client |
| Rate limiting OpenAI | Queue + retry backoff exponentiel |

---

## 9. Contraintes & Hypothèses

### Contraintes techniques

- Développement solo Cursor → un seul repo TypeScript
- OpenAI Vision : limite 20MB par image → compression avant envoi
- Google Sheets API : quota 100 req/100s → file d'attente si exports simultanés
- Make.com : plan payant pour > 1000 opérations/mois (Phase 2)

### Hypothèses métier

- Un entrepreneur gère 2–10 Workspaces maximum
- Chaque Workspace a un Google Sheet existant (ou en crée un)
- Les reçus sont en anglais ou tagalog — GPT-4o gère les deux
- TVA philippine 12% VAT = cas principal
- QuickBooks Online (pas Desktop) pour Phase 3

---

## 10. Coûts estimatifs

> Base : 1000 documents/mois répartis sur plusieurs Workspaces

| Service | Usage estimé | Coût mensuel |
|---|---|---|
| OpenAI GPT-4o Vision | 1000 appels × ~0.01 USD | ~10 USD |
| Supabase Pro | DB + Auth + Storage 8GB | ~25 USD |
| Vercel Pro | Déploiement Next.js | ~20 USD |
| Make.com | 2000 opérations/mois (Phase 2) | ~10 USD |
| Google Sheets API | Gratuit jusqu'aux quotas élevés | 0 USD |
| **Total** | | **~55 USD/mois** |

---

## 11. Checklist de démarrage

| # | Action | Service | Priorité |
|---|---|---|---|
| 1 | Créer projet Next.js 14 (App Router + TypeScript + Tailwind) | Terminal | 🔴 Bloquant |
| 2 | Créer projet Supabase + configurer Auth Google OAuth | supabase.com | 🔴 Bloquant |
| 3 | Créer clé API OpenAI (GPT-4o) | platform.openai.com | 🔴 Bloquant |
| 4 | Activer Google Sheets API + créer Service Account + JSON key | console.cloud.google.com | 🔴 Bloquant |
| 5 | Créer un Google Sheet test par entreprise pilote | Google Drive | 🔴 Bloquant |
| 6 | Connecter repo GitHub + déployer sur Vercel | vercel.com | 🟡 Semaine 1 |
| 7 | Créer le schéma DB Supabase + activer RLS | Supabase Studio | 🟡 Semaine 1 |
| 8 | Configurer Make.com (compte déjà actif) | make.com | 🟢 Phase 2 |

---

*DocScan PRD v1.1 — Document vivant, mis à jour à chaque fin de phase.*
