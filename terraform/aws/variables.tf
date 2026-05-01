variable "project_name" {
  type    = string
  default = "easyjs"
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "container_image" {
  type        = string
  description = "Fully qualified container image URI."
}

variable "container_port" {
  type    = number
  default = 3000
}

variable "desired_count" {
  type    = number
  default = 2
}

variable "environment" {
  type = map(string)
  default = {
    NODE_ENV    = "production"
    PORT        = "3000"
    AI_PROVIDER = "openai"
  }
}
