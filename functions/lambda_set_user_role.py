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
        body = json.loads(event.get("body", "{}"))
        email = body.get("email")
        role = body.get("role")

        if not email or not role:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Email and role are required"}),
            }

        if role not in ["client", "company"]:
            return {
                "statusCode": 400,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Role must be either 'client' or 'company'"}),
            }

        sub = None
        try:
            request_context = event.get("requestContext", {})
            authorizer = request_context.get("authorizer", {})
            claims = authorizer.get("claims", {})
            if not claims:
                jwt = authorizer.get("jwt", {})
                claims = jwt.get("claims", {})
            sub = claims.get("sub")
        except:
            pass

        if not sub:
            return {
                "statusCode": 401,
                "headers": {"Access-Control-Allow-Origin": "*"},
                "body": json.dumps({"error": "Unauthorized - no user ID found in token"}),
            }

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_role
                SET email = %s, role = %s, updated_at = CURRENT_TIMESTAMP
                WHERE cognito_sub = %s
                RETURNING id, email, cognito_sub, role, created_at, updated_at
                """,
                (email, role, sub),
            )
            result = cur.fetchone()

            if not result:
                try:
                    cur.execute(
                        """
                        INSERT INTO user_role (email, cognito_sub, role)
                        VALUES (%s, %s, %s)
                        RETURNING id, email, cognito_sub, role, created_at, updated_at
                        """,
                        (email, sub, role),
                    )
                    result = cur.fetchone()
                except psycopg2.IntegrityError:
                    conn.rollback()
                    cur.execute(
                        """
                        UPDATE user_role
                        SET cognito_sub = %s, role = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE email = %s
                        RETURNING id, email, cognito_sub, role, created_at, updated_at
                        """,
                        (sub, role, email),
                    )
                    result = cur.fetchone()

            conn.commit()

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
