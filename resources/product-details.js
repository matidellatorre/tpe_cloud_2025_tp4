document.addEventListener("DOMContentLoaded", function () {
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", function () {
      mobileMenu.classList.toggle("hidden");
    });
  }
  loadProductDetails();
});

let currentProduct = null;
let relatedPools = [];

async function loadProductDetails() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get("id");

    if (!productId) {
      showError();
      return;
    }
    currentProduct = await window.apiClient.getProduct(productId);
    displayProductDetails(currentProduct);
    await loadRelatedPools(productId);
  } catch (error) {
    showError();
  }
}

function displayProductDetails(product) {
  document.getElementById("product-loading").classList.add("hidden");
  document.getElementById("product-details").classList.remove("hidden");

  const imageUrl = product.image_url || "https://placehold.co/600x400?text=No+Image";
  document.getElementById("product-image").src = imageUrl;
  document.getElementById("product-image").alt = product.name;
  document.getElementById("product-name").textContent = product.name;
  document.getElementById("product-description").textContent = product.description || "No description available";
  document.getElementById("product-price").textContent = `$${product.unit_price.toFixed(2)}`;

  // Hide "Create Pool for this Product" button for non-company users
  const createPoolBtn = document.querySelector('button[onclick="createPoolFromDetails()"]');
  const userRole = localStorage.getItem("user_role");
  if (createPoolBtn) {
    if (userRole === "company") {
      createPoolBtn.classList.remove("hidden");
    } else {
      createPoolBtn.classList.add("hidden");
    }
  }
}

async function loadRelatedPools(productId) {
  try {
    const allPools = await window.apiClient.getPools();
    relatedPools = allPools.filter((pool) => pool.product_id == productId);

    displayRelatedPools();
  } catch (error) {}
}

function displayRelatedPools() {
  const container = document.getElementById("related-pools");
  const noPools = document.getElementById("no-pools");

  if (relatedPools.length === 0) {
    container.innerHTML = "";
    noPools.classList.remove("hidden");
    return;
  }

  noPools.classList.add("hidden");
  container.innerHTML = relatedPools
    .map((pool) => createPoolCard(pool))
    .join("");
}

function createPoolCard(pool) {
  const today = new Date();
  const deadline = new Date(pool.end_at);
  const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining < 0;
  const status = pool.status;
  const userRole = localStorage.getItem("user_role");
  const canJoinPool = userRole === "client";

  return `
        <div class="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-200">
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-gray-900 mb-1">Pool #${
                      pool.id
                    }</h3>
                    <p class="text-sm text-gray-500">Minimum: ${
                      pool.min_quantity
                    } units</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-medium ${
                  isExpired
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
                } capitalize ml-2">
                    ${isExpired ? "Expired" : "Active"}
                </span>
            </div>

            <div class="mb-4 bg-purple-50 rounded-lg p-4">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <span class="text-2xl font-bold text-gray-900">$${currentProduct.unit_price.toFixed(
                          2
                        )}</span>
                        <span class="text-sm text-gray-500 ml-2">per unit</span>
                    </div>
                    <span class="text-green-600 font-bold text-lg">Bulk Order</span>
                </div>
                <p class="text-xs text-gray-600">Minimum quantity: ${
                  pool.min_quantity
                } units</p>
            </div>

            <div class="flex items-center justify-between text-sm text-gray-600 mb-4 pb-4 border-b border-gray-200">
                <div class="flex items-center space-x-1">
                    <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span class="${
                      isExpired ? "text-red-600 font-medium" : ""
                    }">${
    isExpired ? "Expired" : `${daysRemaining} days left`
  }</span>
                </div>
                <div></div>
            </div>

            <div class="flex space-x-2">
                ${!isExpired && canJoinPool ? `
                    <button onclick="joinPool(${pool.id})" class="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-md">
                        Join Pool
                    </button>
                ` : !isExpired ? `
                    <button disabled class="flex-1 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed" title="Only clients can join pools">
                        Join Pool
                    </button>
                ` : `
                    <button disabled class="flex-1 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed">
                        Expired
                    </button>
                `
                }
                <button onclick="viewPoolDetails(${
                  pool.id
                })" class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
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
  const pool = relatedPools.find((p) => p.id === poolId);
  if (pool && !isExpired(pool.end_at)) {
    openJoinPoolModal(pool);
  }
}

function openJoinPoolModal(pool) {
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
                                    <p class="font-bold text-gray-900">${
                                      pool.product?.name || currentProduct.name
                                    }</p>
                                    <p class="text-sm text-gray-600">$${
                                      pool.product?.unit_price?.toFixed(2) ||
                                      currentProduct.unit_price.toFixed(2)
                                    } per unit</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-purple-600">Minimum:</p>
                                    <p class="text-lg font-bold text-purple-600">${
                                      pool.min_quantity
                                    } units</p>
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
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  setupJoinPoolModalEvents(pool);
}

function setupJoinPoolModalEvents(pool) {
  const modal = document.getElementById("join-pool-modal");
  const closeBtn = document.getElementById("close-join-modal-btn");
  const cancelBtn = document.getElementById("cancel-join-modal-btn");
  const form = document.getElementById("join-pool-form");
  const emailInput = document.getElementById("join-email");
  const userEmail = localStorage.getItem("user_email");

  if (userEmail) {
    emailInput.value = userEmail;
  }
  closeBtn.addEventListener("click", closeJoinPoolModal);
  cancelBtn.addEventListener("click", closeJoinPoolModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeJoinPoolModal();
    }
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("submit-join-btn");
    const submitText = document.getElementById("submit-join-text");
    const submitLoading = document.getElementById("submit-join-loading");

    const email = document.getElementById("join-email").value;
    const quantity = document.getElementById("join-quantity").value;
    if (!email) {
      showNotification("Please enter your email", "error");
      return;
    }

    if (!quantity || quantity < 1) {
      showNotification("Please enter a valid quantity", "error");
      return;
    }
    submitBtn.disabled = true;
    submitText.classList.add("hidden");
    submitLoading.classList.remove("hidden");

    const requestData = {
      email: email,
      quantity: parseInt(quantity),
    };

    try {
      await window.apiClient.createPoolRequest(pool.id, requestData);
      closeJoinPoolModal();
      showNotification("Successfully joined pool!", "success");
      await loadRelatedPools(currentProduct.id); // Reload pools
    } catch (error) {
      showNotification("Error joining pool. Please try again.", "error");
    } finally {
      submitBtn.disabled = false;
      submitText.classList.remove("hidden");
      submitLoading.classList.add("hidden");
    }
  });
}

function closeJoinPoolModal() {
  const modal = document.getElementById("join-pool-modal");
  if (modal) {
    modal.remove();
  }
}

function isExpired(endDate) {
  const today = new Date();
  const deadline = new Date(endDate);
  return deadline < today;
}

function viewPoolDetails(poolId) {
  window.location.href = `pool-details.html?id=${poolId}`;
}

function createPoolFromDetails() {
  if (currentProduct) {
    openCreatePoolModal(currentProduct);
  }
}

function openCreatePoolModal(product) {
  const modalHTML = `
        <div id="create-pool-modal-from-product" class="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-90vh overflow-y-auto">
                <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="text-xl font-bold text-gray-900">Create Pool for ${
                      product.name
                    }</h3>
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
                                    <p class="font-bold text-gray-900">${
                                      product.name
                                    }</p>
                                    <p class="text-sm text-gray-600">${
                                      product.description ||
                                      "No description available"
                                    }</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-purple-600">Unit Price:</p>
                                    <p class="text-xl font-bold text-purple-600">$${product.unit_price.toFixed(
                                      2
                                    )}</p>
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
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  const deadlineInput = document.getElementById("pool-deadline-from-product");
  const today = new Date().toISOString().split("T")[0];
  deadlineInput.setAttribute("min", today);
  setupCreatePoolModalEvents(product);
}

