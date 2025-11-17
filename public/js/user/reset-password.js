document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("resetPasswordForm");
  const newPassword = document.getElementById("newPassword");
  const confirmPassword = document.getElementById("confirmPassword");
  const newPasswordToggle = document.getElementById("newPasswordToggle");
  const confirmPasswordToggle = document.getElementById("confirmPasswordToggle");

  // ===== Password toggle icons =====
  const setupToggle = (input, toggleBtn) => {
    toggleBtn.addEventListener("click", () => {
      if (input.type === "password") {
        input.type = "text";
        toggleBtn.innerHTML = `<img src="/public/images/hide.png" alt="hide password" style="width:18px;height:18px;">`;
      } else {
        input.type = "password";
        toggleBtn.innerHTML = "👁️";
      }
    });
  };
  setupToggle(newPassword, newPasswordToggle);
  setupToggle(confirmPassword, confirmPasswordToggle);

  // ===== Password validation (same as signin) =====
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/;

  const showToast = (text, color = "#f44336") => {
    Toastify({
      text,
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: color,
      stopOnFocus: true,
    }).showToast();
  };

  // ===== Form Submission =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPass = newPassword.value.trim();
    const confirmPass = confirmPassword.value.trim();

    if (!passwordRegex.test(newPass)) {
      showToast("Password must include letters and numbers only, min 6 characters.");
      return;
    }

    if (newPass !== confirmPass) {
      showToast("Passwords do not match.");
      return;
    }

    try {
      const response = await axios.post("/reset-password", {
        newPassword: newPass,
        confirmPassword: confirmPass,
      });

      if (response.data.success) {
        Swal.fire({
          icon: "success",
          title: "Password Reset Successful!",
          text: "You’ll now be redirected to the Sign In page.",
          confirmButtonColor: "#000",
          confirmButtonText: "Proceed",
          timer: 4000,
        }).then(() => {
          window.location.href = response.data.data.redirect || "/signin";
        });
      } else {
        showToast(response.data.message || "Failed to reset password.");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Something went wrong while resetting your password.";
      showToast(msg);
      console.error("Reset Password Error:", err);
    }
  });
});
