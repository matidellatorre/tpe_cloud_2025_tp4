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

        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, cognito_sub, role, created_at, updated_at FROM user_role WHERE cognito_sub = %s",
                (sub,),
            )
            result = cur.fetchone()

            if result:
                return {
                    "statusCode": 200,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps(
                        {
                            "id": result[0],
                            "email": result[1],
                            "cognito_sub": result[2],
                            "role": result[3],
                            "created_at": result[4].isoformat(),
                            "updated_at": result[5].isoformat(),
                        }
                    ),
                }
            else:
                return {
                    "statusCode": 404,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps(
                        {
                            "cognito_sub": sub,
                            "role": None,
                            "message": "No role assigned yet",
                        }
                    ),
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
