# Ranking Script

This repository contains the scripts which does z-score, rank calculations for
Mora Exams. The calculations are currently done inside a libsql (fork of sqlite)
database (locally or hosted on Turso).

## Setup

To install dependencies:

```bash
bun install
```

Next, the database connection must be set up. The database can either be local
or hosted on Turso.

If the database is hosted on Turso, these environment variables must be setup
(example values are provided).

```
IS_LOCAL=false
LOCAL_DB_FILE="./me22.db"
PUBLIC_TURSO_DATABASE_AUTH_TOKEN=""
PUBLIC_TURSO_DATABASE_URL=""
```

After setting up these values, the script can be ran using:

```bash
bun start
```

## An Important Note

Currently, sqlite's SQRT function is used while calculating z-score. SQRT
function is only available when sqlite is compiled using the
`-DSQLITE_ENABLE_MATH_FUNCTIONS` compile-time option.

If it's hosted on Turso, the math functions extensions must be enabled while
instantiating the project. The option cannot be edited for existing projects.

If it's a local database, currently there are no known workarounds :(

This project was created using `bun init` in bun v1.0.18.
