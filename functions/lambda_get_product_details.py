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


def handler(event, context):
    conn = get_db_connection()
    if conn is None:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Could not connect to the database"}),
        }

    try:
        product_id = event["pathParameters"]["id"]
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, description, category, unit_price, image_url, created_at, updated_at FROM product WHERE id = %s",
                (product_id,),
            )
            product = cur.fetchone()

            if product:
                product_details = {
                    "id": product[0],
                    "name": product[1],
                    "description": product[2],
                    "category": product[3],
                    "unit_price": float(product[4]) if product[4] is not None else None,
                    "image_url": product[5],
                    "created_at": product[6].isoformat(),
                    "updated_at": product[7].isoformat(),
                }

                return {
                    "statusCode": 200,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps(product_details),
                }

            else:
                return {
                    "statusCode": 404,
                    "body": json.dumps({"error": "Product not found"}),
                }

    except (Exception, psycopg2.Error) as e:
        print(f"Error executing query: {e}")
        return {
            "statusCode": 500,
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
