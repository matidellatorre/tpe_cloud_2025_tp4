output "api_gateway_url" {
  description = "URL de la API Gateway HTTP"
  value       = module.http_api.api_endpoint
}

output "website_url" {
  description = "URL del sitio web estático hosteado en S3 (HTTP)"
  value       = "http://${module.s3_website.s3_bucket_website_endpoint}"
}

output "website_bucket_name" {
  description = "Nombre del bucket S3 que aloja el sitio web"
  value       = module.s3_website.s3_bucket_id
}

output "rds_proxy_endpoint" {
  description = "Endpoint del RDS Proxy para conexiones de Lambda"
  value       = aws_db_proxy.this.endpoint
}

output "rds_instance_endpoint" {
  description = "Endpoint directo de la instancia RDS (solo para referencia)"
  value       = aws_db_instance.this.endpoint
}

output "cognito_user_pool_id" {
  description = "ID del User Pool de Cognito"
  value       = aws_cognito_user_pool.this.id
}

output "cognito_user_pool_client_id" {
  description = "ID del cliente del User Pool de Cognito"
  value       = aws_cognito_user_pool_client.this.id
}

output "sns_topic_notifications_arn" {
  description = "ARN del tópico de SNS para las notificaciones de pools"
  value       = aws_sns_topic.pool_notifications.arn
}
