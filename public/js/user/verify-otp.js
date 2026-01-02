document.addEventListener('DOMContentLoaded', () => {
    const timerEl = document.getElementById("timer");
    const verifyForm = document.getElementById("verifyOtpForm");
    const otpInput = document.getElementById("otp");
    const otpFeedback = document.getElementById("otpFeedback");
    const resendBtn = document.getElementById("resendOtpBtn");
    const verifyBtn = verifyForm.querySelector('button[type="submit"]');
    
    const OTP_DURATION = 60; 
    let timeLeft = OTP_DURATION;
    let countdownInterval;
    let isResendDisabled = false;
    let resendTimer = 60;

    function getOTPSentTime() {
        const sentAt = sessionStorage.getItem('otpSentAt');
        return sentAt ? parseInt(sentAt) : Date.now();
    }

    function calculateRemainingTime() {
        const sentAt = getOTPSentTime();
        const elapsed = Math.floor((Date.now() - sentAt) / 1000); // seconds elapsed
        const remaining = OTP_DURATION - elapsed;
        return remaining > 0 ? remaining : 0;
    }

    function validateOTP(otp) {
        const otpRegex = /^[0-9]{6}$/;
        if (!otp || otp.trim() === '') return null; 
        if (!otpRegex.test(otp)) return 'OTP must be 6 digits';
        return null;
    }

    function showError(input, feedback, message) {
        input.classList.add('is-invalid');
        feedback.style.display = 'block';
        feedback.textContent = message;
    }

    function hideError(input, feedback) {
        input.classList.remove('is-invalid');
        feedback.style.display = 'none';
        feedback.textContent = '';
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

    function startOTPTimer(initialTime = null) {
        clearInterval(countdownInterval);
        
        timeLeft = initialTime !== null ? initialTime : calculateRemainingTime();
        
        // If already expired, show expired state
        if (timeLeft <= 0) {
            timerEl.textContent = "OTP expired";
            timerEl.style.color = "#dc3545";
            return;
        }
        
        timerEl.style.color = "";
        
        countdownInterval = setInterval(() => {
            timeLeft--;
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            timerEl.textContent = `Remaining: ${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}s`;

            if (timeLeft <= 0) {
                clearInterval(countdownInterval);
                timerEl.textContent = "OTP expired";
                timerEl.style.color = "#dc3545";
            }
        }, 1000);
    }

    function startResendCooldown(initialTimer = null) {
        isResendDisabled = true;
        
        resendTimer = initialTimer !== null ? initialTimer : 60;
        
        // Store resend cooldown start time only if starting fresh cooldown
        if (initialTimer === null || initialTimer === 60) {
            sessionStorage.setItem('resendCooldownStart', Date.now().toString());
        }
        
        // If cooldown already expired, enable button immediately
        if (resendTimer <= 0) {
            isResendDisabled = false;
            resendBtn.disabled = false;
            resendBtn.classList.remove('disabled');
            resendBtn.textContent = 'Resend Now';
            resendBtn.style.cursor = 'pointer';
            resendBtn.style.opacity = '1';
            resendBtn.style.pointerEvents = 'auto';
            sessionStorage.removeItem('resendCooldownStart');
            return;
        }
        
        resendBtn.disabled = true;
        resendBtn.classList.add('disabled');
        resendBtn.style.cursor = 'not-allowed';
        resendBtn.style.opacity = '0.6';
        resendBtn.style.pointerEvents = 'none';
        resendBtn.textContent = `Resend in ${resendTimer}s`;
        
        const resendInterval = setInterval(() => {
            resendTimer--;
            resendBtn.textContent = `Resend in ${resendTimer}s`;
            
            if (resendTimer <= 0) {
                clearInterval(resendInterval);
                isResendDisabled = false;
                resendBtn.disabled = false;
                resendBtn.classList.remove('disabled');
                resendBtn.textContent = 'Resend Now';
                resendBtn.style.cursor = 'pointer';
                resendBtn.style.opacity = '1';
                resendBtn.style.pointerEvents = 'auto';
                sessionStorage.removeItem('resendCooldownStart');
            }
        }, 1000);
    }

    // Calculate remaining resend cooldown time
    function calculateResendCooldown() {
        const cooldownStart = sessionStorage.getItem('resendCooldownStart');
        if (!cooldownStart) return 0;
        
        const elapsed = Math.floor((Date.now() - parseInt(cooldownStart)) / 1000);
        const remaining = 60 - elapsed;
        return remaining > 0 ? remaining : 0;
    }

    // Initialize timers with persistence
    const remainingOTPTime = calculateRemainingTime();
    const remainingResendTime = calculateResendCooldown();
    
    startOTPTimer(remainingOTPTime);
    
    // Only start resend cooldown if there's time remaining
    if (remainingResendTime > 0) {
        startResendCooldown(remainingResendTime);
    } else {
        // If no cooldown, enable button immediately
        startResendCooldown(0);
    }

    otpInput.focus();
    otpInput.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9]/g, "");
        
        if (this.value.length > 0) {
            const error = validateOTP(this.value);
            if (error) {
                showError(this, otpFeedback, error);
            } else {
                hideError(this, otpFeedback);
            }
        } else {
            hideError(this, otpFeedback);
        }
    });

    otpInput.addEventListener('blur', () => {
        if (otpInput.value.trim() === '') {
            hideError(otpInput, otpFeedback);
            return;
        }
        const error = validateOTP(otpInput.value);
        error ? showError(otpInput, otpFeedback, error) : hideError(otpInput, otpFeedback);
    });

    
    otpInput.addEventListener('focus', () => {
        hideError(otpInput, otpFeedback);
    });

    // Form submission with loading state
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const otpValue = otpInput.value.trim();
        
        // Only validate if there's content
        if (otpValue === '') {
            showError(otpInput, otpFeedback, 'OTP is required');
            return;
        }
        
        const error = validateOTP(otpValue);
        if (error) {
            showError(otpInput, otpFeedback, error);
            return;
        }

        // Prevent double submission
        if (verifyBtn.disabled) return;

        setButtonLoading(verifyBtn, true, 'Verifying...');

        try {
            const response = await axios.post('/verify-otp', {
                otp: otpValue
            });

            if (response.data.success) {
                clearInterval(countdownInterval);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Verified!',
                    text: response.data.message,
                    timer: 2500,
                    showConfirmButton: false,
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    willClose: () => {
                        window.location.href = response.data.data.redirect || '/';
                    }
                });
            } else {
                setButtonLoading(verifyBtn, false);
                Swal.fire({
                    icon: 'error',
                    title: 'Verification Failed',
                    text: response.data.message || 'Invalid OTP',
                    confirmButtonColor: '#dc3545'
                });
            }
        } catch (error) {
            setButtonLoading(verifyBtn, false);
            
            let errorMessage = 'Something went wrong. Please try again.';
            
            if (error.response && error.response.data) {
                errorMessage = error.response.data.message || errorMessage;
            } else if (error.request) {
                errorMessage = 'Network error. Please check your connection.';
            }
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                confirmButtonColor: '#dc3545'
            });
        }
    });

    // Resend OTP with cooldown and loading state
    resendBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        // Double check: prevent click if disabled or already in cooldown
        if (isResendDisabled || resendBtn.disabled) return;
        
        // Immediately disable to prevent spam clicks
        const originalText = resendBtn.textContent;
        setButtonLoading(resendBtn, true, 'Sending...');
        
        try {
            const response = await axios.get('/resend-otp');

            if (response.data.success) {
            
                const currentTime = Date.now();
                sessionStorage.setItem('otpSentAt', currentTime.toString());
                sessionStorage.setItem('resendCooldownStart', currentTime.toString());
                
                // Reset OTP timer
                clearInterval(countdownInterval);
                startOTPTimer(60); // Start fresh 60 second timer
                
                // Reset input and errors
                otpInput.value = '';
                hideError(otpInput, otpFeedback);
                otpInput.focus();
                
                // Re-enable verify button in case it was disabled
                if (verifyBtn.disabled && !verifyBtn.querySelector('.spinner-border')) {
                    setButtonLoading(verifyBtn, false);
                }
                
                Toastify({
                    text: response.data.message,
                    duration: 2500,
                    gravity: "top",
                    position: "center",
                    style: { background: "#28a745" }
                }).showToast();
                
                // Start resend cooldown (this will handle button state)
                setButtonLoading(resendBtn, false);
                startResendCooldown(60);
                
            } else {
                setButtonLoading(resendBtn, false);
                resendBtn.textContent = originalText;
                
                Swal.fire({
                    icon: 'error',
                    title: 'Resend Failed',
                    text: response.data.message,
                    confirmButtonColor: '#dc3545'
                });
            }
        } catch (error) {
            setButtonLoading(resendBtn, false);
            resendBtn.textContent = originalText;
            
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Failed to resend OTP. Please try again.',
                confirmButtonColor: '#dc3545'
            });
        }
    });

    // Clear any existing errors on page load
    window.addEventListener('load', () => {
        hideError(otpInput, otpFeedback);
    });
});