resource "aws_sns_topic" "pool_notifications" {
  name = format("%s-pool-notifications", var.project_name)

  tags = {
    Name = format("%s-pool-notifications", var.project_name)
  }
}