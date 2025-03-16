output "website_endpoint" {
  # value = "http://${aws_s3_bucket.website_bucket.bucket}.s3-website.localhost.localstack.cloud:4566" # << http and https mixing contents issue
  value = "http://localhost:4566/${aws_s3_bucket.website_bucket.id}/index.html" # workaround
}

output "lambda_function_url" {
  value = aws_lambda_function_url.user_management_url.function_url
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.user_pool.id
}

output "cognito_app_client_id" {
  value = aws_cognito_user_pool_client.client.id
}
