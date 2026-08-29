# Audit database trust boundary

Audit migrations must run through a dedicated migration/administration role. The API's
`DATABASE_URL` must use a separate non-superuser role that cannot create roles, bypass row
security, create objects in `public`, own `audit_logs`, create triggers on `audit_logs`, or assume
`effect_audit_owner`. API startup verifies these properties and refuses an unsafe connection.

Migration 004 owns the table and its authorized user-deletion function with the no-login,
memberless `effect_audit_owner` role. User deletion invokes that `SECURITY DEFINER` function; the
audit update trigger accepts only its exact `actor_id`-to-null transition and rejects all other
updates and deletes. Trigger depth is deliberately not treated as authorization.

PostgreSQL administrators and migration credentials remain trusted: like every database control,
they can replace the functions, triggers, role memberships, or table ownership. They must never be
used by the running application or exposed through `DATABASE_URL`.

The development Compose topology provisions `effect_migrator` for the one-shot migration service
and `effect` for the API. Existing development volumes created by the earlier single-superuser
topology must be recreated or have their roles corrected before the startup check will accept them.
