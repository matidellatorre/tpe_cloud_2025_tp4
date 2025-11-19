if (typeof window.API_CONFIG === 'undefined') {
  window.API_CONFIG = {
    apiUrl: 'http://localhost:3000',
    region: 'us-east-1',
  };
}

class ApiClient {
  constructor() {
    this.baseUrl = window.API_CONFIG.apiUrl + '/prod';
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const accessToken = localStorage.getItem('cognito_access_token');

    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
    if (accessToken) {
      defaultOptions.headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        const currentPage = window.location.pathname.split('/').pop();
        const publicPages = ['index.html', 'login.html', 'signup.html', 'confirm-email.html', 'callback.html', '/', ''];

        if (!publicPages.includes(currentPage)) {
          localStorage.setItem('redirect_after_login', window.location.href);
          window.location.href = 'login.html';
        }
        return;
      }

      if (!response.ok) {
        let errorText;
        try {
          const response = await fetch(url, config);

          console.log('Response status:', response.status);

          if (response.status === 401) {
            localStorage.setItem('redirect_after_login', window.location.href);
            window.location.href = 'login.html';
            return;
          }

          if (!response.ok) {
            const errorBody = await response.text();
            try {
              const errorJson = JSON.parse(errorBody);
              throw new Error(errorJson.error || errorJson.message || errorBody);
            } catch (e) {
              throw new Error(errorBody || `HTTP error! status: ${response.status}`);
            }
          }

          const data = await response.json();
          return data;
        } catch (error) {
          throw error;
        }
        const error = new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        error.status = response.status;
        error.responseText = errorText;
        throw error;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  }
  async getProducts(email = null) {
    if (email) {
      const queryParams = new URLSearchParams({ email });
      return this.request(`/products?${queryParams.toString()}`);
    }
    return this.request('/products');
  }

  async getProduct(productId) {
    return this.request(`/products/${productId}`);
  }

  async createProduct(productData) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    });
  }

  async deleteProduct(productId) {
    return this.request(`/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async getPools(email = null) {
    if (email) {
      const queryParams = new URLSearchParams({ email });
      return this.request(`/pools?${queryParams.toString()}`);
    }
    return this.request('/pools');
  }

  async getPoolDetails(poolId) {
    return this.request(`/pools/${poolId}`);
  }

  async createPool(poolData) {
    return this.request('/pools', {
      method: 'POST',
      body: JSON.stringify(poolData),
    });
  }
  async getRequests(params = {}) {
    const { email, pool_id } = params;

    if (!email && !pool_id) {
      throw new Error('Either email or pool_id is required to get requests');
    }

    const queryParams = new URLSearchParams();
    if (email) queryParams.append('email', email);
    if (pool_id) queryParams.append('pool_id', pool_id);

    return this.request(`/requests?${queryParams.toString()}`);
  }

  async createPoolRequest(poolId, requestData) {
    return this.request(`/pools/${poolId}/requests`, {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getPresignedUrl() {
    return this.request('/images/presigned-url', {
      method: 'POST',
    });
  }

  async uploadFile(file) {
    try {
      const { uploadURL, objectKey } = await this.getPresignedUrl();
      if (!uploadURL) {
        throw new Error('Failed to get a pre-signed URL.');
      }
      const uploadResponse = await fetch(uploadURL, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('S3 upload failed.');
      }
      const bucketUrl = uploadURL.split('?')[0].split('/').slice(0, -2).join('/');
      const publicUrl = `${bucketUrl}/${objectKey}`;

      return publicUrl;
    } catch (error) {
      console.error('Upload process failed:', error);
      throw error;
    }
  }
  async getAnalyticsOverview() {
    return this.request('/analytics/overview');
  }

  async getAnalyticsPoolsSales() {
    return this.request('/analytics/pools/sales');
  }

  async setUserRole(email, role) {
    return this.request('/users/role', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    });
  }

  async getUserRole() {
    return this.request('/users/role');
  }
}

window.apiClient = new ApiClient();
