# From OS 137 LabAssets to CLAM

Updated 7 November 2026, Asia/Manila. This describes the maintained implementation, not a claim that every master requirement is complete.

## Foundation retained

CLAM extends the groupmate project `os137_computer_laboratory_asset_management_system`, originally branded LabAssets. The original React interface, page structure, asset records, assignments/returns, maintenance, category/laboratory management, reports, users, settings and activity concepts form its foundation. Original source remains in `groupmate-original/` and the relocation backup.

| Area | Original project | Maintained CLAM |
|---|---|---|
| Frontend | React, Vite, Tailwind, Lucide | Retained and adapted to the PHP API |
| Backend | Python FastAPI | PHP 8.2 services and API routes |
| Deployment database | SQLite demo / PostgreSQL instructions | Existing Ubuntu MySQL at 192.168.56.10:3306 |
| Database name | labassets naming in original deployment | labassets; earlier normalized clams_db design is not the active foundation |
| Authentication | JWT-based original flow | PHP sessions, CSRF checks, throttling, password hashing and compatibility with original password hashes |
| Roles | Admin, technician, viewer | Six university role references, compatibility aliases, server permissions; scoped integration remains partial |
| Destructive actions | Original delete endpoints | Archive/deactivate/cancel behavior with history retained and dependency guards |
| Branding | LabAssets / purple accent | Official CLAM logo, burgundy accents, solid colors and shared themes |

The seven original database contracts are users, laboratories, categories, assets, assignments, maintenance_records and activity_logs. Original columns/relationships remain the foundation. Additive migrations extend that structure; a schema table alone does not establish a working workflow. The current checked ledger is labassets-003. Required reference data and optional demo data are separate; demo import is not automatic.

## Working behavior ported and improved

- Assets: filtered/searchable/sorted/paginated inventory, registration, edit, detail, reference validation, duplicate checks and history-preserving archival.
- Assignments: staff checkout, due dates, derived overdue state, physical return and returned-history archival. Transaction checks prevent conflicting checkout/maintenance operations.
- Maintenance: schedule, update, start, complete, cancel and archive work orders. Multiple open repairs do not incorrectly restore availability.
- Laboratories/categories: create/edit and counts, guarded deactivation. Room is omitted when adding a laboratory; existing Room values remain editable.
- Reports: real database summaries and asset, assignment and maintenance CSV exports; spreadsheet-formula protection.
- Accounts: create/edit/deactivate, role references, profile/password changes, self/last-administrator protection. Password hashes are not returned to the UI.
- Activity: actor/action/entity records and redacted change snapshots.

## Asset form and inventory refinements

The 24 persisted form fields are retained. Visible “sticker” wording became Property information while compatibility field keys stayed unchanged. Official property numbers remain distinct from generated internal tags. Property/package amounts remain distinct from individual item cost; unknown amounts are not invented.

The compact table shows Internal inventory tag, Official property number, Item name, Category, Current laboratory, Operational status, Condition and Actions. Optional property, technical, acquisition, custodian, borrower and record-date details appear under View. Search, filters, sorting, page size, pagination, horizontal scrolling and column controls remain.

## Interface and analytics

The shared layout uses readable typography, cool-gray page surfaces, white light-mode navigation/cards, burgundy primary actions and moderate corner radii. Status and condition badges use solid colors. The logo is not stretched and keeps a light backing.

Dark mode is available in the header and Login. Auto follows the operating system; explicit choices persist across reloads. An early script applies the theme before the app renders. Shared forms, tables, dialogs and charts adapt to dark colors. No gradients, glows, glass effects or decorative chart animations were added.

Dashboard heading: Laboratory overview. Summary cards cover registered assets, available equipment, awaiting return and open maintenance. Chart components support category, status, laboratory, monthly assignments/returns and maintenance activity using recorded data and permission checks. Reports also include inventory/status/condition/category/laboratory and maintenance visualizations. Empty and unavailable data are distinguished; no placeholder trends are generated.

## Relocation and private files

Active project: `C:\xampp\htdocs\os137_computer_laboratory_asset_management_system`.

The original OneDrive folder remains. The previous destination and both Git metadata sets were preserved. The active repository retains the groupmate's initial commit and GitHub remote; current CLAM changes remain uncommitted. No automatic push occurred.

Apache serves only public/, with private project paths denied even through default htdocs URLs. Uploads/sessions remain outside public/. Runtime MySQL uses labassets_app restricted to the Windows host 192.168.56.1; no database password belongs in documentation.

## Still incomplete

The full master specification remains the target. Remaining work includes per-laboratory/owner scopes for four nonadministrative roles; borrowing requests with approval/release, multiple items and partial returns; full workstation grouping; transfer, audit and authorized disposal workflows; QR generation/scanning; protected photo/attachment upload/delivery; notifications/scheduling; institutional administration and the full PDF/Excel/report catalog.

Existing direct checkout is not a complete approval-based borrowing system. A retired status is not an approved disposal workflow. Reference permissions and schema support do not imply these screens/routes are implemented.

## Evidence and limits

Recent frontend checks: build passed, lint had zero errors and 22 existing warnings, 14 frontend tests passed. PHP fixture checks: 13 inventory and 39 operation checks passed; these are isolated fixtures, not live MySQL write tests. Login was visually inspected in both themes at desktop/mobile sizes before relocation.

Relocation: 15,272 copied files hash-verified; PHP/extensions/autoload passed; the new-location database diagnostic passed with a temporary development override; SELECT-only reads succeeded; login/static resources returned 200; unauthenticated API returned 401; tested default htdocs private paths returned 403. No database records were changed during relocation.

Authenticated end-to-end workflow acceptance, MySQL concurrency and full role-by-role desktop/mobile verification remain outstanding. Guest-console identity confirmation remains manual. See RELOCATION-REPORT.md for exact evidence and startup instructions.
