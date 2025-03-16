
locals {
  mime_types = {
    "html" = "text/html"
    "css"  = "text/css"
    "js"   = "application/javascript"
    "png"  = "image/png"
    "jpg"  = "image/jpeg"
    "jpeg" = "image/jpeg"
    "svg"  = "image/svg+xml"
    "ico"  = "image/x-icon"
  }
  frontend_dir = "${path.module}/../../../frontend"
}

resource "aws_s3_bucket_website_configuration" "website_config" {
  bucket = aws_s3_bucket.website_bucket.id
  index_document {
    suffix = "index.html"
  }
  error_document {
    key = "error.html"
  }
  depends_on = [ aws_s3_bucket.website_bucket ]
}

resource "aws_s3_object" "object_assets_css" {
  for_each     = fileset("../../../frontend/assets/css/", "*")
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "./assets/css/${each.value}"
  source       = "../../../frontend/assets/css/${each.value}"
  etag         = filemd5("../../../frontend/assets/css/${each.value}")
  content_type = lookup(local.mime_types, "css")
  acl          = "public-read"
  depends_on   = [aws_s3_bucket.website_bucket]
}

resource "aws_s3_object" "object_assets_js" {
  for_each     = fileset("../../../frontend/assets/js/", "*")
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "./assets/js/${each.value}"
  source       = "../../../frontend/assets/js/${each.value}"
  etag         = filemd5("../../../frontend/assets/js/${each.value}")
  content_type = lookup(local.mime_types, "js")
  acl          = "public-read"
  depends_on   = [aws_s3_bucket.website_bucket]
}

resource "aws_s3_object" "object_assets_images" {
  for_each     = fileset("../../../frontend/assets/images/", "*")
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "./assets/images/${each.value}"
  source       = "../../../frontend/assets/images/${each.value}"
  etag         = filemd5("../../../frontend/assets/images/${each.value}")
  content_type = "image/png;image/jpeg;image/svg+xml;image/x-icon"
  acl          = "public-read"
  depends_on   = [aws_s3_bucket.website_bucket]
}

resource "aws_s3_object" "logo_svg" {
  count        = fileexists("${local.frontend_dir}/assets/images/logo.svg") ? 1 : 0
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "./assets/images/logo.svg"
  source       = "${local.frontend_dir}/assets/images/logo.svg"
  content_type = lookup(local.mime_types, "svg")
  etag         = filemd5("${local.frontend_dir}/assets/images/logo.svg")
  depends_on = [ aws_s3_bucket.website_bucket ]
} 

resource "aws_s3_object" "favicon_ico" {
  count        = fileexists("${local.frontend_dir}/assets/images/favicon.ico") ? 1 : 0
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "./assets/images/favicon.ico"
  source       = "${local.frontend_dir}/assets/images/favicon.ico"
  content_type = lookup(local.mime_types, "ico")
  etag         = filemd5("${local.frontend_dir}/assets/images/favicon.ico")
  depends_on = [ aws_s3_bucket.website_bucket ]
}

resource "aws_s3_object" "error_html" {
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "error.html"
  source       = "${local.frontend_dir}/error.html"
  content_type = lookup(local.mime_types, "html")
  etag         = filemd5("${local.frontend_dir}/error.html")
  depends_on = [ 
    aws_s3_bucket.website_bucket,
    aws_s3_object.object_assets_css,
    aws_s3_object.object_assets_js,
    aws_s3_object.object_assets_images
  ]
}

resource "aws_s3_object" "object_www_pages_admin" {
  for_each     = fileset("../../../frontend/pages/admin/", "*")
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "./pages/admin/${each.value}"
  source       = "../../../frontend/pages/admin/${each.value}"
  etag         = filemd5("../../../frontend/pages/admin/${each.value}")
  content_type = lookup(local.mime_types, "html")
  acl          = "public-read"
  depends_on = [ 
    aws_s3_bucket.website_bucket,
    aws_s3_object.object_assets_css,
    aws_s3_object.object_assets_js,
    aws_s3_object.object_assets_images
  ]
}

resource "aws_s3_object" "object_www_pages_anonymous" {
  for_each     = fileset("../../../frontend/pages/anonymous/", "*")
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "./pages/anonymous/${each.value}"
  source       = "../../../frontend/pages/anonymous/${each.value}"
  etag         = filemd5("../../../frontend/pages/anonymous/${each.value}")
  content_type = lookup(local.mime_types, "html")
  acl          = "public-read"
  depends_on = [ 
    aws_s3_bucket.website_bucket,
    aws_s3_object.object_assets_css,
    aws_s3_object.object_assets_js,
    aws_s3_object.object_assets_images
  ]
}

resource "aws_s3_object" "object_www_pages_logged" {
  for_each     = fileset("../../../frontend/pages/logged/", "*")
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "./pages/logged/${each.value}"
  source       = "../../../frontend/pages/logged/${each.value}"
  etag         = filemd5("../../../frontend/pages/logged/${each.value}")
  content_type = lookup(local.mime_types, "html")
  acl          = "public-read"
  depends_on = [ 
    aws_s3_bucket.website_bucket,
    aws_s3_object.object_assets_css,
    aws_s3_object.object_assets_js,
    aws_s3_object.object_assets_images
  ]
}

resource "aws_s3_object" "object_www_index" {
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "index.html"
  content      = templatefile(
    "../../../frontend/templates/template-index.html",
    {
      backendApiBaseUrl = aws_lambda_function_url.user_management_url.function_url
    }
  )
  content_type = lookup(local.mime_types, "html")
  acl          = "public-read"
  depends_on   = [
    aws_lambda_function_url.user_management_url,
    aws_s3_object.object_assets_css,
    aws_s3_object.object_assets_js,
    aws_s3_object.object_assets_images
  ]
}