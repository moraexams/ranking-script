#!/bin/bash
cd $(dirname $0)

# define color and formatting codes
RED='\033[1;31m'
GREEN='\033[1;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m' # no Color

# check if dump_mysql.sql exists
if [ -f "dump_mysql.sql" ]; then
    # ask for confirmation before deleting
    echo -e "${YELLOW}dump_mysql.sql file exists.${NC}"
    read -p $'\e[1;33mAre you sure you want to delete the existing dump_mysql.sql file? (y/n) \e[0m' confirm
    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
        rm "dump_mysql.sql"
        echo -e "${GREEN}Existing dump_mysql.sql file deleted.${NC}"
    else
        echo -e "${RED}File deletion cancelled.${NC}"
        read -p $'\e[1;34mDo you want to proceed with the existing dump_mysql.sql file? (y/n) \e[0m' confirm
        if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
            echo -e "${RED}Operation cancelled.${NC}"
            exit 1
        fi
    fi
fi

# find all .sql files in the current directory
files=$(find . -maxdepth 1 -name "*.sql")

# save the current IFS
OLD_IFS=$IFS

# change IFS to newline character
IFS=$'\n'

# convert the list of files into an array
files_array=($files)

# restore the IFS
IFS=$OLD_IFS
YEAR=$(date +"%y")
CURRENT=$(date +"%m%d%H%M")
CURR_DB_NAME=me${YEAR}_${CURRENT}.db

# check if more than one file was found
if [ ${#files_array[@]} -gt 1 ]; then
    echo -e "${RED}Error: More than one .sql file found in the current directory.${NC}"
    exit 1
elif [ ${#files_array[@]} -eq 1 ]; then
    # rename the found file to dump_mysql.sql
    mv "${files_array[0]}" "dump_mysql.sql"
    echo -e "${GREEN}sql file renamed to dump_mysql.sql${NC}"
    ./mysql2sqlite dump_mysql.sql | sqlite3 db_exports/${CURR_DB_NAME}
    echo -e "${BLUE}Converted to sqlite3 db in db_exports directory.${NC}"

    # check for old files in the exports directory
    old_files=$(ls -t db_exports | tail -n +2)

    # if there are any old files, ask for confirmation before deleting
    if [ -n "$old_files" ]; then
        echo -e "${YELLOW}Old files found in the db_exports directory:${NC}"
        echo "$old_files"
        read -p $'\e[1;34mDo you want to delete these files? (y/n) \e[0m' confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            # delete the old files
            for file in $old_files; do
                rm "db_exports/$file"
            done
            echo -e "${GREEN}Old files deleted.${NC}"
        else
            echo -e "${RED}File deletion cancelled.${NC}"
        fi
        read -p $'\e[1;34mDo you want to upload the last file to turso? (y/n) \e[0m' confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            # upload to the current signed in account in turso with math support
            read -p $'\e[1;34mEnter the name of the database to upload: \e[0m' db_name
            turso db create --enable-extensions --from-file "./db_exports/${CURR_DB_NAME}" "${db_name}"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}URL Details: ${NC}"
                turso db show ${db_name} | grep -A 1 'URL:'
                echo -e "${GREEN}Token: ${NC}"
                turso db tokens create ${db_name}
                echo -e "${GREEN}Copy the URL and token and have fun.${NC}"
            else
                echo -e "${RED}Upload to Turso failed.${NC}"
            fi
        else
            echo -e "${RED}File upload to turso cancelled.${NC}"
        fi
    fi
else
    echo -e "${RED}No .sql file found in the current directory.${NC}"
fi
