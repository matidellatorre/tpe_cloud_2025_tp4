// API Configuration - Este archivo será generado por Terraform
// Si lo ejecutas localmente, usa esta configuración de desarrollo

if (typeof window.API_CONFIG === 'undefined') {
    window.API_CONFIG = {
        // Configuración por defecto para desarrollo local
        // Terraform sobreescribirá esto con la URL real del API Gateway
        apiUrl: 'http://localhost:3000', // Cambia esto si tienes un backend local
        region: 'us-east-1'
    };
}

// Helper function para hacer llamadas al API
class ApiClient {
    constructor() {
        // El apiUrl de Terraform ya incluye la URL base, pero necesitamos agregar el stage
        this.baseUrl = window.API_CONFIG.apiUrl + '/prod';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        // Obtener token de autenticación
        const accessToken = window.cognitoAuth ? window.cognitoAuth.getAccessToken() : null;


        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            }
        };

        // Agregar token de autorización si está disponible
        if (accessToken) {
            defaultOptions.headers['Authorization'] = `Bearer ${accessToken}`;
        }

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(url, config);

            console.log('Response status:', response.status);

            if (response.status === 401) {
                localStorage.setItem('redirect_after_login', window.location.href);
                window.location.href = 'login.html';
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            throw error;
        }
    }

    // Productos
    async getProducts() {
        return this.request('/products');
    }

    async getProduct(productId) {
        return this.request(`/products/${productId}`);
    }

    async createProduct(productData) {
        return this.request('/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    // Pools
    async getPools() {
        return this.request('/pools');
    }

    async getPoolDetails(poolId) {
        return this.request(`/pools/${poolId}`);
    }

    async createPool(poolData) {
        return this.request('/pools', {
            method: 'POST',
            body: JSON.stringify(poolData)
        });
    }

    // Pool Requests
    async getPoolRequests(poolId = null) {
        if (!poolId) {
            throw new Error('poolId is required to get pool requests');
        }
        return this.request(`/pools/${poolId}/requests`);
    }

    async createPoolRequest(poolId, requestData) {
        return this.request(`/pools/${poolId}/requests`, {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
    }

  async getPresignedUrl() {
    return this.request('/images/presigned-url', {
      method: 'POST',
    });
  }

  async uploadFile(file) {
    try {
      // 1. Get the pre-signed URL from our backend
      const { uploadURL, objectKey } = await this.getPresignedUrl();
      if (!uploadURL) {
        throw new Error('Failed to get a pre-signed URL.');
      }

      // 2. Upload the file directly to S3 using the pre-signed URL
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

      // 3. The public URL is the bucket URL + the object key.
      const bucketUrl = uploadURL.split('?')[0].split('/').slice(0, -2).join('/');
      const publicUrl = `${bucketUrl}/${objectKey}`;
      
      console.log('File uploaded successfully:', publicUrl);
      return publicUrl;

    } catch (error) {
      console.error('Upload process failed:', error);
      throw error; // Re-throw the error to be caught by the caller
    }
  }
}

// Crear instancia global del cliente API
window.apiClient = new ApiClient();


