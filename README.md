
# S3 Static Website with Authentication

This project demonstrates a static website hosted on S3 with authentication using AWS Cognito. The infrastructure is mocked locally using LocalStack and Moto Server.

### DISCLAIMER

*Attention*: as a very simple demonstration project, I have intentionally decided not to use any blueprint techniques or modern standards for the security.
Be aware and never use this repo out-of-box directly when preparing your production.

Considerations maded, you can feel free to use it as a bulerplate to setting your LOCAL development environment projects with use cases for integrating static websites with vanilla javascript frontends (served via AW S3 [here served by Localstack community edition]) with (a very limited) authentication and authorization process using AWS Cognito [here served by Moto-server].


## Prerequisites

- Docker engine (version >=27)
- Node.js (version ==18 LTS)
- Terraform (version ==1.11.1)

## Project Structure

- `frontend/`: Contains the static website files
- `backend/`: Contains the Lambda function for user management
- `infra/`: Contains the Terraform configuration for the infrastructure

## Getting Started

1. Clone the repository

2. Start the local infrastructure:

```bash
docker-compose up -d
```

3. Install dependencies:

```bash
cd backend/lambda-app
npm install
```

4. Build and deploy the Lambda function and frontend:

```bash
cd ../../infra/local/terraform
terraform init
terraform apply -auto-approve
```

5. Access the website:

Open your browser and navigate to the website endpoint displayed in the Terraform output.

## Default Admin User

- Username: admin
- Password: Admin123!

## Features

- Authentication with AWS Cognito
- Role-based access control (admin and regular users)
- User management (create, read, update, delete)
- S3 static website hosting

## Local Development

- The website is hosted on LocalStack's S3 service
- Authentication is handled by Moto Server's Cognito service
- User data is stored in LocalStack's DynamoDB service


## Side command to remember

```shell
aws cognito-idp list-users --user-pool-id <your_user_pool_id> --endpoint-url http://localhost:5000
```

```shell
aws cognito-idp initiate-auth \
  --auth-flow USER_PASSWORD_AUTH \
  --client-id <your_client_id> \
  --auth-parameters USERNAME=<your_username>,PASSWORD=<your_password> \
  --endpoint-url http://localhost:5000
```