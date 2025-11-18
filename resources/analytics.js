let revenueChart = null;
let successRateChart = null;

async function getUserRole() {
  let role = localStorage.getItem('user_role');

  if (!role && window.cognitoAuth && window.cognitoAuth.isLoggedIn()) {
    try {
      role = await window.cognitoAuth.fetchAndSaveUserRole();
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  }

  return role;
}

document.addEventListener("DOMContentLoaded", async function () {
  if (window.cognitoAuth && !window.cognitoAuth.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  const userRole = await getUserRole();
  if (userRole !== 'company') {
    alert('Access denied. Analytics dashboard is only available for company users.');
    window.location.href = "index.html";
    return;
  }

  loadAnalyticsData();

  setupAuthUI();
});

async function loadAnalyticsData() {
  try {
    showLoading();

    const [overview, poolSales] = await Promise.all([
      window.apiClient.getAnalyticsOverview(),
      window.apiClient.getAnalyticsPoolsSales(),
    ]);

    updateOverviewCards(overview);

    updateCharts(overview, poolSales);

    updateSalesTable(poolSales);

    hideLoading();
  } catch (error) {
    console.error("Error loading analytics data:", error);

    if (error.status === 403 || (error.message && (error.message.includes('403') || error.message.includes('Forbidden')))) {
      alert('Access denied. Analytics dashboard is only available for company users.');
      window.location.href = "index.html";
      return;
    }

    showError("Error loading analytics data. Please try again.");
    hideLoading();
  }
}

function updateOverviewCards(overview) {
  const cardsContainer = document.getElementById("overview-cards");

  const cards = [
    {
      title: "Total Revenue",
      value: formatCurrency(overview.total_revenue || 0),
      icon: "💰",
      color: "bg-green-500",
    },
    {
      title: "Total Pools",
      value: overview.total_pools || 0,
      icon: "📦",
      color: "bg-blue-500",
    },
    {
      title: "Active Pools",
      value: overview.active_pools || 0,
      icon: "🏊",
      color: "bg-purple-500",
    },
    {
      title: "Success Rate",
      value: `${overview.success_rate || 0}%`,
      icon: "📊",
      color: "bg-yellow-500",
    },
  ];

  cardsContainer.innerHTML = cards
    .map(
      (card) => `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-600">${card.title}</p>
                    <p class="text-2xl font-bold text-gray-900 mt-2">${card.value}</p>
                </div>
                <div class="${card.color} rounded-full p-3">
                    <span class="text-2xl">${card.icon}</span>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function updateCharts(overview, poolSales) {
  const revenueCtx = document.getElementById("revenueChart").getContext("2d");

  if (revenueChart) {
    revenueChart.destroy();
  }

  const topPools = poolSales
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10);

  revenueChart = new Chart(revenueCtx, {
    type: "bar",
    data: {
      labels: topPools.map(
        (p) =>
          p.product_name.substring(0, 20) +
          (p.product_name.length > 20 ? "..." : "")
      ),
      datasets: [
        {
          label: "Revenue ($)",
          data: topPools.map((p) => p.total_revenue),
          backgroundColor: "rgba(147, 51, 234, 0.6)",
          borderColor: "rgba(147, 51, 234, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "$" + value.toFixed(2);
            },
          },
        },
      },
    },
  });
  const successCtx = document
    .getElementById("successRateChart")
    .getContext("2d");

  if (successRateChart) {
    successRateChart.destroy();
  }

  const successfulPools = poolSales.filter(
    (p) => p.reached_min_quantity
  ).length;
  const failedPools = poolSales.length - successfulPools;

  successRateChart = new Chart(successCtx, {
    type: "doughnut",
    data: {
      labels: ["Successful", "Not Reached"],
      datasets: [
        {
          data: [successfulPools, failedPools],
          backgroundColor: ["rgba(34, 197, 94, 0.6)", "rgba(239, 68, 68, 0.6)"],
          borderColor: ["rgba(34, 197, 94, 1)", "rgba(239, 68, 68, 1)"],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

function updateSalesTable(poolSales) {
  const tbody = document.getElementById("sales-table-body");

  if (poolSales.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No pool sales data available</td></tr>';
    return;
  }

  tbody.innerHTML = poolSales
    .map(
      (pool) => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${escapeHtml(
              pool.product_name
            )}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
              pool.total_quantity_sold
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
              pool.total_participants
            }</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatCurrency(
              pool.total_revenue
            )}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  pool.reached_min_quantity
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }">
                    ${pool.reached_min_quantity ? "Success" : "Pending"}
                </span>
            </td>
        </tr>
    `
    )
    .join("");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showLoading() {}

function hideLoading() {}

function showError(message) {
  alert(message);
}

function setupAuthUI() {
  const logoutBtn = document.getElementById("logout-btn");
  const authButtons = document.getElementById("auth-buttons");
  const userInfo = document.getElementById("user-info");
  const userMenuBtn = document.getElementById("user-menu-btn");
  const userDropdown = document.getElementById("user-dropdown");
  const userAvatar = document.getElementById("user-avatar");
  const userName = document.getElementById("user-name");

  function updateAuthUI() {
    if (window.cognitoAuth && window.cognitoAuth.isLoggedIn()) {
      authButtons.classList.add("hidden");
      userInfo.classList.remove("hidden");

      const user = window.cognitoAuth.getUser();
      if (user) {
        const name = user.name || user.email || "User";
        const initial = name.charAt(0).toUpperCase();
        userAvatar.textContent = initial;
        userName.textContent = name.split("@")[0];
      }
    } else {
      authButtons.classList.remove("hidden");
      userInfo.classList.add("hidden");
    }
  }

  if (userMenuBtn) {
    userMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle("hidden");
    });
  }

  document.addEventListener("click", (e) => {
    if (userDropdown && !userDropdown.classList.contains("hidden")) {
      userDropdown.classList.add("hidden");
    }
  });

  if (userDropdown) {
    userDropdown.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      if (window.cognitoAuth) {
        window.cognitoAuth.logout();
      }
    });
  }

  updateAuthUI();
  setInterval(updateAuthUI, 5000);
}
