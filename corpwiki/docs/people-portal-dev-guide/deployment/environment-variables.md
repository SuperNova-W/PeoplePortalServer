---
sidebar_position: 3
---

# Environment Variables

This section provides a comprehensive reference for all environment variables used by the People Portal Server. These variables control various aspects of the application, including authentication, database connections, third-party integrations, and cloud services.

:::info
For detailed API interactions and schema definitions, please refer to the [API Reference](https://corp.appdevlcub.com/api/docs).
:::

:::warning
Variables handling sensitive data (secrets, tokens, passwords) should be secured using appropriate secrets management solutions in production, rather than plain text files.
:::

## General Configuration

These variables are fundamental to the server's operation and basic connectivity.

### `PEOPLEPORTAL_BASE_URL`
The public-facing URL of the People Portal application.
- **Usage**: Used to construct callback URLs for OAuth flows (e.g., OIDC redirects) and to generate links to resources (e.g., in emails or Gitea descriptions).
- **Example**: `https://portal.appdevclub.com` (or `http://localhost:3000` for local dev)

### `PEOPLEPORTAL_MONGO_URL`
The connection string for the MongoDB instance.
- **Usage**: Used by Mongoose to establish a connection to the application database.
- **Format**: Standard MongoDB URI (e.g., `mongodb+srv://user:pass@host/...`).

### `PEOPLEPORTAL_TOKEN_SECRET`
A secret key used to sign session cookies.
- **Usage**: Encrypts and validates session data such as user authentication state.
- **Important**: If not provided, the server will generate a random string on startup. This will cause all existing sessions to be invalidated every time the server restarts.
- **Recommendation**: Set this to a fixed, high-entropy random string for production environments.

### `PORT`
(Optional) The network port on which the server listens.
- **Default**: `3000`
- **Usage**: Determines the binding port for the Express application.



## Authentication (Authentik)

Variables required to interact with the Authentik Identity Provider for user management and verification.

:::info
The server validates the connection to the Authentik instance on startup, ensuring the API version is compatible.
:::

### `PEOPLEPORTAL_AUTHENTIK_ENDPOINT`
The base URL of the Authentik instance.
- **Usage**: The base path for API requests to Authentik (e.g., fetching user info, managing groups).
- **Example**: `https://auth.appdevclub.com`

### `PEOPLEPORTAL_AUTHENTIK_TOKEN`
The API token for authenticating administrative requests to Authentik.
- **Usage**: Used in the `Authorization` header (`Bearer <token>`) for all `AuthentikClient` requests.
- **Permission**: Ensure this token belongs to a service account with sufficient permissions to manage users and groups.



## OpenID Connect (OIDC)

Configuration for the OIDC authentication flow, processing user logins via the identity provider.

### `PEOPLEPORTAL_OIDC_DSCVURL`
The OIDC Discovery URL (often ending in `.well-known/openid-configuration`).
- **Usage**: The `OpenIdClient` fetches this URL to discover endpoints (authorization, token, userinfo) and signing keys (JWKS).

### `PEOPLEPORTAL_OIDC_CLIENTID`
The Client ID assigned to the People Portal application in the OIDC provider.
- **Usage**: Identifies the application during the OAuth2/OIDC authorization flow and token verification.

### `PEOPLEPORTAL_OIDC_CLIENTSECRET`
The Client Secret for the application.
- **Usage**: Used to authenticate the application to the OIDC provider when exchanging authorization codes for access tokens.



## Integrations

Configuration for external tools and services integrated into the People Portal.

### Gitea (Version Control)

### `PEOPLEPORTAL_GITEA_ENDPOINT`
The base URL of the Gitea instance.
- **Usage**: The API endpoint for managing repositories, organizations, and teams.

### `PEOPLEPORTAL_GITEA_TOKEN`
Administrator API token for Gitea.
- **Usage**: Authenticates requests to create/manage organizations and sync team permissions.

### Slack

### `PEOPLEPORTAL_SLACK_BOT_TOKEN`
The Bot User OAuth Token for the Slack workspace.
- **Usage**: Used to interact with the Slack API, such as looking up users by email (`users.lookupByEmail`) to validate their presence in the workspace.
- **Format**: Typically starts with `xoxb-`.
- **Note**: Ensure the bot scope includes necessary permissions like `users:read.email`.

### Email (SMTP)

Configuration for sending transactional emails (onboarding, notifications).

### `PEOPLEPORTAL_SMTP_HOST`
The hostname of the SMTP server.
- **Example**: `mail.privateemail.com`

### `PEOPLEPORTAL_SMTP_PORT`
The port for the SMTP server.
- **Example**: `465` (SSL) or `587` (TLS).

### `PEOPLEPORTAL_SMTP_SECURE`
Boolean flag to enable secure connection (SSL/TLS).
- **Values**: `true` or `false`.

### `PEOPLEPORTAL_SMTP_USER`
The username for SMTP authentication.
- **Usage**: Also used as the default "From" address if one is not specified in the email request.

### `PEOPLEPORTAL_SMTP_PASS`
The password for the SMTP user.

### `PEOPLEPORTAL_EMAIL_CONREROUTE`
A debug flag to intercept outgoing emails.
- **Usage**: If set (e.g., to `true`), the `EmailClient` will **not** send actual emails. Instead, it logs the email content (To, Subject, Body Preview) to the server console.
- **Environment**: Recommended for development/staging keys to prevent accidental emails.



## AWS Services

Configuration for AWS SDK and resource provisioning.

### Credentials
These are standard AWS SDK credentials used for authentication.
- **`AWS_ACCESS_KEY_ID`**: The access key for the AWS user.
- **`AWS_SECRET_ACCESS_KEY`**: The secret key for the AWS user.
- **`AWS_REGION`**: (Optional) The AWS region to use (default: `us-east-1`).

### Organization Management

### `AWS_ORG_ROOT_ID`
The ID of the AWS Organization Root.
- **Usage**: Used to identify the root container when searching for or moving accounts.

### `AWS_NONPROD_OU_ID`
The ID of the Organizational Unit (OU) for non-production accounts.
- **Usage**: Newly provisioned accounts are moved to this OU.

### `AWS_MANAGEMENT_ACCOUNT_ID`
The ID of the management/payer account.
- **Usage**: Budgets are created in this account and linked to the provisioned member accounts.

### Resource configuration

### `S3_BUCKET_NAME`
The name of the S3 bucket used for storage (e.g., resumes, assets).
- **Usage**: Used by `S3Client` to target the correct bucket for file operations.

### `AWS_DEFAULT_BUDGET_AMOUNT`
(Optional) The default monthly budget limit in USD.
- **Usage**: Used when creating a new budget for a provisioned project account.
- **Default**: `50`



## Node.js Configuration

### `NODE_TLS_REJECT_UNAUTHORIZED`
Controls TLS certificate validation.
- **Usage**: Setting this to `0` disables SSL certificate validation.
- **Warning**: Do not use `0` in production environments unless necessary for internal self-signed certificates.
