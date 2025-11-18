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
    console.log("Public page, no auth required:", currentPage);
    return;
  }

  console.log("Protected page detected:", currentPage);
  function redirectToLogin() {
    console.log("Redirecting to login page...");
    localStorage.setItem("redirect_after_login", window.location.href);
    window.location.href = "login.html";
  }
  function checkAuthFromStorage() {
    console.log("Checking authentication from localStorage...");

    const accessToken = localStorage.getItem("cognito_access_token");
    const timestamp = localStorage.getItem("cognito_timestamp");
    const expiresIn = localStorage.getItem("cognito_expires_in");

    console.log("Access token:", accessToken ? "Present" : "Missing");
    console.log("Timestamp:", timestamp);
    console.log("Expires in:", expiresIn);
    if (!accessToken || !timestamp || !expiresIn) {
      console.log("Missing authentication data in localStorage");
      return false;
    }
    const now = Date.now();
    const tokenTime = parseInt(timestamp);
    const tokenExpiry = tokenTime + parseInt(expiresIn) * 1000;

    console.log("Current time:", now);
    console.log("Token expiry:", tokenExpiry);
    console.log(
      "Time remaining (seconds):",
      Math.floor((tokenExpiry - now) / 1000)
    );

    if (now >= tokenExpiry) {
      console.log("Token has expired");
      return false;
    }

    console.log("Token is valid");
    return true;
  }
  const isAuthenticated = checkAuthFromStorage();

  if (!isAuthenticated) {
    console.log("User not authenticated, redirecting immediately...");
    redirectToLogin();
  } else {
    console.log("User authenticated, access granted");
  }
})();
