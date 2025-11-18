variable "aws_region" {
  description = "Región de AWS donde se desplegarán los recursos"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nombre del proyecto usado como prefijo para los recursos"
  type        = string
  default     = "tpe-cloud-grupi"
}

variable "db_name" {
  description = "Nombre de la base de datos RDS"
  type        = string
  default     = "grupi"
}

variable "db_username" {
  description = "Nombre de usuario para la base de datos RDS"
  type        = string
  default     = "dbadmin"
}

variable "db_password" {
  description = "Contraseña para la base de datos RDS"
  type        = string
  sensitive   = true
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "az_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
}

variable "lambda_runtime" {
  description = "Lambda runtime to use"
  type        = string
  default     = "python3.11"
}