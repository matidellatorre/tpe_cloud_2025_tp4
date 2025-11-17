resource "aws_lambda_function" "this" {
  filename = var.filename

  function_name    = var.function_name
  role             = var.role
  handler          = var.handler
  runtime          = var.runtime
  source_code_hash = filebase64sha512(var.filename)
  layers           = var.layers
  timeout = 30

  vpc_config {
    subnet_ids         = var.subnet_ids
    security_group_ids = var.security_groups
  }

  environment {
    variables = var.environment_variables
  }

  tags = var.tags
}
