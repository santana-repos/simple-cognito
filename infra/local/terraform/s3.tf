
resource "aws_s3_bucket" "website_bucket" {
  bucket        = "static-website-bucket"
  force_destroy = true
}