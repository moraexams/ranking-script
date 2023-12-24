# Mora Exams Scripts

## Conversion Script

Requirement: Turso CLI if using turso, Instuctions to install:

https://docs.turso.tech/tutorials/get-started-turso-cli/step-01-installation

Make sure to login to the turso account you are going to create the database in

```bash
turso auth login
#or
turso auth signup
```

### Setup

1. Copy the mysql dump to `sql2sqlite` folder
2. Run the following from the main directory `ranking-script`

   ```bash
   ./sql2sqlite/convert.sh
   ```

3. Copy the relevant environment variables to .env

#### Todo: improve the flow by integrating the scripts using `Bun.spawn` and integrate drizzle studio for instant tables access

## Ranking Script

This repository contains the scripts which does z-score, rank calculations for
Mora Exams. The calculations are currently done inside a libsql (fork of sqlite)
database (locally or hosted on Turso).

### Setup

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

### An Important Note

Currently, sqlite's SQRT function is used while calculating z-score. SQRT
function is only available when sqlite is compiled using the
`-DSQLITE_ENABLE_MATH_FUNCTIONS` compile-time option.

If it's hosted on Turso, the math functions extensions must be enabled while
instantiating the project. The option cannot be edited for existing projects.

If it's a local database, currently there are no known workarounds :(
