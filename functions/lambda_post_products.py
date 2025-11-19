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
        user_sub = get_user_sub_from_token(event)

        if not user_sub:
            return {
                "statusCode": 401,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Unauthorized - no user ID found in token"}),
            }

        if not check_user_role(conn, user_sub, "company"):
            return {
                "statusCode": 403,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Forbidden - only companies can create products"}),
            }

        user_email = get_user_email_from_token(event)
        if not user_email:
            user_email = get_user_email_from_db(conn, user_sub)

        if not user_email:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Could not determine user email"}),
            }

        with conn.cursor() as cur:
            body = json.loads(event.get("body", "{}"))
            name = body.get("name")
            description = body.get("description")
            category = body.get("category")
            unit_price = body.get("unit_price")
            image_url = body.get("image_url")

            if not all([name, unit_price]):
                return {
                    "statusCode": 400,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps({"error": "Missing required fields: name, unit_price"}),
                }

            cur.execute(
                "INSERT INTO product (name, description, category, unit_price, image_url, email, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW()) RETURNING id",
                (name, description, category, unit_price, image_url, user_email),
            )
            product_id = cur.fetchone()[0]
            conn.commit()

            return {
                "statusCode": 201,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"id": product_id}),
            }

    except Exception as e:
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
