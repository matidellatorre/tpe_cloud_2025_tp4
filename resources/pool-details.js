document.addEventListener("DOMContentLoaded", function () {
  const mobileMenuButton = document.getElementById("mobile-menu-button");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileMenuButton) {
    mobileMenuButton.addEventListener("click", function () {
      mobileMenu.classList.toggle("hidden");
    });
  }
  loadPoolDetails();
});

function getStatusInfo(status) {
  switch (status) {
    case "open":
      return { text: "Active", classes: "bg-green-100 text-green-800" };
    case "success":
      return { text: "Completed", classes: "bg-blue-100 text-blue-800" };
    case "failed":
      return { text: "Closed", classes: "bg-red-100 text-red-800" };
    default:
      return { text: status, classes: "bg-gray-100 text-gray-800" };
  }
}

let currentPool = null;
let poolProduct = null;
let poolRequests = [];

async function loadPoolDetails() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const poolId = urlParams.get("id");

    if (!poolId) {
      showError();
      return;
    }
    currentPool = await window.apiClient.getPoolDetails(poolId);
    poolProduct = await window.apiClient.getProduct(currentPool.product_id);
    await loadPoolRequests(poolId);

    displayPoolDetails();
  } catch (error) {
    showError();
  }
}

function displayPoolDetails() {
  document.getElementById("pool-loading").classList.add("hidden");
  document.getElementById("pool-details").classList.remove("hidden");

  document.getElementById("pool-product-name").textContent = poolProduct.name;
  document.getElementById("pool-product-description").textContent =
    poolProduct.description || "No description available";
  document.getElementById("pool-unit-price").textContent =
    `$${poolProduct.unit_price.toFixed(2)}`;

  const today = new Date();
  const deadline = new Date(currentPool.end_at);
  const daysRemaining = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));

  const statusInfo = getStatusInfo(currentPool.status);
  const statusElement = document.getElementById("pool-status");
  statusElement.textContent = statusInfo.text;
  statusElement.className = `px-3 py-1 rounded-full text-sm font-medium ${statusInfo.classes}`;

  const joined = currentPool.joined || 0;
  const remaining = Math.max(0, currentPool.min_quantity - joined);

  document.getElementById("pool-min-quantity").textContent =
    currentPool.min_quantity;
  document.getElementById("pool-joined").textContent = joined;
  document.getElementById("pool-remaining").textContent = remaining;
  document.getElementById("pool-dates").textContent =
    `${formatDate(currentPool.start_at)} - ${formatDate(currentPool.end_at)}`;

  const progress = Math.min(100, (joined / currentPool.min_quantity) * 100);
  document.getElementById("pool-progress-bar").style.width = `${progress}%`;
  document.getElementById("pool-progress-text").textContent =
    `${joined}/${currentPool.min_quantity} participants`;

  const joinBtn = document.getElementById("join-pool-btn");
  const userRole = localStorage.getItem("user_role");
  const canJoinPool = userRole === "client";

  if (currentPool.status !== "open" || daysRemaining < 0 || !canJoinPool) {
    joinBtn.textContent = canJoinPool
      ? statusInfo.text
      : "Only clients can join";
    joinBtn.disabled = true;
    joinBtn.className =
      "bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-medium cursor-not-allowed";
  }

  displayPoolRequests();
}

async function loadPoolRequests(poolId) {
  try {
    poolRequests = await window.apiClient.getRequests({ pool_id: poolId });
  } catch (error) {
    poolRequests = [];
  }
}

function displayPoolRequests() {
  const container = document.getElementById("pool-requests");
  const noRequests = document.getElementById("no-requests");

  if (poolRequests.length === 0) {
    container.innerHTML = "";
    noRequests.classList.remove("hidden");
    return;
  }

  noRequests.classList.add("hidden");
  container.innerHTML = poolRequests
    .map((request) => createRequestCard(request))
    .join("");
}

function createRequestCard(request) {
  return `
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div class="flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <svg class="w-5 h-5 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <div>
                        <p class="font-medium text-gray-900">${
                          request.email
                        }</p>
                        <p class="text-sm text-gray-500">Requested ${formatDate(
                          request.created_at,
                        )}</p>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-purple-600">${
                      request.quantity
                    }</div>
                    <div class="text-sm text-gray-500">units</div>
                </div>
            </div>
        </div>
    `;
}

async function joinPool() {
  if (currentPool && currentPool.status === "open") {
    openJoinPoolModal(currentPool);
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
                                      poolProduct.name
                                    }</p>
                                    <p class="text-sm text-gray-600">$${poolProduct.unit_price.toFixed(
                                      2,
                                    )} per unit</p>
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
      await loadPoolRequests(currentPool.id);
      displayPoolRequests();
      const joined = (currentPool.joined || 0) + parseInt(quantity);
      currentPool.joined = joined;
      const remaining = Math.max(0, currentPool.min_quantity - joined);

      document.getElementById("pool-joined").textContent = joined;
      document.getElementById("pool-remaining").textContent = remaining;
      const progress = Math.min(100, (joined / currentPool.min_quantity) * 100);
      document.getElementById("pool-progress-bar").style.width = `${progress}%`;
      document.getElementById("pool-progress-text").textContent =
        `${joined}/${currentPool.min_quantity} participants`;
      if (joined >= currentPool.min_quantity) {
        const joinBtn = document.getElementById("join-pool-btn");
        joinBtn.textContent = "Pool Complete";
        joinBtn.disabled = true;
        joinBtn.className =
          "bg-green-500 text-white px-6 py-3 rounded-lg font-medium cursor-not-allowed";
      }
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

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function showError() {
  document.getElementById("pool-loading").classList.add("hidden");
  document.getElementById("pool-error").classList.remove("hidden");
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
