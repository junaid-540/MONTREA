document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("verifyForgotOtpForm");
  const loader = document.getElementById("loader");
  const resendLink = document.getElementById("resendLink");
  const timerDisplay = document.getElementById("timer");
  const otpInput = document.getElementById("otp");

  // ===== Toastify helper =====
  const showToast = (text, color = "#333") => {
    Toastify({
      text,
      duration: 3000,
      gravity: "top",
      position: "right",
      backgroundColor: color,
      stopOnFocus: true
    }).showToast();
  };

  // ===== Timer Setup =====
  let countdown;
  const TIMER_DURATION = 60; // seconds

  const startTimer = () => {
    let remaining = TIMER_DURATION;
    resendLink.classList.add("disabled-link");
    resendLink.style.pointerEvents = "none";
    resendLink.style.opacity = "0.5";

    timerDisplay.textContent = `Remaining: 01:00s`;

    countdown = setInterval(() => {
      remaining--;

      const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
      const seconds = String(remaining % 60).padStart(2, "0");

      timerDisplay.textContent = `Remaining: ${minutes}:${seconds}s`;

      if (remaining <= 0) {
        clearInterval(countdown);
        timerDisplay.textContent = "You can now resend the code.";
        resendLink.classList.remove("disabled-link");
        resendLink.style.pointerEvents = "auto";
        resendLink.style.opacity = "1";
      }
    }, 1000);
  };

  // Start timer on load
  startTimer();

  // ===== Form Submission =====
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const confirmationCode = otpInput.value.trim();
    if (confirmationCode.length !== 6) {
      showToast("Please enter a valid 6-digit confirmation code.", "#f44336");
      return;
    }

    try {
      loader.style.display = "flex";

      const response = await axios.post("/verify-forgot-otp", { confirmationCode });

      loader.style.display = "none";

      if (response.data.success) {
        // ✅ Use SweetAlert for success message
        Swal.fire({
          icon: "success",
          title: "OTP Verified!",
          text: response.data.message || "Your OTP has been successfully verified.",
          confirmButtonColor: "#4CAF50",
          confirmButtonText: "Continue",
          timer: 2000,
          timerProgressBar: true,
        }).then(() => {
          window.location.href = "/reset-password";
        });
      } else {
        showToast(response.data.message || "Invalid OTP. Please try again.", "#f44336");
      }

    } catch (err) {
      loader.style.display = "none";
      const msg =
        err.response?.data?.message ||
        "Something went wrong while verifying the code. Please try again.";
      showToast(msg, "#f44336");
      console.error("Verify OTP Error:", err);
    }
  });

  // ===== Resend OTP =====
  resendLink.addEventListener("click", async (e) => {
    e.preventDefault();

    if (resendLink.classList.contains("disabled-link")) return;

    try {
      loader.style.display = "flex";
      const response = await axios.get("/resend-forgot-otp");
      loader.style.display = "none";

      if (response.data.success) {
        showToast(response.data.message || "OTP resent successfully!", "#4CAF50");
        clearInterval(countdown);
        startTimer();
      } else {
        showToast(response.data.message || "Failed to resend OTP.", "#f44336");
      }

    } catch (err) {
      loader.style.display = "none";
      showToast("An error occurred while resending OTP.", "#f44336");
      console.error("Resend OTP Error:", err);
    }
  });

  // ===== Toast messages from server (if any) =====
  if (successMessage) showToast(successMessage, "#4CAF50");
  if (errorMessage) showToast(errorMessage, "#f44336");
});
