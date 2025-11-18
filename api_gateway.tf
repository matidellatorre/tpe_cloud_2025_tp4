module "http_api" {
  source = "./modules/http_api"

  api_name    = "${var.project_name}-apigw"
  description = "HTTP API Gateway para ${var.project_name}"

  cognito_user_pool_id        = aws_cognito_user_pool.this.id
  cognito_user_pool_client_id = aws_cognito_user_pool_client.this.id
  aws_region                  = data.aws_region.current.region

  routes = {
    get_products = {
      route_key     = "GET /products"
      function_name = "get_products"
      filename      = "${path.module}/functions/lambda_get_products.zip"
      handler       = "lambda_get_products.handler"
    }
    post_products = {
      route_key     = "POST /products"
      function_name = "post_products"
      filename      = "${path.module}/functions/lambda_post_products.zip"
      handler       = "lambda_post_products.handler"
    }
    get_pools = {
      route_key     = "GET /pools"
      function_name = "get_pools"
      filename      = "${path.module}/functions/lambda_get_pools.zip"
      handler       = "lambda_get_pools.handler"
    }
    post_pools = {
      route_key     = "POST /pools"
      function_name = "post_pools"
      filename      = "${path.module}/functions/lambda_post_pools.zip"
      handler       = "lambda_post_pools.handler"
    }
    get_product_details = {
      route_key     = "GET /products/{id}"
      function_name = "get_product_details"
      filename      = "${path.module}/functions/lambda_get_product_details.zip"
      handler       = "lambda_get_product_details.handler"
    }
    get_pool_details = {
      route_key     = "GET /pools/{id}"
      function_name = "get_pool_details"
      filename      = "${path.module}/functions/lambda_get_pool_details.zip"
      handler       = "lambda_get_pool_details.handler"
    }
    get_requests = {
      route_key     = "GET /requests"
      function_name = "get_requests"
      filename      = "${path.module}/functions/lambda_get_requests.zip"
      handler       = "lambda_get_requests.handler"
    }
    post_pool_requests = {
      route_key     = "POST /pools/{id}/requests"
      function_name = "post_pool_requests"
      filename      = "${path.module}/functions/lambda_post_pool_requests.zip"
      handler       = "lambda_post_pool_requests.handler"
    }
    get_presigned_url = {
      route_key     = "POST /images/presigned-url"
      function_name = "get_presigned_url"
      filename      = "${path.module}/functions/lambda_get_presigned_url.zip"
      handler       = "lambda_get_presigned_url.handler"
    }
    delete_product = {
      route_key     = "DELETE /products/{id}"
      function_name = "delete_product"
      filename      = "${path.module}/functions/lambda_delete_product.zip"
      handler       = "lambda_delete_product.handler"
    }
    get_analytics_pools_sales = {
      route_key     = "GET /analytics/pools/sales"
      function_name = "get_analytics_pools_sales"
      filename      = "${path.module}/functions/lambda_get_analytics_pools_sales.zip"
      handler       = "lambda_get_analytics_pools_sales.handler"
    }
    get_analytics_overview = {
      route_key     = "GET /analytics/overview"
      function_name = "get_analytics_overview"
      filename      = "${path.module}/functions/lambda_get_analytics_overview.zip"
      handler       = "lambda_get_analytics_overview.handler"
    }
    set_user_role = {
      route_key     = "POST /users/role"
      function_name = "set_user_role"
      filename      = "${path.module}/functions/lambda_set_user_role.zip"
      handler       = "lambda_set_user_role.handler"
    }
    get_user_role = {
      route_key     = "GET /users/role"
      function_name = "get_user_role"
      filename      = "${path.module}/functions/lambda_get_user_role.zip"
      handler       = "lambda_get_user_role.handler"
    }
  }

  role            = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/LabRole"
  runtime         = var.lambda_runtime
  subnet_ids      = module.vpc.private_lambda_subnet_ids
  security_groups = [aws_security_group.lambda.id]
  layers          = [aws_lambda_layer_version.psycopg2.arn]

  environment_variables = {
    DB_HOST            = aws_db_proxy.this.endpoint
    DB_PORT            = "5432"
    DB_NAME            = aws_db_instance.this.db_name
    DB_USER            = var.db_username
    DB_PASSWORD        = var.db_password
    IMAGES_BUCKET_NAME = aws_s3_bucket.images_bucket.bucket
    SNS_TOPIC_ARN      = aws_sns_topic.pool_notifications.arn
  }

  depends_on = [aws_db_proxy_target.this, aws_lambda_layer_version.psycopg2]

  tags = {
    Name = var.project_name
  }
}

