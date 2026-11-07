# CLAM operations quickstart

Active directory:

```text
C:\xampp\htdocs\os137_computer_laboratory_asset_management_system
```

## Start

Keep the existing Ubuntu VM/MySQL running and XAMPP MySQL stopped. The current PHP listener may already occupy port 8080; do not start a second listener on that port.

```powershell
Set-Location 'C:\xampp\htdocs\os137_computer_laboratory_asset_management_system'
& 'C:\xampp\php\php.exe' -S 127.0.0.1:8080 -t public public/router.php
```

Open http://127.0.0.1:8080/login. Ctrl+F5 reloads the built interface after an update.

## Database check

```powershell
Set-Location 'C:\xampp\htdocs\os137_computer_laboratory_asset_management_system'
$previousAppEnv = [Environment]::GetEnvironmentVariable('APP_ENV', 'Process')
try {
    $env:APP_ENV = 'development'
    & 'C:\xampp\php\php.exe' bin/check-database.php
} finally {
    [Environment]::SetEnvironmentVariable('APP_ENV', $previousAppEnv, 'Process')
}
```

Connection: Ubuntu MySQL 192.168.56.10:3306 / labassets / labassets_app. Its password stays in the private .env. Do not overwrite that file, import demo records automatically, reset accounts or run schema scripts merely to start the app.

## Using the main pages

| Page | Typical workflow |
|---|---|
| Dashboard | Review real inventory/loan/maintenance summaries and charts |
| Assets | Search/filter, register one individually tagged item, edit, View optional details; Delete archives only where authorized |
| Assignments | Authorized staff checkout, due dates and physical returns |
| Maintenance | Create/schedule/update repair work and record completion/cancellation |
| Laboratories / Categories | Maintain locations and classifications; deactivation is guarded |
| Reports | Read summaries/charts and export supported CSV reports |
| Activity | Authorized review of recorded actions |
| Users | Authorized account administration |
| Settings | Own profile and password functions |

Use View for optional asset information. Keep official property numbers and internal generated tags separate. Do not copy a package cost into individual-item cost without evidence. See USERS-AND-ROLES.md for current access limitations.

## Development and verification

From the project directory:

```powershell
& 'C:\xampp\php\php.exe' 'C:\ProgramData\ComposerSetup\bin\composer.phar' check-platform-reqs
Set-Location frontend
npm.cmd test
npm.cmd run lint
npm.cmd run build
```

Rebuild only after frontend source/configuration changes. Output is public/ui/. PHP runs the maintained backend; groupmate-original/ is reference source. Logs, sessions and uploads remain private under storage/. Do not serve the project root.

Apache configuration: C:\xampp\apache\conf\extra\httpd-vhosts.conf. Validate changes with C:\xampp\apache\bin\httpd.exe -t before restarting Apache. The clams.local site serves only public/ and is restricted to local clients; its hosts-file entry is a manual setup step. See RELOCATION-REPORT.md.

## Git and backups

GitHub Desktop → File → Add Local Repository → select the active directory. Existing CLAM changes are uncommitted; review them before committing. Do not initialize/clone over this folder. Keep .env, uploads, sessions, generated account directory and backups out of commits.

The previous destination is preserved outside htdocs at C:\xampp\clam-migration-backups\20261107-201613. The original OneDrive copy remains. Backups are not a substitute for a tested database restore procedure; use docs/BACKUP.md and the current administrative setup guidance.

## Documentation index

- CLAM-CHANGE-SUMMARY.md — original project versus maintained CLAM, delivered work and open scope.
- USERS-AND-ROLES.md — account usage and actual role access.
- USERS-ACCOUNTS.local.md — private, Git-ignored live account snapshot.
- RELOCATION-REPORT.md — copy, Git, Apache and database verification evidence.
- CLAM-THEME-ASSET-FIELDS.md — detailed theme/form/table changes.
- WORKFLOW-PORT.md — original behavior port and compatibility decisions.
- REQUIREMENTS.md / STATUS.md — historical audits; some entries describe earlier phases. Read the newer summary and dated verification reports before interpreting them as current.

No master requirement is removed by this quickstart. Missing scoped roles, approval-based multi-item borrowing, QR, protected attachments, transfer/audit/disposal workflows and other unfinished modules remain development work.