function setupCreatePoolModalEvents(product) {
  const modal = document.getElementById("create-pool-modal-from-product");
  const closeBtn = document.getElementById("close-pool-modal-btn");
  const cancelBtn = document.getElementById("cancel-pool-modal-btn");
  const form = document.getElementById("create-pool-form-from-product");
  closeBtn.addEventListener("click", closeCreatePoolModal);
  cancelBtn.addEventListener("click", closeCreatePoolModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeCreatePoolModal();
    }
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById("submit-pool-from-product-btn");
    const submitText = document.getElementById("submit-pool-from-product-text");
    const submitLoading = document.getElementById(
      "submit-pool-from-product-loading"
    );

    const minQuantity = document.getElementById(
      "pool-capacity-from-product"
    ).value;
    const deadline = document.getElementById(
      "pool-deadline-from-product"
    ).value;
    if (!minQuantity || minQuantity < 2) {
      showNotification("Minimum quantity must be at least 2", "error");
      return;
    }

    if (!deadline) {
      showNotification("Please select a deadline", "error");
      return;
    }
    submitBtn.disabled = true;
    submitText.classList.add("hidden");
    submitLoading.classList.remove("hidden");

    const poolData = {
      product_id: product.id,
      start_at: new Date().toISOString().split("T")[0],
      end_at: deadline,
      min_quantity: parseInt(minQuantity),
    };

    try {
      await window.apiClient.createPool(poolData);
      closeCreatePoolModal();
      showNotification("Pool created successfully!", "success");
      await loadRelatedPools(product.id);
    } catch (error) {
      showNotification("Error creating pool. Please try again.", "error");
    } finally {
      submitBtn.disabled = false;
      submitText.classList.remove("hidden");
      submitLoading.classList.add("hidden");
    }
  });
}

function closeCreatePoolModal() {
  const modal = document.getElementById("create-pool-modal-from-product");
  if (modal) {
    modal.remove();
  }
}

function showError() {
  document.getElementById("product-loading").classList.add("hidden");
  document.getElementById("product-error").classList.remove("hidden");
}

function showNotification(message, type = "success") {
  const bgColor = type === "error" ? "bg-red-500" : "bg-green-500";
  const notification = document.createElement("div");
  notification.className = `fixed top-24 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
