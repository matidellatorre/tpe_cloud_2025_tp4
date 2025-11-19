import json
import os

import boto3
import psycopg2

db_host = os.environ.get("DB_HOST")
db_port = os.environ.get("DB_PORT")
db_name = os.environ.get("DB_NAME")
db_user = os.environ.get("DB_USER")
db_password = os.environ.get("DB_PASSWORD")
sns_topic_arn = os.environ.get("SNS_TOPIC_ARN")

sns_client = boto3.client("sns")


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


def check_and_notify_if_full(conn, pool_id):
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT p.min_quantity, p.status, pr.name FROM pool p " "JOIN product pr ON p.product_id = pr.id " "WHERE p.id = %s",
                (pool_id,),
            )
            pool_data = cur.fetchone()
            if not pool_data:
                print("No se encontró el pool, no se puede chequear.")
                return

            min_quantity, status, product_name = pool_data

            if status != "open":
                print(f"Pool {pool_id} ya está cerrado (status: {status}). No se notifica.")
                return

            cur.execute(
                "SELECT COALESCE(SUM(quantity), 0) FROM request WHERE pool_id = %s",
                (pool_id,),
            )
            total_joined = cur.fetchone()[0]

            if total_joined >= min_quantity:
                print(f"¡Pool {pool_id} completado! Total: {total_joined}/{min_quantity}")

                cur.execute("UPDATE pool SET status = 'success' WHERE id = %s", (pool_id,))

                cur.execute("SELECT email, quantity FROM request WHERE pool_id = %s", (pool_id,))
                participants = cur.fetchall()
                participant_list = [f"{email} ({qty}u)" for email, qty in participants]

                subject = f"ÉXITO (Inmediato): El pool para '{product_name}' se acaba de llenar!"
                message_body = (
                    f"¡Excelentes noticias!\n\n"
                    f"El pool de compra para '{product_name}' (ID: {pool_id}) acaba de alcanzar el mínimo requerido gracias a la última suscripción.\n\n"
                    f"- Mínimo Requerido: {min_quantity} unidades\n"
                    f"- Total Alcanzado: {total_joined} unidades\n\n"
                    f"La compra se considera cerrada y exitosa.\n"
                    f"Participantes: {', '.join(participant_list)}"
                )

                sns_client.publish(TopicArn=sns_topic_arn, Message=message_body, Subject=subject)
                print(f"Notificación de cierre inmediato enviada para pool {pool_id}.")

                conn.commit()

    except (Exception, psycopg2.Error) as e:
        print(f"Error en check_and_notify_if_full: {e}")
        conn.rollback()


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

    request_id = None

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

            cur.execute("SELECT status FROM pool WHERE id = %s", (pool_id,))
            pool_status = cur.fetchone()

            if pool_status and pool_status[0] != "open":
                return {
                    "statusCode": 400,
                    "body": json.dumps({"error": f"El pool (ID: {pool_id}) ya está cerrado."}),
                }

            try:
                cur.execute(
                    "INSERT INTO request (pool_id, email, quantity, created_at) VALUES (%s, %s, %s, NOW()) RETURNING id",
                    (pool_id, email, quantity),
                )
                request_id = cur.fetchone()[0]
                conn.commit()

                check_and_notify_if_full(conn, pool_id)

                return {
                    "statusCode": 201,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps({"id": request_id}),
                }

            except psycopg2.IntegrityError as e:
                conn.rollback()
                if "request_pool_id_email_key" in str(e):
                    return {
                        "statusCode": 400,
                        "body": json.dumps({"error": "This email has already joined this pool."}),
                    }
                if "request_pool_id_fkey" in str(e):
                    return {
                        "statusCode": 404,
                        "body": json.dumps({"error": f"Pool with ID {pool_id} not found."}),
                    }
                return {
                    "statusCode": 400,
                    "headers": {"Access-Control-Allow-Origin": "*"},
                    "body": json.dumps({"error": "This email has already joined this pool."}),
                }

    except (Exception, psycopg2.Error) as e:
        print(f"Error executing query: {e}")
        conn.rollback()
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
