const form = document.getElementById('signupForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const passwordToggle = document.getElementById('passwordToggle');
const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
const referralCodeInput = document.getElementById('referralCode');
const submitBtn = form.querySelector('button[type="submit"]');

const nameFeedback = document.getElementById('nameFeedback');
const emailFeedback = document.getElementById('emailFeedback');
const phoneFeedback = document.getElementById('phoneFeedback');
const passwordFeedback = document.getElementById('passwordFeedback');
const confirmFeedback = document.getElementById('confirmFeedback');
const referralFeedback = document.getElementById('referralFeedback');


passwordToggle.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordToggle.innerHTML = `<img src="/public/images/hide.png" alt="hide password" style="width:18px;height:18px;">`;
    } else {
        passwordInput.type = 'password';
        passwordToggle.innerHTML = '👁️';
    }
});

confirmPasswordToggle.addEventListener('click', () => {
    if (confirmPasswordInput.type === 'password') {
        confirmPasswordInput.type = 'text';
        confirmPasswordToggle.innerHTML = `<img src="/public/images/hide.png" alt="hide password" style="width:18px;height:18px;">`;
    } else {
        confirmPasswordInput.type = 'password';
        confirmPasswordToggle.innerHTML = '👁️';
    }
});

// Button loading state helper
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

function validateName(name) {
    const nameRegex = /^[A-Za-z\s]{2,30}$/;
    if (!name.trim()) return 'Name is required';
    if (!nameRegex.test(name)) return 'Name must contain letters only, 2–30 chars';
    return null;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
}

function validatePhone(phone) {
    const phoneRegex = /^[6-9][0-9]{9}$/;
    if (!phone.trim()) return 'Phone number is required';
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) return 'Please enter a valid 10-digit phone number';
    return null;
}

function validatePassword(password) {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,50}$/;
    if (!password) return 'Password is required';
    if (!passwordRegex.test(password)) return 'Password must include letters and numbers only, min 6 chars';
    return null;
}

function validateConfirmPassword(confirmPassword) {
    if (!confirmPassword) return 'Please confirm your password';
    if (confirmPassword !== passwordInput.value) return 'Passwords do not match';
    return null;
}

function validateReferralCode(code){
    if(!code || !code.trim()) return null;

    const referralRegex = /^REF-[A-Z0-9]{5}$/i;

    if(!referralRegex.test(code.trim())){
        return 'Invalid format. Must be REF-XXXXX (e.g., REF-ABC12)';
    }
    return null;
}

referralCodeInput.addEventListener('input',(e)=>{
    e.target.value = e.target.value.toUpperCase();
})


// ------------------ Show / Hide Errors ------------------
function showError(input, feedback, message) {
    input.classList.add('is-invalid');
    feedback.style.display = 'block';
    feedback.textContent = message;
}

function hideError(input, feedback) {
    input.classList.remove('is-invalid');
    feedback.style.display = 'none'
    feedback.textContent = '';
}

//  Event Listeners for Inputs 
nameInput.addEventListener('blur', () => {
    const error = validateName(nameInput.value);
    error ? showError(nameInput, nameFeedback, error) : hideError(nameInput, nameFeedback);
});

emailInput.addEventListener('blur', () => {
    const error = validateEmail(emailInput.value);
    error ? showError(emailInput, emailFeedback, error) : hideError(emailInput, emailFeedback);
});

phoneInput.addEventListener('blur', () => {
    const error = validatePhone(phoneInput.value);
    error ? showError(phoneInput, phoneFeedback, error) : hideError(phoneInput, phoneFeedback);
});

passwordInput.addEventListener('blur', () => {
    const error = validatePassword(passwordInput.value);
    error ? showError(passwordInput, passwordFeedback, error) : hideError(passwordInput, passwordFeedback);

    // Revalidate confirm password if already filled
    if (confirmPasswordInput.value) {
        const confirmError = validateConfirmPassword(confirmPasswordInput.value);
        confirmError ? showError(confirmPasswordInput, confirmFeedback, confirmError) : hideError(confirmPasswordInput, confirmFeedback);
    }
});

confirmPasswordInput.addEventListener('blur', () => {
    const error = validateConfirmPassword(confirmPasswordInput.value);
    error ? showError(confirmPasswordInput, confirmFeedback, error) : hideError(confirmPasswordInput, confirmFeedback);
});

referralCodeInput.addEventListener('blur', ()=>{
    const error = validateReferralCode(referralCodeInput.value);
    error ? showError( referralCodeInput, referralFeedback, error) : hideError( referralCodeInput, referralFeedback);
});

// Remove error on focus
[nameInput, emailInput, phoneInput, passwordInput, confirmPasswordInput, referralCodeInput].forEach(input => {
    input.addEventListener('focus', () => {
        if (input.classList.contains('is-invalid')) {
            input.classList.remove('is-invalid');
            const feedbackMap = {
                name: nameFeedback,
                email: emailFeedback,
                phone: phoneFeedback,
                password: passwordFeedback,
                confirmPassword: confirmFeedback,
                referralCode: referralFeedback
            };
            feedbackMap[input.id].textContent = '';
        }
    });
});

// ------------------ Form Submission with AJAX ------------------
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    let isValid = true;

    const validations = [
        [nameInput, nameFeedback, validateName(nameInput.value)],
        [emailInput, emailFeedback, validateEmail(emailInput.value)],
        [phoneInput, phoneFeedback, validatePhone(phoneInput.value)],
        [passwordInput, passwordFeedback, validatePassword(passwordInput.value)],
        [confirmPasswordInput, confirmFeedback, validateConfirmPassword(confirmPasswordInput.value)],
        [referralCodeInput, referralFeedback, validateReferralCode(referralCodeInput.value)]
    ];

    validations.forEach(([input, feedback, error]) => {
        if (error) {
            showError(input, feedback, error);
            isValid = false;
        } else {
            hideError(input, feedback);
        }
    });

    if (!isValid) return;

    // Prevent double submission
    if (submitBtn.disabled) return;

    setButtonLoading(submitBtn, true, 'Creating Account...');

    try {
        const response = await axios.post('/signup', {
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            phone: phoneInput.value.trim(),
            password: passwordInput.value,
            confirmPassword: confirmPasswordInput.value,
            referralCode: referralCodeInput.value.trim() || undefined
        });

        if (response.data.success) {
            // Store OTP send time in sessionStorage for timer persistence
            sessionStorage.setItem('otpSentAt', Date.now().toString());
            sessionStorage.setItem('resendCooldownStart', Date.now().toString());
            
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: response.data.message,
                timer: 1500,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                willClose: () => {
                    window.location.href = response.data.data.redirect || '/verify-otp';
                }
            });
            form.reset();
        } else {
            setButtonLoading(submitBtn, false);
            Swal.fire({
                icon: 'error',
                title: 'Oops!',
                text: response.data.message,
                confirmButtonColor: '#e31414'
            });
        }
    } catch (error) {
        setButtonLoading(submitBtn, false);
        
        if (error.response && error.response.data) {
            Swal.fire({
                icon: 'error',
                title: 'Oops!',
                text: error.response.data.message || 'Something went wrong.',
                confirmButtonColor: '#e31414'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Server Error',
                text: 'Something went wrong. Please try again later.',
                confirmButtonColor: '#e31414'
            });
        }
    }
});

window.addEventListener('pageshow', function() {
    const form = document.getElementById('signupForm');
    if(form) form.reset();
});