resource "aws_api_gateway_rest_api" "GSHackathon" {
  name = "gs-hackathon"

  endpoint_configuration {
    types = ["EDGE"]
  }
}