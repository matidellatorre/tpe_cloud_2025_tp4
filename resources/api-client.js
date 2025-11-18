if (typeof window.API_CONFIG === "undefined") {
  window.API_CONFIG = {
    apiUrl: "http://localhost:3000",
    region: "us-east-1",
  };
}

class ApiClient {
  constructor() {
    this.baseUrl = window.API_CONFIG.apiUrl + "/prod";
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const accessToken = window.cognitoAuth
      ? window.cognitoAuth.getAccessToken()
      : null;

    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (accessToken) {
      defaultOptions.headers["Authorization"] = `Bearer ${accessToken}`;
    }

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        localStorage.setItem("redirect_after_login", window.location.href);
        window.location.href = "login.html";
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }
  async getProducts() {
    return this.request("/products");
  }

  async getProduct(productId) {
    return this.request(`/products/${productId}`);
  }

  async createProduct(productData) {
    return this.request("/products", {
      method: "POST",
      body: JSON.stringify(productData),
    });
  }
  async getPools() {
    return this.request("/pools");
  }

  async getPoolDetails(poolId) {
    return this.request(`/pools/${poolId}`);
  }

  async createPool(poolData) {
    return this.request("/pools", {
      method: "POST",
      body: JSON.stringify(poolData),
    });
  }
  async getPoolRequests(poolId = null) {
    if (!poolId) {
      throw new Error("poolId is required to get pool requests");
    }
    return this.request(`/pools/${poolId}/requests`);
  }

  async createPoolRequest(poolId, requestData) {
    return this.request(`/pools/${poolId}/requests`, {
      method: "POST",
      body: JSON.stringify(requestData),
    });
  }

  async getPresignedUrl() {
    return this.request("/images/presigned-url", {
      method: "POST",
    });
  }

  async uploadFile(file) {
    try {
      const { uploadURL, objectKey } = await this.getPresignedUrl();
      if (!uploadURL) {
        throw new Error("Failed to get a pre-signed URL.");
      }
      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("S3 upload failed.");
      }
      const bucketUrl = uploadURL
        .split("?")[0]
        .split("/")
        .slice(0, -2)
        .join("/");
      const publicUrl = `${bucketUrl}/${objectKey}`;

      return publicUrl;
    } catch (error) {
      console.error("Upload process failed:", error);
      throw error;
    }
  }
  async getAnalyticsOverview() {
    return this.request("/analytics/overview");
  }

  async getAnalyticsPoolsSales() {
    return this.request("/analytics/pools/sales");
  }

  async getAnalyticsCustomersSavings() {
    return this.request("/analytics/customers/savings");
  }

  // User Roles
  async setUserRole(email, role) {
    return this.request("/users/role", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    });
  }

  async getUserRole() {
    return this.request("/users/role");
  }
}
window.apiClient = new ApiClient();
