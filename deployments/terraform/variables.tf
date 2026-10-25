variable "aws_region" {
  description = "AWS deployment region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "db_password" {
  description = "PostgreSQL root administrator password"
  type        = string
  sensitive   = true
  default     = "ReplaceWithStrongRandomSecret123!"
}
