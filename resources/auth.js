class CognitoAuth {
  constructor() {
    this.isAuthenticated = false;
    this.user = null;
    this.init();
  }

  init() {
    const currentPage = window.location.pathname.split("/").pop();
    const publicPages = ["index.html", "login.html", "signup.html", "confirm-email.html", "callback.html", "/", ""];

    if (publicPages.includes(currentPage)) {
      this.checkAuthStatus();
      return;
    }

    const isAuth = this.checkAuthStatus();
    if (isAuth) {
      this.fetchAndSaveUserRole().catch(err => {
        console.error('Error fetching user role on init:', err);
      });
    }
  }

  checkAuthStatus() {
    const accessToken = localStorage.getItem("cognito_access_token");
    const timestamp = localStorage.getItem("cognito_timestamp");
    const expiresIn = localStorage.getItem("cognito_expires_in");

    if (!accessToken || !timestamp || !expiresIn) {
      this.isAuthenticated = false;
      return false;
    }
    const now = Date.now();
    const tokenTime = parseInt(timestamp);
    const tokenExpiry = tokenTime + parseInt(expiresIn) * 1000;

    if (now >= tokenExpiry) {
      this.refreshToken();
      return false;
    }

    this.isAuthenticated = true;
    this.user = this.parseUserFromToken(accessToken);
    return true;
  }

  parseUserFromToken(token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        name: payload.name || payload.email,
      };
    } catch (err) {
      return null;
    }
  }

  login() {
    const cognitoDomain = window.API_CONFIG.cognito.domain;
    const clientId = window.API_CONFIG.cognito.clientId;
    const redirectUri = window.API_CONFIG.cognito.redirectUri;
    const responseType = "code";
    const scope = "email openid profile";

    const loginUrl =
      `https://${cognitoDomain}/login?` +
      `client_id=${clientId}&` +
      `response_type=${responseType}&` +
      `scope=${scope}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.href = loginUrl;
  }

  signup() {
    const cognitoDomain = window.API_CONFIG.cognito.domain;
    const clientId = window.API_CONFIG.cognito.clientId;
    const redirectUri = window.API_CONFIG.cognito.redirectUri;
    const responseType = "code";
    const scope = "email openid profile";

    const signupUrl =
      `https://${cognitoDomain}/signup?` +
      `client_id=${clientId}&` +
      `response_type=${responseType}&` +
      `scope=${scope}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}`;

    window.location.href = signupUrl;
  }

  logout() {
    localStorage.removeItem("cognito_access_token");
    localStorage.removeItem("cognito_id_token");
    localStorage.removeItem("cognito_refresh_token");
    localStorage.removeItem("cognito_token_type");
    localStorage.removeItem("cognito_expires_in");
    localStorage.removeItem("cognito_timestamp");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_role");

    this.isAuthenticated = false;
    this.user = null;
    window.location.href = "index.html";
  }

  async refreshToken() {
    const refreshToken = localStorage.getItem("cognito_refresh_token");

    if (!refreshToken) {
      this.isAuthenticated = false;
      return false;
    }

    try {
      const cognitoDomain = window.API_CONFIG.cognito.domain;
      const clientId = window.API_CONFIG.cognito.clientId;

      const tokenUrl = `https://${cognitoDomain}/oauth2/token`;

      const params = new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: refreshToken,
      });

      const response = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const tokens = await response.json();
      localStorage.setItem("cognito_access_token", tokens.access_token);
      localStorage.setItem("cognito_id_token", tokens.id_token);
      localStorage.setItem("cognito_refresh_token", tokens.refresh_token);
      localStorage.setItem("cognito_token_type", tokens.token_type);
      localStorage.setItem("cognito_expires_in", tokens.expires_in);
      localStorage.setItem("cognito_timestamp", Date.now().toString());

      this.isAuthenticated = true;
      this.user = this.parseUserFromToken(tokens.access_token);
      return true;
    } catch (err) {
      this.logout();
      return false;
    }
  }
  getAccessToken() {
    const token = localStorage.getItem("cognito_access_token");
    return token;
  }
  getUser() {
    return this.user;
  }
  isLoggedIn() {
    const accessToken = localStorage.getItem("cognito_access_token");
    const timestamp = localStorage.getItem("cognito_timestamp");
    const expiresIn = localStorage.getItem("cognito_expires_in");

    if (!accessToken || !timestamp || !expiresIn) {
      this.isAuthenticated = false;
      this.user = null;
      return false;
    }
    const now = Date.now();
    const tokenTime = parseInt(timestamp);
    const tokenExpiry = tokenTime + parseInt(expiresIn) * 1000;

    if (now >= tokenExpiry) {
      this.isAuthenticated = false;
      this.user = null;
      return false;
    }
    this.isAuthenticated = true;
    if (!this.user) {
      this.user = this.parseUserFromToken(accessToken);
    }

    return true;
  }
  async loginWithPassword(email, password) {
    try {
      const params = {
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: window.API_CONFIG.cognito.clientId,
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
        },
      };

      const response = await this.cognitoRequest("InitiateAuth", params);

      if (response.AuthenticationResult) {
        this._saveTokens(response.AuthenticationResult);
        this.isAuthenticated = true;
        this.user = this.parseUserFromToken(
          response.AuthenticationResult.AccessToken
        );
        return response.AuthenticationResult;
      } else {
        throw new Error("Error en la autenticación");
      }
    } catch (error) {
      throw new Error(this._getErrorMessage(error));
    }
  }
  async signupWithPassword(email, password) {
    try {
      const params = {
        ClientId: window.API_CONFIG.cognito.clientId,
        Username: email,
        Password: password,
        UserAttributes: [
          {
            Name: "email",
            Value: email,
          },
        ],
      };

      const response = await this.cognitoRequest("SignUp", params);

      if (response.UserSub) {
        return response;
      } else {
        throw new Error("Error al crear la cuenta");
      }
    } catch (error) {
      throw new Error(this._getErrorMessage(error));
    }
  }
  async confirmSignup(email, code) {
    try {
      const params = {
        ClientId: window.API_CONFIG.cognito.clientId,
        Username: email,
        ConfirmationCode: code,
      };

      const response = await this.cognitoRequest("ConfirmSignUp", params);
      if (response) {
        try {
          const password = localStorage.getItem("pending_password");
          if (password) {
            const loginResult = await this.loginWithPassword(email, password);
            localStorage.removeItem("pending_password");
            return {
              ...response,
              loginResult: loginResult,
            };
          }
        } catch (loginError) {}
      }

      return response;
    } catch (error) {
      throw new Error(this._getErrorMessage(error));
    }
  }
  async resendConfirmationCode(email) {
    try {
      const params = {
        ClientId: window.API_CONFIG.cognito.clientId,
        Username: email,
      };

      const response = await this.cognitoRequest(
        "ResendConfirmationCode",
        params
      );
      return response;
    } catch (error) {
      throw new Error(this._getErrorMessage(error));
    }
  }
  async cognitoRequest(action, params) {
    try {
      if (typeof AWS === "undefined") {
        throw new Error("AWS SDK no está cargado");
      }

      if (!AWS.CognitoIdentityServiceProvider) {
        throw new Error(
          "AWS CognitoIdentityServiceProvider no está disponible"
        );
      }

      const cognito = new AWS.CognitoIdentityServiceProvider({
        region: window.API_CONFIG.region,
      });
      const methodMap = {
        InitiateAuth: "initiateAuth",
        SignUp: "signUp",
        ConfirmSignUp: "confirmSignUp",
        ResendConfirmationCode: "resendConfirmationCode",
      };

      const methodName = methodMap[action];
      if (!methodName) {
        throw new Error(`Método no soportado: ${action}`);
      }

      const method = cognito[methodName];
      if (!method) {
        throw new Error(`Método ${methodName} no existe en el cliente Cognito`);
      }

      const result = await method.call(cognito, params).promise();

      return result;
    } catch (error) {
      throw error;
    }
  }

  _saveTokens(authResult) {
    localStorage.setItem("cognito_access_token", authResult.AccessToken);
    localStorage.setItem("cognito_id_token", authResult.IdToken);
    localStorage.setItem("cognito_refresh_token", authResult.RefreshToken);
    localStorage.setItem("cognito_token_type", authResult.TokenType);
    localStorage.setItem("cognito_expires_in", authResult.ExpiresIn);
    localStorage.setItem("cognito_timestamp", Date.now().toString());

    const user = this.parseUserFromToken(authResult.AccessToken);
    if (user && user.email) {
      localStorage.setItem("user_email", user.email);
    }
  }

  async fetchAndSaveUserRole() {
    try {
      if (!window.apiClient) {
        console.warn('API client not available');
        return null;
      }

      const roleData = await window.apiClient.getUserRole();
      if (roleData && roleData.role) {
        localStorage.setItem('user_role', roleData.role);
        return roleData.role;
      } else {
        localStorage.removeItem('user_role');
        return null;
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }

  _getErrorMessage(error) {
    if (error.message) {
      if (error.message.includes("UserNotFoundException")) {
        return "Usuario no encontrado";
      } else if (error.message.includes("NotAuthorizedException")) {
        return "Contraseña incorrecta";
      } else if (error.message.includes("UserNotConfirmedException")) {
        return "Usuario no confirmado. Revisa tu email";
      } else if (error.message.includes("UsernameExistsException")) {
        return "El usuario ya existe";
      } else if (error.message.includes("InvalidPasswordException")) {
        return "La contraseña no cumple con los requisitos";
      } else if (error.message.includes("InvalidParameterException")) {
        return "Parámetros inválidos";
      }
    }
    return error.message || "Error desconocido";
  }
}

window.cognitoAuth = new CognitoAuth();
