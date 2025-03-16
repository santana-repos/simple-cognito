
data "archive_file" "lambdas_deploy_zip_package" {
  type        = "zip"
  source_dir  = "../../../backend/lambda-app"
  output_path = "../../../lambda-app.zip"
  excludes    = ["test", ".gitignore"]
}

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
  depends_on = [ data.archive_file.lambdas_deploy_zip_package ]
}