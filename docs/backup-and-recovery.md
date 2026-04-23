## Anti-Perte: Backup et Recuperation

### 1) Limiter le risque OneDrive

- Clic droit sur le dossier `App test 1/docscan` dans l'explorateur.
- Choisir `Toujours conserver sur cet appareil`.
- Verifier que l'icone de synchronisation indique bien un fichier local disponible hors ligne.

### 2) Backup manuel (recommande avant toute grosse modif)

Depuis le dossier `docscan`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-docscan.ps1
```

Le backup ZIP est genere dans:

`%USERPROFILE%\Documents\DocScanBackups`

Exclusions automatiques:
- `node_modules`
- `.next`
- `.vercel`
- `.env.local` (secret)

### 3) Verifier la configuration locale

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-env.ps1
```

### 4) Automatiser backup quotidien (Windows Task Scheduler)

Commande exemple (22h00 tous les jours):

```powershell
schtasks /Create /TN "DocScanDailyBackup" /SC DAILY /ST 22:00 /TR "powershell -ExecutionPolicy Bypass -File \"C:\Users\henri\OneDrive\Documents\Primacare dental app\App test 1\docscan\scripts\backup-docscan.ps1\"" /F
```

### 5) Recuperation rapide

- Prendre le dernier ZIP dans `DocScanBackups`.
- Extraire vers un dossier de secours, par exemple `C:\Projects\docscan-recovery`.
- Copier ensuite seulement les changements voulus dans le projet principal.

### 6) Rotation des secrets

Si une cle est exposee (capture ecran/chat):
- revoquer immediatement la cle dans le provider (Google/OpenAI/Supabase)
- generer une nouvelle cle
- mettre a jour `.env.local`
- redemarrer `npm run dev`
