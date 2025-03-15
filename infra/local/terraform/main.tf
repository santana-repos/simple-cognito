terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  access_key = "test"
  secret_key = "test"
  region     = "us-east-1"
}

locals {
  bucket_name = "services-and-products-bucket"
  tags = {
    Name = "services-and-products-bucket"
  }
}