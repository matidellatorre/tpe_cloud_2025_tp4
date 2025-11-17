module "vpc" {
  source       = "./modules/vpc"
  vpc_cidr     = local.vpc_cidr
  az_count     = local.az_count
  project_name = var.project_name
}