import json
import os
import psycopg2
import boto3

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
            host=db_host, port=db_port, dbname=db_name, user=db_user, password=db_password
        )
        return conn
    except psycopg2.Error as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return None

def get_product_name(cur, product_id):
    cur.execute("SELECT name FROM product WHERE id = %s", (product_id,))
    return cur.fetchone()[0]

def get_pool_participants(cur, pool_id):
    cur.execute("SELECT email, quantity FROM request WHERE pool_id = %s", (pool_id,))
    return cur.fetchall()

def handler(event, context):
    print("Iniciando chequeo de pools vencidos...")
    conn = get_db_connection()
    if conn is None:
        print("Error: No se pudo conectar a la DB")
        return

    try:
        with conn.cursor() as cur:
            # 1. Buscar pools vencidos que AÚN no se hayan procesado
            cur.execute(
                """
                SELECT id, product_id, min_quantity
                FROM pool
                WHERE end_at <= NOW() AND status = 'open'
                """,
            )
            expired_pools = cur.fetchall()
            print(f"Pools vencidos encontrados: {len(expired_pools)}")

            for pool in expired_pools:
                pool_id, product_id, min_quantity = pool

                # 2. Calcular el total de unidades
                cur.execute(
                    "SELECT COALESCE(SUM(quantity), 0) FROM request WHERE pool_id = %s",
                    (pool_id,),
                )
                total_joined = cur.fetchone()[0]

                product_name = get_product_name(cur, product_id)
                participants = get_pool_participants(cur, pool_id)
                participant_list = [f"{email} ({qty}u)" for email, qty in participants]

                final_status = ""
                subject = ""
                message_body = ""

                # 3. Determinar estado final
                if total_joined >= min_quantity:
                    final_status = "success"
                    subject = f"ÉXITO: El pool para '{product_name}' se completó!"
                    message_body = (
                        f"¡Buenas noticias!\n\n"
                        f"El pool de compra para '{product_name}' (ID: {pool_id}) ha finalizado exitosamente.\n\n"
                        f"- Mínimo Requerido: {min_quantity} unidades\n"
                        f"- Total Alcanzado: {total_joined} unidades\n\n"
                        f"La compra se procesará. Gracias por participar.\n"
                        f"Participantes: {', '.join(participant_list)}"
                    )
                else:
                    final_status = "failed"
                    subject = f"FALLIDO: El pool para '{product_name}' no alcanzó el mínimo"
                    message_body = (
                        f"Notificación de Pool (ID: {pool_id})\n\n"
                        f"El pool de compra para '{product_name}' ha vencido sin alcanzar el mínimo requerido.\n\n"
                        f"- Mínimo Requerido: {min_quantity} unidades\n"
                        f"- Total Alcanzado: {total_joined} unidades\n\n"
                        f"La compra no será ejecutada.\n"
                        f"Participantes: {', '.join(participant_list)}"
                    )

                # 4. Publicar en SNS
                print(f"Publicando en SNS para Pool ID {pool_id}: {subject}")
                sns_client.publish(
                    TopicArn=sns_topic_arn,
                    Message=message_body,
                    Subject=subject
                )

                # 5. Marcar el pool como procesado en la DB
                cur.execute(
                    "UPDATE pool SET status = %s WHERE id = %s",
                    (final_status, pool_id),
                )
            
            conn.commit()
            print(f"Procesamiento finalizado. {len(expired_pools)} pools actualizados.")

    except (Exception, psycopg2.Error) as e:
        print(f"Error en el handler: {e}")
        conn.rollback()
    finally:
        if conn:
            conn.close()

    return {"statusCode": 200, "body": json.dumps("OK")}