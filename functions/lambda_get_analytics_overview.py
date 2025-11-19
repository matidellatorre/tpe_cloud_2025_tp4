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


def get_user_sub_from_token(event):
    try:
        request_context = event.get("requestContext", {})
        authorizer = request_context.get("authorizer", {})

        claims = authorizer.get("claims", {})
        if not claims:
            jwt = authorizer.get("jwt", {})
            claims = jwt.get("claims", {})

        sub = claims.get("sub")
        if sub:
            return sub

        return None
    except Exception as e:
        print(f"Error extracting sub from token: {e}")
        return None


def check_user_role(conn, sub, required_role):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT role FROM user_role WHERE cognito_sub = %s", (sub,))
            result = cur.fetchone()
            if result:
                return result[0] == required_role
            return False
    except Exception as e:
        print(f"Error checking user role: {e}")
        return False


def handler(event, context):
    conn = get_db_connection()
    if conn is None:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Could not connect to the database"}),
        }

    try:
        sub = get_user_sub_from_token(event)

        if not sub:
            return {
                "statusCode": 401,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Unauthorized - no user ID found in token"}),
            }

        if not check_user_role(conn, sub, "company"):
            return {
                "statusCode": 403,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Forbidden - only company role can access analytics"}),
            }
        with conn.cursor() as cur:
            overview_metrics = {}

            cur.execute("SELECT COUNT(*) FROM pool")
            overview_metrics["total_pools"] = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM pool WHERE status = 'active'")
            overview_metrics["active_pools"] = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COUNT(DISTINCT p.id)
                FROM pool p
                WHERE (SELECT COALESCE(SUM(r.quantity), 0)
                       FROM request r
                       WHERE r.pool_id = p.id) >= p.min_quantity
            """
            )
            overview_metrics["successful_pools"] = cur.fetchone()[0]

            cur.execute(
                """
                SELECT COALESCE(SUM(r.quantity * pr.unit_price), 0)
                FROM request r
                JOIN pool p ON r.pool_id = p.id
                JOIN product pr ON p.product_id = pr.id
            """
            )
            overview_metrics["total_revenue"] = float(cur.fetchone()[0])

            cur.execute("SELECT COUNT(DISTINCT email) FROM request")
            overview_metrics["total_customers"] = cur.fetchone()[0]

            cur.execute("SELECT COUNT(*) FROM product")
            overview_metrics["total_products"] = cur.fetchone()[0]

            cur.execute("SELECT COALESCE(SUM(quantity), 0) FROM request")
            overview_metrics["total_quantity_sold"] = int(cur.fetchone()[0])

            if overview_metrics["total_pools"] > 0:
                overview_metrics["success_rate"] = round(
                    (overview_metrics["successful_pools"] / overview_metrics["total_pools"]) * 100,
                    2,
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
