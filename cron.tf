# 1. Empaqueta el código de la nueva Lambda
resource "archive_file" "lambda_check_pools_zip" {
  type        = "zip"
  source_file = "${path.module}/functions/lambda_check_pools.py"
  output_path = "${path.module}/functions/lambda_check_pools.zip"
}

# 2. Define la nueva Lambda
resource "aws_lambda_function" "lambda_check_pools" {
  filename         = archive_file.lambda_check_pools_zip.output_path
  function_name    = "check_pools"
  handler          = "lambda_check_pools.handler"
  role             = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole" # Usa el mismo LabRole [cite: 3]
  runtime          = var.lambda_runtime
  timeout          = 60
  source_code_hash = archive_file.lambda_check_pools_zip.output_base64sha256

  # Conexión a la VPC (como las otras lambdas)
  vpc_config {
    subnet_ids         = module.vpc.private_lambda_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Variables de entorno
  environment {
    variables = {
      DB_HOST       = aws_db_proxy.this.endpoint # Se conecta al proxy [cite: 32]
      DB_PORT       = "5432"
      DB_NAME       = aws_db_instance.this.db_name
      DB_USER       = var.db_username
      DB_PASSWORD   = var.db_password
      SNS_TOPIC_ARN = aws_sns_topic.pool_notifications.arn # ¡Nueva variable!
    }
  }

  depends_on = [
    aws_db_proxy_target.this
  ]

  tags = {
    Name = format("%s-check-pools", var.project_name)
  }
}

# 3. Define la regla "cron" de EventBridge (cada 10 minutos)
resource "aws_cloudwatch_event_rule" "hourly_check" {
  name                = format("%s-hourly-pool-check", var.project_name)
  description         = "Revisa pools vencidos cada 10 minutos"
  schedule_expression = "rate(10 minutes)"
}

# 4. Conecta la regla "cron" a la Lambda
resource "aws_cloudwatch_event_target" "invoke_lambda_check_pools" {
  rule = aws_cloudwatch_event_rule.hourly_check.name
  target_id = "InvokeLambdaCheckPools"
  arn  = aws_lambda_function.lambda_check_pools.arn
}

# 5. Da permiso a EventBridge para invocar la Lambda
resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.lambda_check_pools.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.hourly_check.arn
}
