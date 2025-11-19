import json
import os

import boto3

sns_client = boto3.client("sns")
TOPIC_ARN = os.environ.get("SNS_TOPIC_ARN")


def handler(event, context):
    print("Recibido evento de Cognito:", json.dumps(event))

    try:
        user_attributes = event["request"]["userAttributes"]
        email = user_attributes.get("email")

        if email and TOPIC_ARN:
            print(f"Suscribiendo {email} al tópico {TOPIC_ARN}")

            sns_client.subscribe(TopicArn=TOPIC_ARN, Protocol="email", Endpoint=email)
            print("Suscripción solicitada exitosamente.")
        else:
            print("No se encontró email o ARN del tópico.")

    except Exception as e:
        print(f"Error al suscribir usuario: {str(e)}")

    return event
