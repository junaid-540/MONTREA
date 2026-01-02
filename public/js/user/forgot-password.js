
const form = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('email');
const verifyBtn = document.getElementById('verifyBtn');

function isValidEmail(email) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

form.addEventListener('submit', async (e) => {
    console.log("Verify button clicked");
  e.preventDefault();
  const email = emailInput.value.trim();

  if (!isValidEmail(email)) {
    Toastify({
      text: "Please enter a valid email address.",
      duration: 3000,
      gravity: "top",
      position: "right",
      close: true,
      style: { background: "linear-gradient(to right, #ff5f6d, #ffc371)" },
    }).showToast();
    return;
  }


  verifyBtn.disabled = true;
  verifyBtn.innerHTML = `
    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
    Verifying...
  `;

  try {
    const response = await axios.post('/forgot-password', { email });

    if (response.data.success) {

      const otpSentAt = response.data.data?.otpSentAt || Date.now();
      sessionStorage.setItem('forgotPassword_otpSentAt', otpSentAt.toString());
      sessionStorage.setItem('forgotPassword_resendCooldownStart', otpSentAt.toString());

      Swal.fire({
        icon: 'success',
        title: 'OTP Sent!',
        text: response.data.message || "Check your email for the OTP.",
        timer: 2000, 
        timerProgressBar: true, 
        showConfirmButton: false, 
        allowOutsideClick: false,
        allowEscapeKey: false,
        didClose: () => {
          window.location.href = '/verify-forgot-otp';
        },
      });
    }
  } catch (err) {
    const errMsg =
      err.response?.data?.message ||
      err.message ||
      "Something went wrong. Please try again.";
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errMsg,
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  } finally {
    verifyBtn.disabled = false;
    verifyBtn.innerHTML = 'Verify Email';
  }
});
