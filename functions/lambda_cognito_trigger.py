import json
import os
import boto3

sns_client = boto3.client('sns')
TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')

def handler(event, context):
    print("Recibido evento de Cognito:", json.dumps(event))
    
    try:
        # Obtener el email desde los atributos del usuario
        # La estructura del evento de Cognito es específica
        user_attributes = event['request']['userAttributes']
        email = user_attributes.get('email')
        
        if email and TOPIC_ARN:
            print(f"Suscribiendo {email} al tópico {TOPIC_ARN}")
            
            # 2. Suscribir el email al tópico SNS
            sns_client.subscribe(
                TopicArn=TOPIC_ARN,
                Protocol='email',
                Endpoint=email
            )
            print("Suscripción solicitada exitosamente.")
        else:
            print("No se encontró email o ARN del tópico.")

    except Exception as e:
        # Logueamos el error pero NO fallamos la lambda para no bloquear el registro del usuario
        print(f"Error al suscribir usuario: {str(e)}")

    # Devolver el evento a Cognito para que continúe el flujo
    return event