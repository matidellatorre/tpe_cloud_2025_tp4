(function () {
  const publicPages = [
    "index.html",
    "login.html",
    "signup.html",
    "callback.html",
    "/",
    "",
  ];
  const currentPage = window.location.pathname.split("/").pop();
  if (publicPages.includes(currentPage)) {
    return;
  }

  function redirectToLogin() {
    localStorage.setItem("redirect_after_login", window.location.href);
    window.location.href = "login.html";
  }
  function checkAuthFromStorage() {
    const accessToken = localStorage.getItem("cognito_access_token");
    const timestamp = localStorage.getItem("cognito_timestamp");
    const expiresIn = localStorage.getItem("cognito_expires_in");

    if (!accessToken || !timestamp || !expiresIn) {
      return false;
    }
    const now = Date.now();
    const tokenTime = parseInt(timestamp);
    const tokenExpiry = tokenTime + parseInt(expiresIn) * 1000;

    if (now >= tokenExpiry) {
      return false;
    }

    return true;
  }
  const isAuthenticated = checkAuthFromStorage();

  if (!isAuthenticated) {
    redirectToLogin();
  }
})();
