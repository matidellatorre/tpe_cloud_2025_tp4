resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = format("%s-vpc", var.project_name)
  }
}

resource "aws_subnet" "lambda" {
  count             = var.az_count
  cidr_block        = cidrsubnet(var.vpc_cidr, local.new_bits, count.index)
  vpc_id            = aws_vpc.this.id
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = format("%s-private-subnet-lambda-%d", var.project_name, count.index + 1)
  }
}

resource "aws_subnet" "rds" {
  count             = var.az_count
  cidr_block        = cidrsubnet(var.vpc_cidr, local.new_bits, length(aws_subnet.lambda) + count.index)
  vpc_id            = aws_vpc.this.id
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = format("%s-private-subnet-rds-%d", var.project_name, count.index + 1)
  }
}
