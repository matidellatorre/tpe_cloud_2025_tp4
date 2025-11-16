// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuButton) {
        mobileMenuButton.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Products functionality
    initializeProducts();
});

// Products data - will be loaded from API
let productsData = [];

async function initializeProducts() {
    const addProductBtn = document.getElementById('add-product-btn');
    const modal = document.getElementById('add-product-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const cancelModalBtn = document.getElementById('cancel-modal-btn');
    const addProductForm = document.getElementById('add-product-form');

    // Load products from API
    await loadProducts();

    // Modal controls
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
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
        addProductForm.reset();
    }

    // Form submission
    if (addProductForm) {
        addProductForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submit-product-btn');
            const submitText = document.getElementById('submit-product-text');
            const submitLoading = document.getElementById('submit-product-loading');
            
            // Show loading state
            submitBtn.disabled = true;
            submitText.classList.add('hidden');
            submitLoading.classList.remove('hidden');

            const imageFile = document.getElementById('product-image').files[0];
            let imageUrl = null;
            
            try {
                // Step 1: If there's an image, upload it first.
                if (imageFile) {
                    console.log('Uploading file...');
                    imageUrl = await window.apiClient.uploadFile(imageFile);
                    if (!imageUrl) {
                        // The error is already logged in uploadFile, just stop the process
                        showNotification('Image upload failed. Please try again.', 'error');
                        return; // Stop if upload fails
                    }
                    console.log('File uploaded. Image URL:', imageUrl);
                }
                
                const productData = {
                    name: document.getElementById('product-name').value,
                    description: document.getElementById('product-description').value,
                    unit_price: parseFloat(document.getElementById('product-price').value),
                    image_url: imageUrl, // Use the URL from the upload
                };

                await window.apiClient.createProduct(productData);
                await loadProducts(); // Reload products from API
                closeModal();
                showNotification('Product added successfully!');
            } catch (error) {
                console.error("Error creating product:", error);
                showNotification('Error creating product. Please try again.');
            } finally {
                // Hide loading state
                submitBtn.disabled = false;
                submitText.classList.remove('hidden');
                submitLoading.classList.add('hidden');
            }
        });
    }


    // Initial render
    renderProducts();
}

async function loadProducts() {
    try {
        const loading = document.getElementById('products-loading');
        if (loading) loading.classList.remove('hidden');
        
        productsData = await window.apiClient.getProducts();
        
        if (loading) loading.classList.add('hidden');
        renderProducts();
    } catch (error) {
        const loading = document.getElementById('products-loading');
        if (loading) loading.classList.add('hidden');
        showNotification('Error loading products. Please refresh the page.');
    }
}

