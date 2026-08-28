#!/bin/bash
# ============================================================================
# CampusFind :: database bootstrap
#
# The official postgres image only executes files placed directly in
# /docker-entrypoint-initdb.d and does not recurse into sub-directories.
# The SQL lives in ./database/<migrations|functions|views|triggers|seeds>,
# mounted read-only at /sql, and this script applies it in dependency order.
#
# Order matters:
#   migrations -> tables must exist first
#   functions  -> triggers reference them, views may call them
#   views      -> depend on tables
#   triggers   -> attach the functions to the tables
#   seeds      -> inserted last so triggers fire and audit history is real
# ============================================================================
set -euo pipefail

run_dir() {
    local dir="$1"
    if [ ! -d "/sql/${dir}" ]; then
        echo ">>> skipping ${dir} (not mounted)"
        return
    fi
    echo ""
    echo "==================== ${dir} ===================="
    for file in /sql/"${dir}"/*.sql; do
        [ -e "$file" ] || continue
        echo ">>> applying $(basename "$file")"
        psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -q -f "$file"
    done
}

echo "CampusFind :: initialising database '${POSTGRES_DB}'"

run_dir migrations
run_dir functions
run_dir views
run_dir triggers
run_dir seeds

echo ""
echo "CampusFind :: database ready."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -c "
  SELECT
    (SELECT COUNT(*) FROM users)       AS users,
    (SELECT COUNT(*) FROM lost_items)  AS lost_items,
    (SELECT COUNT(*) FROM found_items) AS found_items,
    (SELECT COUNT(*) FROM matches)     AS matches,
    (SELECT COUNT(*) FROM claims)      AS claims,
    (SELECT COUNT(*) FROM audit_logs)  AS audit_rows;
"
