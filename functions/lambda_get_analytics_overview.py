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
            # Get overall dashboard metrics
            overview_metrics = {}
            
            # Total pools
            cur.execute("SELECT COUNT(*) FROM pool")
            overview_metrics["total_pools"] = cur.fetchone()[0]
            
            # Active pools (not ended yet)
            cur.execute("SELECT COUNT(*) FROM pool WHERE end_at >= CURRENT_DATE")
            overview_metrics["active_pools"] = cur.fetchone()[0]
            
            # Successful pools (reached min_quantity)
            cur.execute("""
                SELECT COUNT(DISTINCT p.id)
                FROM pool p
                WHERE (SELECT COALESCE(SUM(r.quantity), 0) 
                       FROM request r 
                       WHERE r.pool_id = p.id) >= p.min_quantity
            """)
            overview_metrics["successful_pools"] = cur.fetchone()[0]
            
            # Total revenue
            cur.execute("""
                SELECT COALESCE(SUM(r.quantity * pr.unit_price), 0)
                FROM request r
                JOIN pool p ON r.pool_id = p.id
                JOIN product pr ON p.product_id = pr.id
            """)
            overview_metrics["total_revenue"] = float(cur.fetchone()[0])
            
            # Total savings
            cur.execute("""
                SELECT COALESCE(SUM(
                    CASE 
                        WHEN (SELECT COALESCE(SUM(r2.quantity), 0) 
                              FROM request r2 
                              WHERE r2.pool_id = r.pool_id) >= p.min_quantity 
                        THEN r.quantity * pr.unit_price * 0.15
                        ELSE 0
                    END
                ), 0)
                FROM request r
                JOIN pool p ON r.pool_id = p.id
                JOIN product pr ON p.product_id = pr.id
            """)
            overview_metrics["total_savings"] = float(cur.fetchone()[0])
            
            # Total customers
            cur.execute("SELECT COUNT(DISTINCT email) FROM request")
            overview_metrics["total_customers"] = cur.fetchone()[0]
            
            # Total products
            cur.execute("SELECT COUNT(*) FROM product")
            overview_metrics["total_products"] = cur.fetchone()[0]
            
            # Total quantity sold
            cur.execute("SELECT COALESCE(SUM(quantity), 0) FROM request")
            overview_metrics["total_quantity_sold"] = int(cur.fetchone()[0])
            
            # Success rate
            if overview_metrics["total_pools"] > 0:
                overview_metrics["success_rate"] = round(
                    (overview_metrics["successful_pools"] / overview_metrics["total_pools"]) * 100, 
                    2
                )
            else:
                overview_metrics["success_rate"] = 0

            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps(overview_metrics),
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

