const swalDefaults = Swal.mixin({
    scrollbarPadding: false,
    heightAuto: false
});

const form = document.getElementById('signinForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const passwordToggle = document.getElementById('passwordToggle');
const submitBtn = form.querySelector('button[type="submit"]');

const emailFeedback = document.getElementById('emailFeedback');
const passwordFeedback = document.getElementById('passwordFeedback');


passwordToggle.addEventListener('click', () => {
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        passwordToggle.innerHTML = `<img src="/public/images/hide.png" alt="hide password" style="width:18px;height:18px;">`;
    } else {
        passwordInput.type = 'password';
        passwordToggle.innerHTML = '👁️';
    }
});


function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return null;
}

function validatePassword(password) {
    if (!password) return 'Password is required';
    return null;
}


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

// ------------------ Event Listeners for Inputs ------------------
emailInput.addEventListener('blur', () => {
    const error = validateEmail(emailInput.value);
    error ? showError(emailInput, emailFeedback, error) : hideError(emailInput, emailFeedback);
});

passwordInput.addEventListener('blur', () => {
    const error = validatePassword(passwordInput.value);
    error ? showError(passwordInput, passwordFeedback, error) : hideError(passwordInput, passwordFeedback);
});

// Remove error on focus
[emailInput, passwordInput].forEach(input => {
    input.addEventListener('focus', () => {
        if (input.classList.contains('is-invalid')) {
            input.classList.remove('is-invalid');
            const feedbackMap = {
                email: emailFeedback,
                password: passwordFeedback,
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
        [emailInput, emailFeedback, validateEmail(emailInput.value)],
        [passwordInput, passwordFeedback, validatePassword(passwordInput.value)],
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

    // Disable button to prevent double submission (no spinner)
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.7';

    try {
        const response = await axios.post('/signin', {
            email: emailInput.value.trim(),
            password: passwordInput.value
        });

        if (response.data.success) {
            swalDefaults.fire({
                icon: 'success',
                title: 'Success!',
                text: response.data.message,
                timer: 2500,
                showConfirmButton: false,
                allowOutsideClick: false,
                allowEscapeKey: false,
                timerProgressBar: true,
                scrollbarPadding: false,
                willClose: () => {
                    window.location.href = response.data.data.redirect || '/';
                }
            });
        } else {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            
            swalDefaults.fire({
                icon: 'error',
                title: 'Oops!',
                text: response.data.message,
                confirmButtonColor: '#e31414'
            });
        }
    } catch (error) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = '1';
        
        if (error.response && error.response.data) {
            swalDefaults.fire({
                icon: 'error',
                title: 'Oops!',
                text: error.response.data.message || 'Something went wrong.',
                confirmButtonColor: '#e31414'
            });
        } else {
            swalDefaults.fire({
                icon: 'error',
                title: 'Server Error',
                text: 'Something went wrong. Please try again later.',
                confirmButtonColor: '#e31414'
            });
        }
    }
});


document.addEventListener('DOMContentLoaded', () => {

    const querySuccess = window.querySuccess;
    console.log("data from ejs", window.querySuccess);

    if(successMessage){
        swalDefaults.fire({
            icon: 'success',
            title: 'Success!',
            text: successMessage,
            showConfirmButton: true,
            confirmButtonColor: '#3085d6',
            timer: 4000
        });
    }

    if(errorMessage){
        swalDefaults.fire({
            icon: 'error',
            title: 'Oops...',
            text: errorMessage,
            confirmButtonColor: '#e31414ff',
        });
    }

    if (resetPasswordSuccess) {
        Toastify({
            text: resetPasswordSuccess,
            duration: 2000,
            gravity: "top",
            position: "right",
            close: true,
            style:{
                background: "linear-gradient(to right, #00b09b, #96c93d)",
                color: "#fff",
                borderRadius: "8px"
            },
            stopOnFocus: true,
        }).showToast();
    }

    if(querySuccess){
        Toastify({
            text: querySuccess,
            duration: 3000,
            gravity: "top",
            position: 'right',
            close:true,
            style:{
                background: "linear-gradient(to right, #00b09b, #96c93d)",
                color: "#fff",
                borderRadius: "8px"
            },
            stopOnFocus: true,
        }).showToast();
    }

    if(window.history.replaceState){
        const url = new URL(window.location);
        url.searchParams.delete('success');
        url.searchParams.delete('newEmail');
        window.history.replaceState({}, document.title, url.pathname);
    }

    if(window.history.replaceState){
        const url = new URL(window.location);
        url.searchParams.delete('success');
        url.searchParams.delete('newEmail');
        window.history.replaceState({}, document.title, url.pathname);
    }

    // Smooth scroll (optional)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener("click", function(e){
            e.preventDefault();
            const target = document.querySelector(this.getAttribute("href"));
            if(target) target.scrollIntoView({ behavior: "smooth" });
        });
    });

});

window.addEventListener('pageshow',function (){
    const form = document.getElementById('signinForm');
    if(form) form.reset();
});