import { 
  CognitoIdentityProviderClient, 
  AdminCreateUserCommand, 
  AdminSetUserPasswordCommand, 
  AdminDeleteUserCommand, 
  AdminUpdateUserAttributesCommand,
  AdminInitiateAuthCommand,
  ListUsersCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient, PutItemCommand, GetItemCommand, DeleteItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import express from 'express';
import serverless from 'serverless-http';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

// Configure CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Methods', 'OPTIONS,POST,GET,PUT,DELETE');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }
  
  next();
});

const cognitoClient = new CognitoIdentityProviderClient({
  endpoint: process.env.AWS_ENDPOINT || "http://motoserver:5000",
  region: process.env.AWS_REGION || "us-east-1",
});

const dynamoClient = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT || "http://localstack:4566",
  region: process.env.AWS_REGION || "us-east-1",
});

const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const USERS_TABLE = process.env.USERS_TABLE || "Users";
const JWT_SECRET = 'local-development-secret'; // In production, use a proper secret

// Create admin user on first run - this will be called once when the app starts
const createAdminUser = async () => {
  try {
    // Check if admin user already exists in Cognito
    const listUsersResponse = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `username = "admin"`,
      Limit: 1
    }));
    
    if (listUsersResponse.Users && listUsersResponse.Users.length > 0) {
      console.log("Admin user already exists in Cognito");
      return;
    }
    
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
    
    console.log("Admin user created successfully");
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
};

// Initialize admin user when the app starts
(async () => {
  try {
    await createAdminUser();
  } catch (error) {
    console.error("Error initializing admin user:", error);
  }
})();

// Authentication endpoint - uses Cognito's AdminInitiateAuth
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log("Login attempt for user:", username);
    
    if (!username || !password) {
      console.log("Missing username or password");
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    // Use Cognito's AdminInitiateAuth API for authentication
    const authParams = {
      UserPoolId: USER_POOL_ID,
      ClientId: USER_POOL_CLIENT_ID,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password
      }
    };
    
    try {
      console.log("Attempting Cognito authentication");
      const authResponse = await cognitoClient.send(new AdminInitiateAuthCommand(authParams));
      console.log("Cognito auth response:", JSON.stringify(authResponse));
      
      // Get user attributes to include role
      console.log("Fetching user attributes");
      const listUsersResponse = await cognitoClient.send(new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: `username = "${username}"`,
        Limit: 1
      }));
      
      if (!listUsersResponse.Users || listUsersResponse.Users.length === 0) {
        console.log("User not found in Cognito");
        return res.status(404).json({ message: "User not found" });
      }
      
      const user = listUsersResponse.Users[0];
      const userAttributes = {};
      
      user.Attributes.forEach(attr => {
        userAttributes[attr.Name] = attr.Value;
      });
      
      const role = userAttributes['custom:role'] || 'user';
      
      // Create a JWT token
      const token = jwt.sign(
        { 
          username, 
          role,
          email: userAttributes.email || '',
          sub: user.Username
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      const responseData = { 
        token, 
        username, 
        role,
        message: "Login successful" 
      };
      
      console.log("Login successful, sending response:", JSON.stringify(responseData));
      return res.status(200).json(responseData);
    } catch (authError) {
      console.error("Authentication error:", authError);
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Middleware to verify JWT token and check user role
const verifyToken = (requiredRole) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if user has required role
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }
      
      // Add user info to request
      req.user = decoded;
      next();
    } catch (error) {
      console.error("Token verification error:", error);
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }
  };
};

// User management endpoints - require admin role
app.get('/users', verifyToken('admin'), async (req, res) => {
  try {
    // Get users from Cognito
    const listUsersResponse = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60 // Adjust as needed
    }));
    
    const users = listUsersResponse.Users.map(user => {
      const userAttributes = {};
      
      user.Attributes.forEach(attr => {
        userAttributes[attr.Name] = attr.Value;
      });
      
      return {
        username: user.Username,
        email: userAttributes.email || '',
        role: userAttributes['custom:role'] || 'user',
        status: user.UserStatus
      };
    });
    
    res.status(200).json(users);
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

app.post('/users', verifyToken('admin'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
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
    
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

app.put('/users/:username', verifyToken('admin'), async (req, res) => {
  try {
    const { username } = req.params;
    const { email, role } = req.body;
    
    // Update user in Cognito
    await cognitoClient.send(new AdminUpdateUserAttributesCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "custom:role", Value: role },
      ],
    }));
    
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

app.delete('/users/:username', verifyToken('admin'), async (req, res) => {
  try {
    const { username } = req.params;
    
    // Don't allow deleting the admin user
    if (username === "admin") {
      return res.status(403).json({ message: "Cannot delete admin user" });
    }
    
    // Delete from Cognito
    await cognitoClient.send(new AdminDeleteUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
    }));
    
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// User profile endpoint - available to authenticated users
app.get('/profile', verifyToken(), async (req, res) => {
  try {
    // The user info is already in req.user from the verifyToken middleware
    res.status(200).json({
      username: req.user.username,
      email: req.user.email,
      role: req.user.role
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// Not found handler
app.use((req, res) => {
  res.status(404).json({ message: "Not found" });
});

// Export the serverless handler
export const handler = serverless(app);

