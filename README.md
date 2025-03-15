# S3 Static Website with Authentication

This project demonstrates a static website hosted on S3 with authentication using AWS Cognito. The infrastructure is mocked locally using LocalStack and Moto Server.

## Prerequisites

- Docker and Docker Compose
- Node.js (v14 or later)
- Terraform

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
