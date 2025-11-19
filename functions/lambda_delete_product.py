import json
import os

import psycopg2

db_host = os.environ.get("DB_HOST")
db_port = os.environ.get("DB_PORT")
db_name = os.environ.get("DB_NAME")
db_user = os.environ.get("DB_USER")
db_password = os.environ.get("DB_PASSWORD")

HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "DELETE,OPTIONS",
}


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


def handler(event, context):
    conn = get_db_connection()
    if conn is None:
        return {
            "statusCode": 500,
            "headers": HEADERS,
            "body": json.dumps({"error": "Could not connect to the database"}),
        }

    try:
        product_id = event["pathParameters"]["id"]
        with conn.cursor() as cur:
            cur.execute("DELETE FROM product WHERE id = %s RETURNING id", (product_id,))
            deleted_id = cur.fetchone()
            conn.commit()

            if not deleted_id:
                return {
                    "statusCode": 404,
                    "headers": HEADERS,
                    "body": json.dumps({"error": "Product not found"}),
                }

            return {
                "statusCode": 200,
                "headers": HEADERS,
                "body": json.dumps({"message": "Product deleted successfully"}),
            }

    except (Exception, psycopg2.Error) as e:
        print(f"Error executing query: {e}")
        conn.rollback()
        return {
            "statusCode": 500,
            "headers": HEADERS,
            "body": json.dumps(
                {
                    "error": "An error occurred",
                    "details": str(e),
                }
            ),
        }

    finally:
        if conn:
            conn.close()
