import json
import os

import psycopg2

db_host = os.environ.get("DB_HOST")
db_port = os.environ.get("DB_PORT")
db_name = os.environ.get("DB_NAME")
db_user = os.environ.get("DB_USER")
db_password = os.environ.get("DB_PASSWORD")


def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            dbname=db_name,
            user=db_user,
            password=db_password,
        )
        return conn

    except psycopg2.Error as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return None


def drop_tables(conn):
    drop_statements = [
        "DROP TABLE IF EXISTS request CASCADE;",
        "DROP TABLE IF EXISTS pool CASCADE;",
        "DROP TABLE IF EXISTS product CASCADE;",
        "DROP TABLE IF EXISTS user_role CASCADE;",
    ]

    drop_triggers = [
        "DROP TRIGGER IF EXISTS update_products_updated_at ON product CASCADE;",
        "DROP TRIGGER IF EXISTS update_pools_updated_at ON pool CASCADE;",
        "DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;",
    ]

    try:
        with conn.cursor() as cur:
            for trigger_sql in drop_triggers:
                cur.execute(trigger_sql)
                print(f"Executed: {trigger_sql}")

            for table_sql in drop_statements:
                cur.execute(table_sql)
                print(f"Executed: {table_sql}")

            conn.commit()
            return True

    except psycopg2.Error as e:
        print(f"Error dropping tables: {e}")
        conn.rollback()
        return False


def handler(event, context):
    conn = get_db_connection()
    if conn is None:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Could not connect to the database"}),
        }

    try:
        success = drop_tables(conn)

        if success:
            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps(
                    {
                        "message": "All tables dropped successfully",
                        "tables_dropped": ["request", "pool", "product", "user_role"],
                        "note": "You can now run rds_init to recreate the tables",
                    }
                ),
            }
        else:
            return {
                "statusCode": 500,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Failed to drop tables"}),
            }

    except (Exception, psycopg2.Error) as e:
        print(f"Error in handler: {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps(
                {
                    "error": "An error occurred during table destruction",
                    "details": str(e),
                }
            ),
        }

    finally:
        if conn:
            conn.close()
