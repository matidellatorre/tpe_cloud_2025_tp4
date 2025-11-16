module "s3_website" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "5.8.1"

  bucket = "${var.project_name}-website-${data.aws_caller_identity.current.account_id}"

  website = {
    index_document = "index.html"
    error_document = "index.html"
  }

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  versioning = {
    enabled = false
  }

  cors_rule = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "POST", "PUT", "DELETE", "HEAD"]
      allowed_origins = ["*"]
      expose_headers  = ["ETag"]
      max_age_seconds = 3000
    }
  ]

  tags = merge(
    local.common_tags,
    {
      Name = "${var.project_name}-website"
    }
  )
}

resource "aws_s3_bucket_policy" "website_policy" {
  bucket = module.s3_website.s3_bucket_id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${module.s3_website.s3_bucket_arn}/*"
      }
    ]
  })

  depends_on = [module.s3_website]
}

resource "aws_s3_object" "website_files" {
  for_each = setsubtract(
    fileset("${path.module}/resources", "**/*"),
    fileset("${path.module}/resources", "node_modules/**")
  )

  bucket = module.s3_website.s3_bucket_id
  key    = each.value
  source = "${path.module}/resources/${each.value}"
  etag   = filemd5("${path.module}/resources/${each.value}")

  content_type = lookup(
    local.mime_types,
    try(regex("\\.[^.]+$", each.value), ""),
    "application/octet-stream"
  )

  depends_on = [aws_s3_bucket_policy.website_policy]
}

resource "aws_s3_object" "api_config" {
  bucket       = module.s3_website.s3_bucket_id
  key          = "config.js"
  content_type = "application/javascript"

  content = <<-EOF
    window.API_CONFIG = {
      apiUrl: '${module.http_api.api_endpoint}',
      region: '${var.aws_region}',
      cognito: {
        userPoolId: '${aws_cognito_user_pool.this.id}',
        clientId: '${aws_cognito_user_pool_client.this.id}'
      }
    };
  EOF

  depends_on = [aws_s3_bucket_policy.website_policy]
}
