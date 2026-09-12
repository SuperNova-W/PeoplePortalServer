---
sidebar_position: 2
---

# OpenID Provider Configuration

:::warning Mandatory Scopes
For People Portal to function correctly, the OIDC provider must offer the scopes `openid`, `profile`, `email`, and a custom scope named `people_portal`.
:::

:::note 
Since People Portal is tightly coupled with Authentik, it is recommended to use Authentik as the OIDC provider. Hence, this guide relies heavily configuring appropriate scopes in Authentik.
:::

## Defining a Custom Scope
To define a custom scope in Authentik, follow these steps:

1. Navigate to **Customization** > **Property Mappings**.
2. Click **Create** and choose type **Scope Mapping** (Map an OAuth Scope to User Properties).
3. Enter the following values:
   - **Name**: `People Portal Scope`
   - **Scope Name**: `people_portal`

4. Use the following Python Code for the filtering expression and complete the definition by clicking **Create**

```py
return {
    "pk": request.user.pk,
    "is_superuser": request.user.is_superuser,
    "attributes": request.user.attributes
}
```

## Creating the Application & Provider
To start using Authentik as an OIDC provider for People Portal, you need to create an application and a provider in Authentik. Follow the steps below:

1. Navigate to **Applications** > **Applications**.
2. Click **Create with Provider**, enter **People Portal** as the name, leave the other fields as default and click **Next**.
3. In the **Provider Type** section, select **OAuth2/OpenID Provider** and click **Next**.
4. In the authorization flow type, select `default-provider-authorization-implicit-consent`

5. The client type is confidential and **keep note*** of the Client ID and Client Secret. Append the Redirect URI to be `PEOPLEPORTAL_SERVER/api/auth/redirect` where `PEOPLEPORTAL_SERVER` is the base URL of the People Portal server.

6. In the **Advanced Protocol Settings** section, select the following values:
   - Set an appropriate Access Code Validity
   - Add the Following Scopes:
     - `openid`
     - `profile`
     - `email`
     - `People Portal`
    
7. Leave the rest of the settings as default and click **Submit**.

## Update People Portal Environment Variables
Update the following environment variables in the People Portal server:
- `PEOPLEPORTAL_OIDC_CLIENTID`: Use the noted Client ID from Step 5
- `PEOPLEPORTAL_OIDC_CLIENTSECRET`: Use the noted Client Secret from Step 5
- `PEOPLEPORTAL_OIDC_DSCVURL`: Use the discover URL from **Applications** > **People Portal**