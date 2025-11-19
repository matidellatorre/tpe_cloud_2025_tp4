let requestsData = [];

let currentFilter = 'all';
document.addEventListener('DOMContentLoaded', async () => {
  await loadRequests();
  renderRequests();
  // updateStats();
  setupMobileMenu();
});

function setupMobileMenu() {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });
  }
}

function getStatusInfo(status) {
  switch (status) {
    case 'open':
      return {
        text: 'Active',
        classes: 'bg-green-100 text-green-800',
        color: 'green',
      };
    case 'success':
      return {
        text: 'Completed',
        classes: 'bg-blue-100 text-blue-800',
        color: 'blue',
      };
    case 'failed':
      return {
        text: 'Closed',
        classes: 'bg-red-100 text-red-800',
        color: 'red',
      };
    default:
      return {
        text: status,
        classes: 'bg-gray-100 text-gray-800',
        color: 'gray',
      };
  }
}

function renderRequests() {
  const container = document.getElementById('requests-container');
  const emptyState = document.getElementById('empty-state');

  let filteredRequests = requestsData;
  if (currentFilter !== 'all') {
    filteredRequests = requestsData.filter((req) => req.status === currentFilter);
  }

  if (filteredRequests.length === 0) {
    container.innerHTML = '';
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  container.innerHTML = filteredRequests.map((request) => createRequestCard(request)).join('');
}

function createRequestCard(request) {
  const statusInfo = getStatusInfo(request.pool?.status);
  const today = new Date();
  const deadline = new Date(request.pool?.end_at);
  const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  let statusText = statusInfo.text;

  if (request.pool?.status === 'open') {
    if (daysRemaining >= 0) {
      statusText = `Waiting for pool to complete (${daysRemaining} days left)`;
    } else {
      statusText = 'Pool expired before completion';
    }
  }

  const icon = {
    open: `<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
    success: `<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
    failed: `<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>`,
  };
  const statusIcon = icon[request.pool?.status] || icon.failed;
  return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200">
            <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div class="flex-1">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex-1">
                            <h3 class="text-xl font-bold text-gray-900 mb-1">Pool Request #${request.id}</h3>
                            <p class="text-sm text-gray-500">Pool ID: ${request.pool_id}</p>
                            ${
                              request.pool?.product
                                ? `
                                <p class="text-sm text-gray-600 mt-1">Product: ${request.pool.product.name}</p>
                            `
                                : ''
                            }
                        </div>

                        <span class="px-3 py-1 rounded-full text-xs font-medium ${statusInfo.classes} capitalize ml-2">
                            ${statusInfo.text}
                        </span>
                    </div>
                    <div class="flex items-center space-x-2 mb-4 text-${statusInfo.color}-600">
                        ${statusIcon}
                        <span class="text-sm font-medium">${statusText}</span>
                    </div>
                    <div class="flex items-center space-x-2 text-xs text-gray-600 mb-3">
                        <div class="flex items-center">
                            <div class="w-2 h-2 rounded-full bg-gray-400 mr-1"></div>
                            <span>Requested: ${formatDate(request.created_at)}</span>
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-lg px-3 py-2 mb-3">
                        <p class="text-xs text-gray-600">Email: ${request.email}</p>
                        <p class="text-xs text-gray-600">Quantity: ${request.quantity}</p>
                    </div>
                </div>

                <div class="lg:text-right border-t lg:border-t-0 lg:border-l lg:pl-6 pt-4 lg:pt-0 border-gray-200">
                    <div class="mb-3">
                        <p class="text-xs text-gray-500 mb-1">Pool Request</p>
                        <p class="text-2xl font-bold text-gray-900">#${request.id}</p>
                    </div>
                    <div class="bg-purple-50 rounded-lg px-4 py-2 mb-3">
                        <p class="text-xs text-gray-600">Quantity</p>
                        <p class="text-xl font-bold text-purple-600">${request.quantity}</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <button onclick="viewPoolDetails(${request.pool_id})" class="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                            View Pool
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadRequests() {
  try {
    const loading = document.getElementById('requests-loading');
    if (loading) loading.classList.remove('hidden');

    const userEmail = localStorage.getItem('user_email');

    if (!userEmail) {
      console.error('No user email found');
      if (loading) loading.classList.add('hidden');
      showNotification('Error loading requests. Please login again.', 'error');
      return;
    }

    let allRequests = [];

    try {
      const userRequests = await window.apiClient.getRequests({
        email: userEmail,
      });

      for (const request of userRequests) {
        try {
          let poolWithProduct = request.pool || {};

          if (poolWithProduct.product_id) {
            const product = await window.apiClient.getProduct(poolWithProduct.product_id);
            poolWithProduct.product = product;
          } else {
            poolWithProduct.product = {
              name: 'Product not found',
              description: 'Product information unavailable',
              unit_price: 0,
            };
          }

          allRequests.push({
            ...request,
            pool: poolWithProduct,
          });
        } catch (error) {
          console.error(`Error loading product for request ${request.id}:`, error);
          allRequests.push({
            ...request,
            pool: {
              ...request.pool,
              product: {
                name: 'Product not found',
                description: 'Product information unavailable',
                unit_price: 0,
              },
            },
          });
        }
      }
    } catch (error) {
      console.error('Error loading user requests:', error);
    }

    requestsData = allRequests;

    if (loading) loading.classList.add('hidden');
  } catch (error) {
    console.error('Error in loadRequests:', error);
    const loading = document.getElementById('requests-loading');
    if (loading) loading.classList.add('hidden');
    showNotification('Error loading requests. Please refresh the page.');
  }
}

function updateStats() {
  const totalRequests = requestsData.length;
  const totalQuantity = requestsData.reduce((sum, r) => sum + (r.quantity || 0), 0);

  document.getElementById('pending-count').textContent = totalRequests;
  document.getElementById('confirmed-count').textContent = 0;
  document.getElementById('shipped-count').textContent = 0;
  document.getElementById('total-saved').textContent = formatCurrency(0);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

function copyTracking(trackingNumber) {
  navigator.clipboard.writeText(trackingNumber).then(() => {
    showNotification('Tracking number copied to clipboard!');
  });
}

function trackOrder(trackingNumber) {
  showNotification(`Tracking order: ${trackingNumber}`);
}

function viewPoolDetails(poolId) {
  window.location.href = `pools.html?id=${poolId}`;
}

function showNotification(message, type = 'success') {
  const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
  const notification = document.createElement('div');
  notification.className = `fixed top-24 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
