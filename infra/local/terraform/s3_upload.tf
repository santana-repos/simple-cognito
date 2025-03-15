# Upload frontend files to S3 bucket
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

# Upload index.html
resource "aws_s3_object" "index_html" {
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "index.html"
  source       = "${local.frontend_dir}/index.html"
  content_type = lookup(local.mime_types, "html")
  etag         = filemd5("${local.frontend_dir}/index.html")
}

# Upload error.html
resource "aws_s3_object" "error_html" {
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "error.html"
  source       = "${local.frontend_dir}/error.html"
  content_type = lookup(local.mime_types, "html")
  etag         = filemd5("${local.frontend_dir}/error.html")
}

# Upload CSS files
resource "aws_s3_object" "css_files" {
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "assets/css/styles.css"
  source       = "${local.frontend_dir}/assets/css/styles.css"
  content_type = lookup(local.mime_types, "css")
  etag         = filemd5("${local.frontend_dir}/assets/css/styles.css")
}

# Upload JS files
resource "aws_s3_object" "js_files" {
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "assets/js/scripts.js"
  source       = "${local.frontend_dir}/assets/js/scripts.js"
  content_type = lookup(local.mime_types, "js")
  etag         = filemd5("${local.frontend_dir}/assets/js/scripts.js")
}

# Upload anonymous pages
resource "aws_s3_object" "contacts_html" {
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "pages/anonymous/contacts.html"
  source       = "${local.frontend_dir}/pages/anonymous/contacts.html"
  content_type = lookup(local.mime_types, "html")
  etag         = filemd5("${local.frontend_dir}/pages/anonymous/contacts.html")
}

# Upload logged-in user pages
resource "aws_s3_object" "landing_page_html" {
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "pages/logged/landing-page.html"
  source       = "${local.frontend_dir}/pages/logged/landing-page.html"
  content_type = lookup(local.mime_types, "html")
  etag         = filemd5("${local.frontend_dir}/pages/logged/landing-page.html")
}

# Upload admin pages
resource "aws_s3_object" "admin_area_html" {
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "pages/admin/admin-area.html"
  source       = "${local.frontend_dir}/pages/admin/admin-area.html"
  content_type = lookup(local.mime_types, "html")
  etag         = filemd5("${local.frontend_dir}/pages/admin/admin-area.html")
}

# Upload logo if it exists
resource "aws_s3_object" "logo_svg" {
  count        = fileexists("${local.frontend_dir}/assets/images/logo.svg") ? 1 : 0
  bucket       = aws_s3_bucket.website_bucket.id
  key          = "assets/images/logo.svg"
  source       = "${local.frontend_dir}/assets/images/logo.svg"
  content_type = lookup(local.mime_types, "svg")
  etag         = filemd5("${local.frontend_dir}/assets/images/logo.svg")
} 