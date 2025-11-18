// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Pools functionality
    initializePools();
});

function getStatusInfo(status) {
  switch (status) {
    case 'open':
      return { text: 'Active', classes: 'bg-green-100 text-green-800' };
    case 'success':
      return { text: 'Completed', classes: 'bg-blue-100 text-blue-800' };
    case 'failed':
      return { text: 'Closed', classes: 'bg-red-100 text-red-800' };
    default:
      return { text: status, classes: 'bg-gray-100 text-gray-800' };
  }
}

// Pools data - will be loaded from API
let poolsData = [];
let productsData = []; // Para cargar productos en el formulario

async function initializePools() {
    const createPoolBtn = document.getElementById('create-pool-btn');
    const modal = document.getElementById('create-pool-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const createPoolForm = document.getElementById('create-pool-form');
    const productSelect = document.getElementById('pool-product');

    // Set minimum date for deadline to today
    const deadlineInput = document.getElementById('pool-deadline');
    if (deadlineInput) {
        const today = new Date().toISOString().split('T')[0];
        deadlineInput.setAttribute('min', today);
    }

    // Load pools from API
    await loadPools();
    
    // Load products for the form
    await loadProductsForForm();

    // Product selection preview
    if (productSelect) {
        productSelect.addEventListener('change', (e) => {
            const productId = parseInt(e.target.value);
            if (productId) {
                const product = productsData.find(p => p.id === productId);
                if (product) {
                    showProductPreview(product);
                }
            } else {
                hideProductPreview();
            }
        });
    }

    // Modal controls
    if (createPoolBtn) {
        createPoolBtn.addEventListener('click', async () => {
            // Recargar productos cada vez que se abre el modal
            await loadProductsForForm();
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    if (cancelModalBtn) {
        cancelModalBtn.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }

    function closeModal() {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        createPoolForm.reset();
        hideProductPreview();
    }

    // Form submission
    if (createPoolForm) {
        createPoolForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submit-pool-btn');
            const submitText = document.getElementById('submit-pool-text');
            const submitLoading = document.getElementById('submit-pool-loading');
            
            const productId = document.getElementById('pool-product').value;
            const minQuantity = document.getElementById('pool-capacity').value;
            const deadline = document.getElementById('pool-deadline').value;
            
            // Validación
            if (!productId) {
                showNotification('Please select a product', 'error');
                return;
            }
            
            if (!minQuantity || minQuantity < 2) {
                showNotification('Minimum quantity must be at least 2', 'error');
                return;
            }
            
            if (!deadline) {
                showNotification('Please select a deadline', 'error');
                return;
            }
            
            // Show loading state
            submitBtn.disabled = true;
            submitText.classList.add('hidden');
            submitLoading.classList.remove('hidden');
            
            const poolData = {
                product_id: parseInt(productId),
                start_at: new Date().toISOString().split('T')[0], // Fecha actual como inicio
                end_at: deadline,
                min_quantity: parseInt(minQuantity)
            };

            try {
                const result = await window.apiClient.createPool(poolData);
                await loadPools(); // Reload pools from API
                closeModal();
                showNotification('Pool created successfully!', 'success');
            } catch (error) {
                showNotification('Error creating pool. Please try again.', 'error');
            } finally {
                // Hide loading state
                submitBtn.disabled = false;
                submitText.classList.remove('hidden');
                submitLoading.classList.add('hidden');
            }
        });
    }


    // Initial render
    renderPools();
}

async function loadPools() {
    try {
        const loading = document.getElementById('pools-loading');
        if (loading) loading.classList.remove('hidden');
        
        // Obtener pools del API
        const pools = await window.apiClient.getPools();
        
        // Para cada pool, obtener los datos del producto
        const poolsWithProducts = await Promise.all(
            pools.map(async (pool) => {
                try {
                    const product = await window.apiClient.getProduct(pool.product_id);
                    return {
                        ...pool,
                        product: product
                    };
                } catch (error) {
                    return {
                        ...pool,
                        product: {
                            id: pool.product_id,
                            name: 'Product not found',
                            description: 'Product information unavailable',
                            unit_price: 0
                        }
                    };
                }
            })
        );
        
        poolsData = poolsWithProducts;
        
        if (loading) loading.classList.add('hidden');
        renderPools();
    } catch (error) {
        const loading = document.getElementById('pools-loading');
        if (loading) loading.classList.add('hidden');
        showNotification('Error loading pools. Please refresh the page.');
    }
}

function renderPools() {
    const container = document.getElementById('pools-container');
    const loading = document.getElementById('pools-loading');
    const empty = document.getElementById('pools-empty');

    if (poolsData.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    container.innerHTML = poolsData.map(pool => createPoolCard(pool)).join('');
}

function createPoolCard(pool) {
    // Datos básicos
    const capacity = pool.min_quantity || 1;
    const price = pool.product?.unit_price || pool.unit_price || 0;

    // Calculate days remaining usando end_at
    const today = new Date();
    const deadline = new Date(pool.end_at);
    const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

    const statusInfo = getStatusInfo(pool.status);

    return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-200">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-gray-900 mb-1">${pool.product?.name || 'Product'}</h3>
                    <p class="text-sm text-gray-500">${pool.product?.description || 'Pool description'}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-medium ${statusInfo.classes} capitalize ml-2">
                    ${statusInfo.text}
                </span>
            </div>
            
            <div class="mb-4 bg-purple-50 rounded-lg p-4">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <span class="text-2xl font-bold text-gray-900">$${price.toFixed(2)}</span>
                        <span class="text-sm text-gray-500 ml-2">per unit</span>
                    </div>
                    <span class="text-green-600 font-bold text-lg">Bulk Order</span>
                </div>
                <p class="text-xs text-gray-600">Minimum quantity: ${capacity} units</p>
            </div>
            
            <div class="flex items-center justify-between text-sm text-gray-600 mb-4 pb-4 border-b border-gray-200">
                <div class="flex items-center space-x-1">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span class="${pool.status === 'open' && daysRemaining < 0 ? 'text-red-600 font-medium' : ''}">${pool.status === 'open' ? (daysRemaining >= 0 ? `${daysRemaining} days left` : 'Expired') : 'Ended'}</span>
                </div>
                <div class="text-xs text-gray-500">
                    ${formatDate(pool.start_at)} - ${formatDate(pool.end_at)}
                </div>
            </div>
            
            <div class="flex space-x-2">
                ${pool.status === 'open' && daysRemaining >= 0 ? `
                    <button onclick="joinPool(${pool.id})" class="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md">
                        Join Pool
                    </button>
                ` : `
                    <button disabled class="flex-1 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
                        ${statusInfo.text}
                    </button>
                `}
                <button onclick="viewPoolDetails(${pool.id})" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                    <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
            </div>
        </div>
    `;
}

async function joinPool(poolId) {
    const pool = poolsData.find(p => p.id === poolId);
    if (pool && pool.status === 'open') {
        // Open join pool modal
        openJoinPoolModal(pool);
    }
}

function openJoinPoolModal(pool) {
    // Create modal HTML
    const modalHTML = `
        <div id="join-pool-modal" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-900">Join Pool</h3>
                    <button id="close-join-modal-btn" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form id="join-pool-form" class="px-6 py-4">
                    <div class="space-y-4">
                        <!-- Pool Info Display -->
                        <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-sm text-purple-600 font-medium">Pool for:</p>
                                    <p class="font-bold text-gray-900">${pool.product?.name || 'Product'}</p>
                                    <p class="text-sm text-gray-600">$${pool.product?.unit_price?.toFixed(2) || '0.00'} per unit</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-purple-600">Minimum:</p>
                                    <p class="text-lg font-bold text-purple-600">${pool.min_quantity} units</p>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <div>
                                <label for="join-email" class="block text-sm font-medium text-gray-700 mb-1">
                                    Email <span class="text-red-500">*</span>
                                </label>
                                <input type="email" id="join-email" required placeholder="your@email.com" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-100" readonly>
                                <p class="mt-1 text-xs text-gray-500">Using your logged-in email</p>
                            </div>
                            <div>
                                <label for="join-quantity" class="block text-sm font-medium text-gray-700 mb-1">
                                    Quantity <span class="text-red-500">*</span>
                                </label>
                                <input type="number" id="join-quantity" required min="1" placeholder="1" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                <p class="mt-1 text-xs text-gray-500">How many units do you want?</p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-6 flex justify-end space-x-3">
                        <button type="button" id="cancel-join-modal-btn" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" id="submit-join-btn" class="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium shadow-md transition-all flex items-center space-x-2">
                            <span id="submit-join-text">Join Pool</span>
                            <div id="submit-join-loading" class="hidden">
                                <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </div>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listeners
    setupJoinPoolModalEvents(pool);
}

function setupJoinPoolModalEvents(pool) {
    const modal = document.getElementById('join-pool-modal');
    const closeBtn = document.getElementById('close-join-modal-btn');
    const cancelBtn = document.getElementById('cancel-join-modal-btn');
    const form = document.getElementById('join-pool-form');
    
    // Auto-fill email from localStorage
    const emailInput = document.getElementById('join-email');
    const userEmail = localStorage.getItem('user_email');
    
    if (userEmail) {
        emailInput.value = userEmail;
    }
    
    // Close modal events
    closeBtn.addEventListener('click', closeJoinPoolModal);
    cancelBtn.addEventListener('click', closeJoinPoolModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeJoinPoolModal();
        }
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-join-btn');
        const submitText = document.getElementById('submit-join-text');
        const submitLoading = document.getElementById('submit-join-loading');
        
        const email = document.getElementById('join-email').value;
        const quantity = document.getElementById('join-quantity').value;
        
        // Validation
        if (!email) {
            showNotification('Please enter your email', 'error');
            return;
        }
        
        if (!quantity || quantity < 1) {
            showNotification('Please enter a valid quantity', 'error');
            return;
        }
        
        // Show loading state
        submitBtn.disabled = true;
        submitText.classList.add('hidden');
        submitLoading.classList.remove('hidden');
        
        const requestData = {
            email: email,
            quantity: parseInt(quantity)
        };
        
        try {
            await window.apiClient.createPoolRequest(pool.id, requestData);
            closeJoinPoolModal();
            showNotification('Successfully joined pool!', 'success');
            await loadPools(); // Reload pools from API
        } catch (error) {
            showNotification('Error joining pool. Please try again.', 'error');
        } finally {
            // Hide loading state
            submitBtn.disabled = false;
            submitText.classList.remove('hidden');
            submitLoading.classList.add('hidden');
        }
    });
}

function closeJoinPoolModal() {
    const modal = document.getElementById('join-pool-modal');
    if (modal) {
        modal.remove();
    }
}

function viewPoolDetails(poolId) {
    const pool = poolsData.find(p => p.id === poolId);
    if (pool) {
        window.location.href = `pool-details.html?id=${poolId}`;
    }
}

async function loadProductsForForm() {
    try {
        productsData = await window.apiClient.getProducts();
        const productSelect = document.getElementById('pool-product');
        
        if (!productSelect) return;
        
        // Limpiar opciones existentes (excepto la primera)
        productSelect.innerHTML = '<option value="">-- Select a product --</option>';
        
        // Agregar productos
        productsData.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} - $${product.unit_price.toFixed(2)}`;
            productSelect.appendChild(option);
        });
        
    } catch (error) {
        showNotification('Error loading products. Please try again.', 'error');
    }
}

function showProductPreview(product) {
    const preview = document.getElementById('product-preview');
    const nameEl = document.getElementById('preview-name');
    const descEl = document.getElementById('preview-description');
    const priceEl = document.getElementById('preview-price');
    
    if (preview && nameEl && descEl && priceEl) {
        nameEl.textContent = product.name;
        descEl.textContent = product.description || 'No description available';
        priceEl.textContent = `$${product.unit_price.toFixed(2)}`;
        preview.classList.remove('hidden');
    }
}

function hideProductPreview() {
    const preview = document.getElementById('product-preview');
    if (preview) {
        preview.classList.add('hidden');
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function showNotification(message, type = 'success') {
    // Simple notification with type support
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
