# Mora Exams Scripts

## Conversion Script

Converts MySQL dump to SQLite3 compatible dump (including MySQL `KEY xxxxx`
statements from the `CREATE` block). sql2sqlite is directly cloned from
https://github.com/dumblob/mysql2sqlite

Additional Scripting is done to make the mora exams 23 workflow of converting
from sql to sqlite easier in some ways.

Requirement: Turso CLI if using turso, Instuctions to install:

https://docs.turso.tech/tutorials/get-started-turso-cli/step-01-installation

Make sure to login to the turso account you are going to create the database in

```bash
turso auth login
#or
turso auth signup
```

### Setup

1. Dump the mysql database as SQL.
2. Copy the mysql dump (must be a .sql file) to `sql2sqlite` folder
3. Run the following from the main directory `ranking-script`
   ```bash
   ./sql2sqlite/convert.sh
   ```
4. Copy the relevant environment variables to .env

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
LOCAL_DB_FILE="./me23.db"
TURSO_DATABASE_AUTH_TOKEN=""
TURSO_DATABASE_URL=""
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

Currently you can create an sqlite dump of an already created turso databse with
math functions enabled using

```bash
turso db shell hosted_db_name .dump > sqlite_dump.sql
```

It still doesn't prove that we can create a locally accessible db file using
this method. Further testing is required on how to convert this to an sqlite db
file and whether the enabled math functions are preserved in the dump.