function renderProducts() {
    const container = document.getElementById('products-container');
    const loading = document.getElementById('products-loading');
    const empty = document.getElementById('products-empty');

    if (productsData.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }

    empty.classList.add('hidden');
    container.innerHTML = productsData.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    const imageUrl = product.image_url || 'https://placehold.co/600x400?text=No+Image';
    return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200">
            <!-- Product Image -->
            <div class="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <img src="${imageUrl}" alt="${product.name}" class="w-full h-full object-cover">
            </div>
            
            <div class="p-4">
                <!-- Product Name -->
                <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2 h-14">${product.name}</h3>
                
                <!-- Description -->
                <p class="text-sm text-gray-500 mb-3 line-clamp-2 h-10">${product.description || 'No description available'}</p>
                
                <!-- Price -->
                <div class="flex justify-between items-center mb-3 pb-3 border-b border-gray-200">
                    <div>
                        <span class="text-2xl font-bold text-gray-900">$${product.unit_price.toFixed(2)}</span>
                        <span class="text-sm text-gray-500 ml-2">per unit</span>
                    </div>
                </div>
                
                <!-- Actions -->
                <div class="flex space-x-2 w-full">
                    <button onclick="createPool(${product.id})" class="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md">
                        Create Pool
                    </button>
                    <button onclick="viewProductDetails(${product.id})" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function viewProductDetails(productId) {
    const product = productsData.find(p => p.id === productId);
    if (product) {
        window.location.href = `product-details.html?id=${productId}`;
    }
}

function createPool(productId) {
    const product = productsData.find(p => p.id === productId);
    if (product) {
        // Open create pool modal with pre-selected product
        openCreatePoolModal(product);
    }
}

function openCreatePoolModal(product) {
    // Create modal HTML
    const modalHTML = `
        <div id="create-pool-modal-from-product" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-90vh overflow-y-auto">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-900">Create Pool for ${product.name}</h3>
                    <button id="close-pool-modal-btn" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <form id="create-pool-form-from-product" class="px-6 py-4">
                    <div class="space-y-4">
                        <!-- Product Info Display -->
                        <div class="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-sm text-purple-600 font-medium">Selected Product:</p>
                                    <p class="font-bold text-gray-900">${product.name}</p>
                                    <p class="text-sm text-gray-600">${product.description || 'No description available'}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-purple-600">Unit Price:</p>
                                    <p class="text-xl font-bold text-purple-600">$${product.unit_price.toFixed(2)}</p>
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div>
                                <label for="pool-capacity-from-product" class="block text-sm font-medium text-gray-700 mb-1">
                                    Minimum Quantity <span class="text-red-500">*</span>
                                </label>
                                <input type="number" id="pool-capacity-from-product" required min="2" placeholder="10" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                <p class="mt-1 text-xs text-gray-500">Minimum participants needed</p>
                            </div>
                            <div>
                                <label for="pool-deadline-from-product" class="block text-sm font-medium text-gray-700 mb-1">
                                    Deadline <span class="text-red-500">*</span>
                                </label>
                                <input type="date" id="pool-deadline-from-product" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                                <p class="mt-1 text-xs text-gray-500">Pool closing date</p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-6 flex justify-end space-x-3">
                        <button type="button" id="cancel-pool-modal-btn" class="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" id="submit-pool-from-product-btn" class="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium shadow-md transition-all flex items-center space-x-2">
                            <span id="submit-pool-from-product-text">Create Pool</span>
                            <div id="submit-pool-from-product-loading" class="hidden">
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
    
    // Set minimum date for deadline to today
    const deadlineInput = document.getElementById('pool-deadline-from-product');
    const today = new Date().toISOString().split('T')[0];
    deadlineInput.setAttribute('min', today);
    
    // Add event listeners
    setupCreatePoolModalEvents(product);
}

function setupCreatePoolModalEvents(product) {
    const modal = document.getElementById('create-pool-modal-from-product');
    const closeBtn = document.getElementById('close-pool-modal-btn');
    const cancelBtn = document.getElementById('cancel-pool-modal-btn');
    const form = document.getElementById('create-pool-form-from-product');
    
    // Close modal events
    closeBtn.addEventListener('click', closeCreatePoolModal);
    cancelBtn.addEventListener('click', closeCreatePoolModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCreatePoolModal();
        }
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submit-pool-from-product-btn');
        const submitText = document.getElementById('submit-pool-from-product-text');
        const submitLoading = document.getElementById('submit-pool-from-product-loading');
        
        const minQuantity = document.getElementById('pool-capacity-from-product').value;
        const deadline = document.getElementById('pool-deadline-from-product').value;
        
        // Validation
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
            product_id: product.id,
            start_at: new Date().toISOString().split('T')[0],
            end_at: deadline,
            min_quantity: parseInt(minQuantity)
        };
        
        try {
            await window.apiClient.createPool(poolData);
            closeCreatePoolModal();
            showNotification('Pool created successfully!', 'success');
            // Reload products to show updated data
            await loadProducts();
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

function closeCreatePoolModal() {
    const modal = document.getElementById('create-pool-modal-from-product');
    if (modal) {
        modal.remove();
    }
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
