
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
    developer_only_attribute = false
    string_attribute_constraints {}
  }
}

resource "aws_cognito_user_pool_client" "client" {
  name                = "website-client"
  user_pool_id        = aws_cognito_user_pool.user_pool.id
  explicit_auth_flows = ["ALLOW_USER_PASSWORD_AUTH", "ALLOW_REFRESH_TOKEN_AUTH"]
}