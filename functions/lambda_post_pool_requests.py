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
        return claims.get("sub")
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
        user_sub = get_user_sub_from_token(event)
        
        if not user_sub:
            return {
                "statusCode": 401,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Unauthorized - no user ID found in token"}),
            }
        
        if not check_user_role(conn, user_sub, "client"):
            return {
                "statusCode": 403,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Forbidden - only clients can join pools"}),
            }
        
        with conn.cursor() as cur:
            pool_id = event["pathParameters"]["id"]
            body = json.loads(event.get("body", "{}"))
            email = body.get("email")
            quantity = body.get("quantity", 1)

            if not email:
                return {
                    "statusCode": 400,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps({"error": "Email is required in request body"}),
                }

            try:
                cur.execute(
                    "INSERT INTO request (pool_id, email, quantity, created_at) VALUES (%s, %s, %s, NOW()) RETURNING id",
                    (pool_id, email, quantity),
                )
                request_id = cur.fetchone()[0]
                conn.commit()

                return {
                    "statusCode": 201,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps({"id": request_id}),
                }

            except psycopg2.IntegrityError:
                conn.rollback()
                return {
                    "statusCode": 400,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps({"error": "This email has already joined this pool."}),
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
