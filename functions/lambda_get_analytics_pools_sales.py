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


def get_user_email_from_token(event):
    try:
        request_context = event.get("requestContext", {})
        authorizer = request_context.get("authorizer", {})
        claims = authorizer.get("claims", {})
        if not claims:
            jwt = authorizer.get("jwt", {})
            claims = jwt.get("claims", {})
        return claims.get("email")
    except Exception as e:
        print(f"Error extracting email from token: {e}")
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


def get_user_email_from_db(conn, sub):
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT email FROM user_role WHERE cognito_sub = %s", (sub,))
            result = cur.fetchone()
            if result:
                return result[0]
            return None
    except Exception as e:
        print(f"Error getting user email: {e}")
        return None


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

        user_email = get_user_email_from_token(event)
        if not user_email:
            user_email = get_user_email_from_db(conn, sub)

        if not user_email:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Could not determine user email"}),
            }

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    p.id as pool_id,
                    pr.name as product_name,
                    pr.unit_price,
                    p.min_quantity,
                    p.start_at,
                    p.end_at,
                    COALESCE(SUM(r.quantity), 0) as total_quantity_sold,
                    COUNT(DISTINCT r.email) as total_participants,
                    COALESCE(SUM(r.quantity), 0) * pr.unit_price as total_revenue,
                    CASE
                        WHEN COALESCE(SUM(r.quantity), 0) >= p.min_quantity THEN true
                        ELSE false
                    END as reached_min_quantity
                FROM pool p
                JOIN product pr ON p.product_id = pr.id
                LEFT JOIN request r ON p.id = r.pool_id
                WHERE pr.email = %s
                GROUP BY p.id, pr.name, pr.unit_price, p.min_quantity, p.start_at, p.end_at
                ORDER BY p.created_at DESC
                """,
                (user_email,)
            )
            pools = cur.fetchall()

            pool_sales = []
            for row in pools:
                pool_sales.append(
                    {
                        "pool_id": row[0],
                        "product_name": row[1],
                        "unit_price": float(row[2]) if row[2] is not None else 0,
                        "min_quantity": row[3],
                        "start_at": row[4].isoformat() if row[4] else None,
                        "end_at": row[5].isoformat() if row[5] else None,
                        "total_quantity_sold": int(row[6]),
                        "total_participants": int(row[7]),
                        "total_revenue": float(row[8]) if row[8] is not None else 0,
                        "reached_min_quantity": row[9],
                    }
                )

            return {
                "statusCode": 200,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps(pool_sales),
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
