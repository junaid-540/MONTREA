const swalDefaults = Swal.mixin({
    scrollbarPadding: false,
    heightAuto: false
});

document.addEventListener("DOMContentLoaded", () => {
    
    const pageType = window.pageType || 'forgot'; 

    console.log("PageType : ", pageType);
    console.log("Window.PageType : ", window.pageType);

    let postUrl = '/verify-forgot-otp';
    let resendUrl = '/resend-forgot-otp';
    let successRedirect = '/reset-password';
    let successTitle = 'OTP Verified!';
    let successText = 'Your OTP has been successfully verified.';

    if (pageType === 'email-change') {
        postUrl = '/verify-email-change';
        resendUrl = '/resend-email-change-otp';
        successRedirect = '/signin';
        successTitle = 'Email Verified!';
        successText = 'Your new email has been verified and profile updated.';
    }

    const form = document.getElementById("verifyForgotOtpForm");
    const loader = document.getElementById("loader");
    const resendLink = document.getElementById("resendLink");
    const timerDisplay = document.getElementById("timer");
    const otpInput = document.getElementById("otp");
    const submitBtn = form.querySelector('button[type="submit"]');

    const TIMER_DURATION = 60; // seconds
    let countdown;

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

    // ===== SessionStorage Key Management =====
    const getStorageKey = (key) => {
        return pageType === 'email-change' ? `emailChange_${key}` : `forgotPassword_${key}`;
    };

    // Get OTP sent time from sessionStorage
    function getOTPSentTime() {
        const sentAt = sessionStorage.getItem(getStorageKey('otpSentAt'));
        return sentAt ? parseInt(sentAt) : Date.now();
    }

    // Calculate remaining time based on when OTP was sent
    function calculateRemainingTime() {
        const sentAt = getOTPSentTime();
        const elapsed = Math.floor((Date.now() - sentAt) / 1000);
        const remaining = TIMER_DURATION - elapsed;
        return remaining > 0 ? remaining : 0;
    }

    // Calculate remaining resend cooldown time
    function calculateResendCooldown() {
        const cooldownStart = sessionStorage.getItem(getStorageKey('resendCooldownStart'));
        if (!cooldownStart) return 0;
        
        const elapsed = Math.floor((Date.now() - parseInt(cooldownStart)) / 1000);
        const remaining = TIMER_DURATION - elapsed;
        return remaining > 0 ? remaining : 0;
    }

    function setButtonLoading(button, isLoading, loadingText = 'Processing...') {
        if (isLoading) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${loadingText}`;
            button.style.cursor = 'not-allowed';
            button.style.opacity = '0.7';
        } else {
            button.disabled = false;
            button.textContent = button.dataset.originalText || button.textContent;
            button.style.cursor = 'pointer';
            button.style.opacity = '1';
        }
    }

    // ===== Timer Setup with Persistence =====
    const startTimer = (initialTime = null) => {
        clearInterval(countdown);
        
        let remaining = initialTime !== null ? initialTime : calculateRemainingTime();
        
        if (remaining <= 0) {
            timerDisplay.textContent = "You can now resend the code.";
            timerDisplay.style.color = "#dc3545";
            return;
        }

        timerDisplay.style.color = "";

        const updateDisplay = () => {
            const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
            const seconds = String(remaining % 60).padStart(2, "0");
            timerDisplay.textContent = `Remaining: ${minutes}:${seconds}s`;
        };

        updateDisplay();

        countdown = setInterval(() => {
            remaining--;
            updateDisplay();

            if (remaining <= 0) {
                clearInterval(countdown);
                timerDisplay.textContent = "You can now resend the code.";
                timerDisplay.style.color = "#dc3545";
            }
        }, 1000);
    };

    // ===== Resend Link Management with Persistence =====
    const manageResendLink = (initialTimer = null) => {
        let resendRemaining = initialTimer !== null ? initialTimer : calculateResendCooldown();

        if (resendRemaining <= 0) {
            resendLink.classList.remove("disabled-link");
            resendLink.style.pointerEvents = "auto";
            resendLink.style.opacity = "1";
            resendLink.textContent = "Resend Now";
            return;
        }

        resendLink.classList.add("disabled-link");
        resendLink.style.pointerEvents = "none";
        resendLink.style.opacity = "0.5";
        resendLink.textContent = `Resend in ${resendRemaining}s`;

        const resendInterval = setInterval(() => {
            resendRemaining--;
            resendLink.textContent = `Resend in ${resendRemaining}s`;

            if (resendRemaining <= 0) {
                clearInterval(resendInterval);
                resendLink.classList.remove("disabled-link");
                resendLink.style.pointerEvents = "auto";
                resendLink.style.opacity = "1";
                resendLink.textContent = "Resend Now";
                sessionStorage.removeItem(getStorageKey('resendCooldownStart'));
            }
        }, 1000);
    };

    // Initialize timers with persistence
    const remainingOTPTime = calculateRemainingTime();
    const remainingResendTime = calculateResendCooldown();
    
    startTimer(remainingOTPTime);
    manageResendLink(remainingResendTime);

    // ===== Form Submission =====
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const confirmationCode = otpInput.value.trim();
        if (confirmationCode.length !== 6) {
            showToast("Please enter a valid 6-digit confirmation code.", "#f44336");
            return;
        }

        // Prevent double submission
        if (submitBtn.disabled) return;

        try {
            loader.style.display = "flex";
            submitBtn.disabled = true;
            submitBtn.style.opacity = "0.7";

            const response = await axios.post(postUrl, { confirmationCode });

            loader.style.display = "none";

            if (response.data.success) {
                clearInterval(countdown);
                
                // Clear sessionStorage for this flow
                sessionStorage.removeItem(getStorageKey('otpSentAt'));
                sessionStorage.removeItem(getStorageKey('resendCooldownStart'));

                swalDefaults.fire({
                    icon: "success",
                    title: successTitle,
                    text: response.data.message || successText,
                    confirmButtonColor: "#4CAF50",
                    confirmButtonText: pageType === 'email-change' ? "Log In" : "Continue",
                    timer: 2500,
                    timerProgressBar: true,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                }).then(() => {
                    const backendRedirect = response.data.data?.redirect || response.data.redirect || successRedirect;
                    window.location.href = backendRedirect;
                });
            } else {
                submitBtn.disabled = false;
                submitBtn.style.opacity = "1";
                showToast(response.data.message || "Invalid OTP. Please try again.", "#f44336");
            }

        } catch (err) {
            loader.style.display = "none";
            submitBtn.disabled = false;
            submitBtn.style.opacity = "1";
            
            const msg = err.response?.data?.message || "Something went wrong while verifying the code. Please try again.";
            showToast(msg, "#f44336");
            console.error("Verify OTP Error:", err);
        }
    });

    // ===== Resend OTP with Loading State =====
    resendLink.addEventListener("click", async (e) => {
        e.preventDefault();

        if (resendLink.classList.contains("disabled-link")) return;

        const originalText = resendLink.textContent;

        try {
            loader.style.display = "flex";
            setButtonLoading(resendLink, true, 'Sending...');

            const response = await axios.get(resendUrl);
            
            loader.style.display = "none";

            if (response.data.success) {
                // Update BOTH timestamps for new OTP
                const currentTime = Date.now();
                sessionStorage.setItem(getStorageKey('otpSentAt'), currentTime.toString());
                sessionStorage.setItem(getStorageKey('resendCooldownStart'), currentTime.toString());

                // Reset OTP timer
                clearInterval(countdown);
                startTimer(TIMER_DURATION);
                
                // Clear input and refocus
                otpInput.value = '';
                otpInput.focus();

                showToast(response.data.message || "OTP resent successfully!", "#4CAF50");
                
                // Start resend cooldown
                setButtonLoading(resendLink, false);
                manageResendLink(TIMER_DURATION);
            } else {
                setButtonLoading(resendLink, false);
                resendLink.textContent = originalText;
                showToast(response.data.message || "Failed to resend OTP.", "#f44336");
            }

        } catch (err) {
            loader.style.display = "none";
            setButtonLoading(resendLink, false);
            resendLink.textContent = originalText;
            showToast("An error occurred while resending OTP.", "#f44336");
            console.error("Resend OTP Error:", err);
        }
    });

    // ===== Toast messages from server (if any) =====
    if (successMessage) showToast(successMessage, "#4CAF50");
    if (errorMessage) showToast(errorMessage, "#f44336");
});