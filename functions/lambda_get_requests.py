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
            "headers": {"Access-Control-Allow-Origin": "*"},
            "body": json.dumps({"error": "Could not connect to the database"}),
        }

    try:
        # Obtener parámetros de query
        query_params = event.get("queryStringParameters", {}) or {}
        email = query_params.get("email")
        pool_id = query_params.get("pool_id")

        # Validar que al menos uno de los parámetros esté presente
        if not email and not pool_id:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps(
                    {"error": "Either 'email' or 'pool_id' parameter is required"}
                ),
            }

        with conn.cursor() as cur:
            # Si se proporciona email, buscar por email
            if email:
                cur.execute(
                    """
                    SELECT 
                        r.id, 
                        r.pool_id, 
                        r.email, 
                        r.quantity, 
                        r.created_at,
                        p.product_id,
                        p.start_at,
                        p.end_at,
                        p.min_quantity
                    FROM request r
                    LEFT JOIN pool p ON r.pool_id = p.id
                    WHERE r.email = %s
                    ORDER BY r.created_at DESC
                    """,
                    (email,),
                )
                requests = cur.fetchall()
                request_list = [
                    {
                        "id": row[0],
                        "pool_id": row[1],
                        "email": row[2],
                        "quantity": row[3],
                        "created_at": row[4].isoformat(),
                        "pool": {
                            "product_id": row[5],
                            "start_at": row[6].isoformat() if row[6] else None,
                            "end_at": row[7].isoformat() if row[7] else None,
                            "min_quantity": row[8],
                        }
                        if row[5]
                        else None,
                    }
                    for row in requests
                ]

            # Si se proporciona pool_id, buscar por pool_id
            elif pool_id:
                cur.execute(
                    "SELECT id, pool_id, email, quantity, created_at FROM request WHERE pool_id = %s ORDER BY created_at DESC",
                    (pool_id,),
                )
                requests = cur.fetchall()
                request_list = [
                    {
                        "id": row[0],
                        "pool_id": row[1],
                        "email": row[2],
                        "quantity": row[3],
                        "created_at": row[4].isoformat(),
                    }
                    for row in requests
                ]

            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps(request_list),
            }

    except (Exception, psycopg2.Error) as e:
        print(f"Error executing query: {e}")
        return {
            "statusCode": 500,
            "headers": {"Access-Control-Allow-Origin": "*"},
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
