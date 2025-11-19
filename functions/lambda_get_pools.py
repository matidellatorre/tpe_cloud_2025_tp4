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
        email_filter = None
        if event.get("queryStringParameters"):
            email_filter = event["queryStringParameters"].get("email")

        with conn.cursor() as cur:
            if email_filter:
                cur.execute(
                    """
                    SELECT p.id, p.product_id, p.start_at, p.end_at, p.min_quantity, p.created_at,
                        p.updated_at, p.status, COALESCE(SUM(r.quantity), 0) as joined
                    FROM pool p
                    INNER JOIN product prod ON p.product_id = prod.id
                    LEFT JOIN request r ON p.id = r.pool_id
                    WHERE prod.email = %s
                    GROUP BY p.id, p.product_id, p.start_at, p.end_at, p.min_quantity, p.created_at, p.updated_at
                    ORDER BY p.created_at DESC
                    """,
                    (email_filter,),
                )
            else:
                cur.execute(
                    """
                    SELECT p.id, p.product_id, p.start_at, p.end_at, p.min_quantity, p.created_at,
                        p.updated_at, p.status, COALESCE(SUM(r.quantity), 0) as joined
                    FROM pool p
                    LEFT JOIN request r ON p.id = r.pool_id
                    GROUP BY p.id, p.product_id, p.start_at, p.end_at, p.min_quantity, p.created_at, p.updated_at
                    ORDER BY p.created_at DESC
                    """
                )

            pools = cur.fetchall()
            pool_list = [
                {
                    "id": row[0],
                    "product_id": row[1],
                    "start_at": row[2].isoformat(),
                    "end_at": row[3].isoformat(),
                    "min_quantity": row[4],
                    "created_at": row[5].isoformat(),
                    "updated_at": row[6].isoformat(),
                    "status": row[7],
                    "joined": int(row[8]),
                }
                for row in pools
            ]
            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps(pool_list),
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
