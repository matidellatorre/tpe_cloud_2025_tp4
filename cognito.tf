resource "aws_cognito_user_pool" "this" {
  name                = format("%s-user-pool", var.project_name)
  username_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
    require_lowercase = true
  }

  auto_verified_attributes = ["email"]

  lambda_config {
    post_confirmation = aws_lambda_function.cognito_trigger.arn
  }
}

resource "aws_cognito_user_pool_client" "this" {
  name         = format("%s-user-pool-client", var.project_name)
  user_pool_id = aws_cognito_user_pool.this.id

  generate_secret = false

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_ADMIN_USER_PASSWORD_AUTH"
  ]
}

