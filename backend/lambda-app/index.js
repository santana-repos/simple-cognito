import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminDeleteUserCommand, ListUsersCommand, AdminUpdateUserAttributesCommand } from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const cognitoClient = new CognitoIdentityProviderClient({
  endpoint: process.env.AWS_ENDPOINT || "http://motoserver:5000",
  region: process.env.AWS_REGION || "us-east-1",
});

const dynamoClient = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT || "http://localstack:4566",
  region: process.env.AWS_REGION || "us-east-1",
});

const USER_POOL_ID = process.env.USER_POOL_ID;
const USERS_TABLE = process.env.USERS_TABLE || "Users";

// Create admin user on first run
const createAdminUser = async () => {
  try {
    const params = {
      UserPoolId: USER_POOL_ID,
      Username: "admin",
      TemporaryPassword: "Admin123!",
      UserAttributes: [
        {
          Name: "email",
          Value: "admin@example.com",
        },
        {
          Name: "custom:role",
          Value: "admin",
        },
      ],
    };

    await cognitoClient.send(new AdminCreateUserCommand(params));
    
    // Set permanent password
    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: "admin",
      Password: "Admin123!",
      Permanent: true,
    }));
    
    // Store in DynamoDB
    await dynamoClient.send(new PutItemCommand({
      TableName: USERS_TABLE,
      Item: {
        username: { S: "admin" },
        email: { S: "admin@example.com" },
        role: { S: "admin" },
      },
    }));
    
    console.log("Admin user created successfully");
  } catch (error) {
    if (error.name === 'UsernameExistsException') {
      console.log("Admin user already exists");
    } else {
      console.error("Error creating admin user:", error);
    }
  }
};

// Handler function
export const handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET,PUT,DELETE",
  };

  // Handle preflight requests
  if (event.requestContext.http.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: "Preflight request successful" }),
    };
  }

  try {
    // Create admin user if it doesn't exist
    await createAdminUser();
    
    const path = event.requestContext.http.path;
    const method = event.requestContext.http.method;
    const body = event.body ? JSON.parse(event.body) : {};
    
    // Authentication endpoint
    if (path === "/auth/login" && method === "POST") {
      const { username, password } = body;
      
      // In a real app, you would use Cognito's InitiateAuth API
      // For this demo, we'll just check if the user exists in DynamoDB
      const userResponse = await dynamoClient.send(new GetItemCommand({
        TableName: USERS_TABLE,
        Key: { username: { S: username } },
      }));
      
      if (!userResponse.Item) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: "Invalid credentials" }),
        };
      }
      
      // Mock token for demo purposes
      const token = uuidv4();
      const role = userResponse.Item.role.S;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          token, 
          username, 
          role,
          message: "Login successful" 
        }),
      };
    }
    
    // User management endpoints (admin only)
    if (path.startsWith("/users")) {
      // Check if user is admin (in a real app, verify JWT token)
      const authHeader = event.headers.authorization;
      if (!authHeader) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: "Unauthorized" }),
        };
      }
      
      // List all users
      if (path === "/users" && method === "GET") {
        const usersResponse = await dynamoClient.send(new ScanCommand({
          TableName: USERS_TABLE,
        }));
        
        const users = usersResponse.Items.map(item => ({
          username: item.username.S,
          email: item.email.S,
          role: item.role.S,
        }));
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(users),
        };
      }
      
      // Create user
      if (path === "/users" && method === "POST") {
        const { username, email, password, role } = body;
        
        // Create user in Cognito
        await cognitoClient.send(new AdminCreateUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          TemporaryPassword: password,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "custom:role", Value: role },
          ],
        }));
        
        // Set permanent password
        await cognitoClient.send(new AdminSetUserPasswordCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          Password: password,
          Permanent: true,
        }));
        
        // Store in DynamoDB
        await dynamoClient.send(new PutItemCommand({
          TableName: USERS_TABLE,
          Item: {
            username: { S: username },
            email: { S: email },
            role: { S: role },
          },
        }));
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ message: "User created successfully" }),
        };
      }
      
      // Update user
      if (path.startsWith("/users/") && method === "PUT") {
        const username = path.split("/")[2];
        const { email, role } = body;
        
        // Update user in Cognito
        await cognitoClient.send(new AdminUpdateUserAttributesCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
          UserAttributes: [
            { Name: "email", Value: email },
            { Name: "custom:role", Value: role },
          ],
        }));
        
        // Update in DynamoDB
        await dynamoClient.send(new PutItemCommand({
          TableName: USERS_TABLE,
          Item: {
            username: { S: username },
            email: { S: email },
            role: { S: role },
          },
        }));
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "User updated successfully" }),
        };
      }
      
      // Delete user
      if (path.startsWith("/users/") && method === "DELETE") {
        const username = path.split("/")[2];
        
        // Don't allow deleting the admin user
        if (username === "admin") {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ message: "Cannot delete admin user" }),
          };
        }
        
        // Delete from Cognito
        await cognitoClient.send(new AdminDeleteUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: username,
        }));
        
        // Delete from DynamoDB
        await dynamoClient.send(new DeleteItemCommand({
          TableName: USERS_TABLE,
          Key: { username: { S: username } },
        }));
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: "User deleted successfully" }),
        };
      }
    }
    
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: "Not found" }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: "Internal server error", error: error.message }),
    };
  }
};

