resource "aws_lambda_layer_version" "psycopg2" {
  filename            = "${path.module}/layers/layer_psycopg2.zip"
  layer_name          = "psycopg2"
  compatible_runtimes = ["python3.9", "python3.10", "python3.11", "python3.12"]
  description         = "Lambda layer que contiene la librería psycopg2 para conectarse a PostgreSQL"
}

module "rds_init" {
  source = "./modules/lambda"

  filename      = "${path.module}/functions/lambda_rds_init.zip"
  function_name = "rds_init"
  handler       = "lambda_rds_init.handler"
  role          = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
  runtime       = var.lambda_runtime
  layers        = [aws_lambda_layer_version.psycopg2.arn]

  subnet_ids      = module.vpc.private_lambda_subnet_ids
  security_groups = [aws_security_group.lambda.id]

  environment_variables = {
    DB_HOST     = aws_db_instance.this.address
    DB_PORT     = "5432"
    DB_NAME     = aws_db_instance.this.db_name
    DB_USER     = var.db_username
    DB_PASSWORD = var.db_password
  }

  depends_on = [
    aws_db_instance.this,
    aws_lambda_layer_version.psycopg2
  ]

  tags = {
    Name = format("%s-rds-init", var.project_name)
  }
}

resource "null_resource" "init_database" {
  depends_on = [
    module.rds_init
  ]

  provisioner "local-exec" {
    command = "aws lambda invoke --function-name ${module.rds_init.function_name} --region ${var.aws_region} lambda_init_response.json"
  }
}

data "archive_file" "lambda_cognito_trigger_zip" {
  type        = "zip"
  source_file = "${path.module}/functions/lambda_cognito_trigger.py"
  output_path = "${path.module}/functions/lambda_cognito_trigger.zip"
}

resource "aws_lambda_function" "cognito_trigger" {
  filename      = data.archive_file.lambda_cognito_trigger_zip.output_path
  function_name = "${var.project_name}-cognito-trigger"
  role          = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole" # Tu LabRole
  handler       = "lambda_cognito_trigger.handler"
  runtime       = "python3.11"
  timeout       = 30

  source_code_hash = data.archive_file.lambda_cognito_trigger_zip.output_base64sha512

  vpc_config {
    subnet_ids         = module.vpc.private_lambda_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.pool_notifications.arn
    }
  }

  tags = {
    Name = "${var.project_name}-cognito-trigger"
  }
}

resource "aws_lambda_permission" "allow_cognito" {
  statement_id  = "AllowCognitoInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cognito_trigger.function_name
  principal     = "cognito-idp.amazonaws.com"
  source_arn    = aws_cognito_user_pool.this.arn
}

module "rds_destroyer" {
  source = "./modules/lambda"

  filename      = "${path.module}/functions/lambda_rds_destroyer.zip"
  function_name = "rds_destroyer"
  handler       = "lambda_rds_destroyer.handler"
  role          = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
  runtime       = var.lambda_runtime
  layers        = [aws_lambda_layer_version.psycopg2.arn]

  subnet_ids      = module.vpc.private_lambda_subnet_ids
  security_groups = [aws_security_group.lambda.id]

  environment_variables = {
    DB_HOST     = aws_db_instance.this.address
    DB_PORT     = "5432"
    DB_NAME     = aws_db_instance.this.db_name
    DB_USER     = var.db_username
    DB_PASSWORD = var.db_password
  }

  depends_on = [
    aws_db_instance.this,
    aws_lambda_layer_version.psycopg2
  ]

  tags = {
    Name = format("%s-rds-destroyer", var.project_name)
  }
}
