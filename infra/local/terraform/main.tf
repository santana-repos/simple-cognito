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

  # LocalStack endpoint
  endpoints {
    s3              = "http://s3.localhost.localstack.cloud:4566"
    lambda          = "http://localhost:4566"
    cognitoidp      = "http://localhost:5000"
    cognitoidentity = "http://localhost:5000"
    iam             = "http://localhost:4566"
    dynamodb        = "http://localhost:4566"
  }

  # Skip AWS API validation which is not supported by LocalStack
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
}

locals {
  bucket_name = "services-and-products-bucket"
  tags = {
    Name = "services-and-products-bucket"
  }
}

# S3 bucket for static website hosting
resource "aws_s3_bucket" "website_bucket" {
  bucket        = "static-website-bucket"
  force_destroy = true
}

resource "aws_s3_bucket_website_configuration" "website_config" {
  bucket = aws_s3_bucket.website_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }
}

resource "aws_s3_bucket_policy" "website_policy" {
  bucket = aws_s3_bucket.website_bucket.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = ["s3:GetObject"]
        Effect    = "Allow"
        Resource  = "${aws_s3_bucket.website_bucket.arn}/*"
        Principal = "*"
      },
    ]
  })
}

# Cognito User Pool
resource "aws_cognito_user_pool" "user_pool" {
  name = "website-user-pool"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }

  schema {
    name                = "role"
    attribute_data_type = "String"
    mutable             = true
    required            = false
  }
}

# Cognito User Pool Client
resource "aws_cognito_user_pool_client" "client" {
  name                = "website-client"
  user_pool_id        = aws_cognito_user_pool.user_pool.id
  explicit_auth_flows = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}

# DynamoDB table for users
resource "aws_dynamodb_table" "users_table" {
  name         = "Users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "username"

  attribute {
    name = "username"
    type = "S"
  }
}

data "archive_file" "lambdas_deploy_zip_package" {
  type        = "zip"
  source_dir  = "../../../backend/lambda-app"
  output_path = "../../../lambda-app.zip"
  excludes    = ["test", ".gitignore"]
}

# Lambda function for user management
resource "aws_lambda_function" "user_management" {
  function_name    = "user-management"
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  role             = aws_iam_role.lambda_role.arn
  filename         = data.archive_file.lambdas_deploy_zip_package.output_path
  source_code_hash = data.archive_file.lambdas_deploy_zip_package.output_base64sha256
  environment {
    variables = {
      USER_POOL_ID        = aws_cognito_user_pool.user_pool.id,
      USER_POOL_CLIENT_ID = aws_cognito_user_pool_client.client.id,
      USERS_TABLE         = aws_dynamodb_table.users_table.name
    }
  }
}

# Lambda function URL
resource "aws_lambda_function_url" "user_management_url" {
  function_name      = aws_lambda_function.user_management.function_name
  authorization_type = "NONE"

  cors {
    allow_origins  = ["*"]
    allow_methods  = ["*"]
    allow_headers  = ["*"]
    expose_headers = ["*"]
    max_age        = 86400
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "lambda_execution_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for Lambda to access Cognito and DynamoDB
resource "aws_iam_policy" "lambda_policy" {
  name        = "lambda_policy"
  description = "Policy for Lambda to access Cognito and DynamoDB"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "cognito-idp:*",
          "dynamodb:*"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_policy_attachment" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_policy.arn
}
