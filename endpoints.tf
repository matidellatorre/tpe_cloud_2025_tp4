resource "aws_security_group" "vpc_endpoints" {
  name        = "${var.project_name}-vpc-endpoints-sg"
  description = "Permitir trafico HTTPS hacia los endpoints"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "Permitir trafico HTTPS desde la VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name = "${var.project_name}-vpc-endpoints-sg"
  }
}

resource "aws_vpc_endpoint" "sns" {
  vpc_id            = module.vpc.vpc_id
  service_name      = "com.amazonaws.${data.aws_region.current.id}.sns"
  vpc_endpoint_type = "Interface"

  subnet_ids = module.vpc.private_lambda_subnet_ids

  security_group_ids = [
    aws_security_group.vpc_endpoints.id,
  ]

  private_dns_enabled = true

  tags = {
    Name = "${var.project_name}-sns-endpoint"
  }
}

