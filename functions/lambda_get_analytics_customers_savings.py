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
        with conn.cursor() as cur:
            # Get customer savings metrics
            # Calculate: total savings per customer, number of pools joined, total quantity purchased
            # First, get pool totals to determine which pools reached min_quantity
            cur.execute(
                """
                WITH pool_totals AS (
                    SELECT 
                        pool_id,
                        COALESCE(SUM(quantity), 0) as total_quantity
                    FROM request
                    GROUP BY pool_id
                )
                SELECT
                    r.email,
                    COUNT(DISTINCT r.pool_id) as pools_joined,
                    SUM(r.quantity) as total_quantity_purchased,
                    SUM(r.quantity * pr.unit_price) as total_spent,
                    SUM(
                        CASE 
                            WHEN pt.total_quantity >= p.min_quantity 
                            THEN r.quantity * pr.unit_price * 0.15
                            ELSE 0
                        END
                    ) as total_savings
                FROM request r
                JOIN pool p ON r.pool_id = p.id
                JOIN product pr ON p.product_id = pr.id
                LEFT JOIN pool_totals pt ON r.pool_id = pt.pool_id
                GROUP BY r.email
                ORDER BY total_savings DESC
            """
            )
            customers = cur.fetchall()
            
            customer_savings = []
            for row in customers:
                customer_savings.append({
                    "email": row[0],
                    "pools_joined": int(row[1]),
                    "total_quantity_purchased": int(row[2]),
                    "total_spent": float(row[3]) if row[3] is not None else 0,
                    "total_savings": float(row[4]) if row[4] is not None else 0,
                })

            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps(customer_savings),
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

