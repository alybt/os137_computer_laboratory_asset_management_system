# CLAM users and roles

Updated 7 November 2026. This guide describes source-enforced access, not only the intended reference permissions.

## Current account list

The local-only `USERS-ACCOUNTS.local.md` file contains a read-only snapshot of the current database accounts: ID, name, email, stored role and active state. It is ignored by Git. Passwords, password hashes, reset tokens, sessions and database credentials are excluded. Treat it as an account directory, not a credential list. Account changes made later require refreshing the snapshot.

## Roles and actual availability

| Role code | Display name | Current operational access |
|---|---|---|
| super_admin | Super Administrator | Global operational pages and administrative actions, subject to validation and record guards |
| property_admin | Property Administrator | Global property operations only where its configured permission allows; not unrestricted user/laboratory/loan administration |
| lab_admin | Laboratory Administrator | Authentication/profile/password functions; scoped operational access unfinished |
| it_personnel | IT Personnel | Authentication/profile/password functions; scoped operational access unfinished |
| faculty | Faculty | Authentication/profile/password functions; borrowing-request workflow unfinished |
| student | Student | Authentication/profile/password functions; borrowing-request workflow unfinished |

Legacy aliases resolve admin → super_admin, technician → it_personnel and viewer → student. Existing stored strings need not be rewritten merely to resolve an alias.

The API explicitly restricts global operational routes to super_admin/property_admin, then checks the route permission. The frontend exposes write, loan, repair, laboratory and administrative controls according to its current role rules. Reference grants for future modules do not override the API restriction. Login success does not guarantee access to unfinished role-specific pages.

## Sign in and account maintenance

1. Open http://127.0.0.1:8080/login.
2. Use the exact email and the account's privately assigned password.
3. An authorized administrator can manage users through Users, with validation and last-admin/self-deactivation guards.
4. Users can update their own profile and change their password with current-password verification in Settings where the page is reachable.
5. Deactivation retains history. Do not delete records directly in MySQL to remove an account.

Original README demo passwords are not a list of current live credentials. Demo data is optional and is not automatically imported. Passwords cannot be recovered from the account directory. Use the existing authorized reset process if needed; never paste a password into a Markdown file or Git commit.

## Administrative tools

- `bin/provision-admin.php`: initial administrator provisioning.
- `bin/provision-role-accounts.php`: role-account provisioning.
- `bin/reset-password.php`: operator password reset.
- `bin/check-database.php`: CLI-only database diagnostic; development override required.

Read each command's current usage and authentication documentation before changing accounts. This documentation task does not create, reset, deactivate or change any account.

## Troubleshooting

- Sign-in unsuccessful: verify spelling, active state and the assigned password; check the database diagnostic. The public error deliberately avoids revealing sensitive details.
- HTTP 401: no valid authenticated session; sign in again.
- HTTP 403: insufficient permission or unfinished scoped access; changing the password will not grant access.
- Application service unavailable: inspect private logs and run the diagnostic. Do not switch to Windows MySQL or import a new schema as a shortcut.

Relevant implementation: app/Controllers/Api.php, app/Services/Auth.php, frontend/src/context/AuthContext.jsx and database/seed.sql.
