import json
import os
import uuid

import boto3
from botocore.exceptions import ClientError

s3_client = boto3.client("s3")


def handler(event, context):
    bucket_name = os.environ.get("IMAGES_BUCKET_NAME")
    if not bucket_name:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Bucket name not configured"}),
        }

    try:
        object_key = f"uploads/{uuid.uuid4()}"

        presigned_url = s3_client.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": bucket_name,
                "Key": object_key,
                "ContentType": "image/jpeg",
            },
            ExpiresIn=3600,
        )

        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "POST",
            },
            "body": json.dumps({"uploadURL": presigned_url, "objectKey": object_key}),
        }

    except ClientError as e:
        print(f"Error generating presigned URL: {e}")
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Could not generate presigned URL"}),
        }
