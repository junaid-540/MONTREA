document.addEventListener("DOMContentLoaded", function () {
    const successMessage = document.querySelector('#successMsg')?.textContent.trim() || '';
    const errorMessage = document.querySelector('#errorMsg')?.textContent.trim() || '';

    if (successMessage) {
        Toastify({
            text: successMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            stopOnFocus: true,
        }).showToast();
    }

    if (errorMessage) {
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            stopOnFocus: true,
        }).showToast();
    }

    const editProfileForm   = document.getElementById('editProfileForm');
    const nameInput         = document.getElementById('name');
    const emailInput        = document.getElementById('email');
    const phoneInput        = document.getElementById('phone');
    const profileImageInput = document.getElementById('profileImageInput');
    const profileImagePreview = document.getElementById('profileImagePreview');
    const saveBtn           = document.getElementById('saveBtn');

    const nameError  = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    const phoneError = document.getElementById('phoneError');

    const cropperModal = document.getElementById('cropperModal');
    const imageToCrop = document.getElementById('imageToCrop');
    const cropButton = document.getElementById('cropButton');
    const cancelCropButton = document.getElementById('cancelCropButton');
    
    let cropper = null;
    let croppedBlob = null;

    profileImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        const fileName = file.name;
        const extension = fileName.split('.').pop().toLowerCase();
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

        if (!allowedExtensions.includes(extension)) {
            Toastify({
                text: 'Please select a valid image file (jpg, jpeg, png, webp)',
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
            profileImageInput.value = '';
            return;
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
            Toastify({
                text: 'Image size should not exceed 5MB',
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
            profileImageInput.value = '';
            return;
        }

        // Read and display image in cropper
        const reader = new FileReader();
        reader.onload = (e) => {
            imageToCrop.src = e.target.result;
            cropperModal.classList.add('show');
            
            if (cropper) cropper.destroy();
            
            cropper = new Cropper(imageToCrop, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: true,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
                background: false,
                responsive: true,
                checkOrientation: true,
                modal: true,
                scalable: true,
                zoomable: true,
                zoomOnWheel: true,
                wheelZoomRatio: 0.1
            });
        };
        reader.readAsDataURL(file);
    });

    // Crop and update preview
    cropButton.addEventListener('click', () => {
        if (!cropper) return;

        cropButton.disabled = true;
        cropButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cropping...';

        cropper.getCroppedCanvas({
            width: 600,
            height: 600,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high'
        }).toBlob((blob) => {
            if (!blob) {
                Toastify({
                    text: 'Failed to crop image. Please try again.',
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
                }).showToast();
                cropButton.disabled = false;
                cropButton.innerHTML = '<i class="fas fa-check"></i> Apply Crop';
                return;
            }

            croppedBlob = blob;
            profileImagePreview.src = URL.createObjectURL(blob);
            
            Toastify({
                text: 'Image cropped successfully!',
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            }).showToast();

            cropperModal.classList.remove('show');
            cropper.destroy();
            cropper = null;
            cropButton.disabled = false;
            cropButton.innerHTML = '<i class="fas fa-check"></i> Apply Crop';
        }, 'image/jpeg', 0.95);
    });

    // Cancel cropping
    cancelCropButton.addEventListener('click', () => {
        cropperModal.classList.remove('show');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        profileImageInput.value = '';
        croppedBlob = null;
    });

    // ========== VALIDATION FUNCTIONS ==========
    function validateName(name) {
        const nameRegex = /^[A-Za-z\s]{2,30}$/;
        if (!name.trim()) return 'Name is required';
        if (name.trim().length < 2) return 'Name must be at least 2 characters long';
        if (name.trim().length > 30) return 'Name must not exceed 30 characters';
        if (!nameRegex.test(name.trim())) return 'Name should contain only letters and spaces';
        return null;
    }

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) return 'Email is required';
        if (!emailRegex.test(email.trim())) return 'Please enter a valid email address';
        return null;
    }

    function validatePhone(phone) {
        if (!phone || phone.trim().length === 0) return 'Phone is required';
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone.trim())) return 'Phone number must be exactly 10 digits';
        const firstDigit = phone.trim()[0];
        if (!['6', '7', '8', '9'].includes(firstDigit)) {
            return 'Phone number must start with 6, 7, 8, or 9';
        }
        return null;
    }

    function showError(input, feedback, message) {
        input.classList.add('is-invalid');
        if (feedback) {
            feedback.style.display = 'block';
            feedback.textContent = message;
        }
    }

    function hideError(input, feedback) {
        input.classList.remove('is-invalid');
        if (feedback) {
            feedback.style.display = 'none';
            feedback.textContent = '';
        }
    }


    [nameInput, emailInput, phoneInput].forEach(input => {
        const errorElement = document.getElementById(input.id + 'Error');

        input.addEventListener('input', function () {
            const validator = input.id === 'name' ? validateName :
                             input.id === 'email' ? validateEmail : validatePhone;
            const error = validator(this.value);
            if (!this.value) hideError(this, errorElement);
            else if (error) showError(this, errorElement, error);
            else hideError(this, errorElement);
        });

        input.addEventListener('blur', function () {
            const validator = input.id === 'name' ? validateName :
                             input.id === 'email' ? validateEmail : validatePhone;
            const error = validator(this.value);
            error ? showError(this, errorElement, error) : hideError(this, errorElement);
        });

        input.addEventListener('focus', function () {
            if (this.classList.contains('is-invalid')) {
                hideError(this, errorElement);
            }
        });
    });

    phoneInput.addEventListener('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');
    });


    editProfileForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        let isValid = true;
        const validations = [
            [nameInput, nameError, validateName(nameInput.value)],
            [emailInput, emailError, validateEmail(emailInput.value)],
            [phoneInput, phoneError, validatePhone(phoneInput.value)]
        ];

        validations.forEach(([input, feedback, error]) => {
            if (error) {
                showError(input, feedback, error);
                isValid = false;
            } else {
                hideError(input, feedback);
            }
        });

        if (!isValid) {
            Toastify({
                text: "Some fields are invalid. Please review and try again.",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
            return;
        }

        const formData = new FormData();
        formData.append('name', nameInput.value.trim());
        formData.append('email', emailInput.value.trim());
        formData.append('phone', phoneInput.value.trim());

        if (croppedBlob) {
            formData.append('profileImage', croppedBlob, 'profile.jpg');
        }

        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        try {
            const response = await axios.post('/edit-profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

             console.log('✅ Full Response:', response); 
             console.log('✅ Response Data:', response.data); 
             console.log('✅ otpSent:', response.data.otpSent); 


            if (response.data.success) {
                if (response.data.data?.otpSent) {
                    console.log('🔄 Should redirect to verify-email-change')
                    Toastify({
                        text: response.data.message || 'OTP sent to your new email. Please verify to complete the update.',
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
                    }).showToast();
                    setTimeout(() => window.location.href = '/verify-email-change', 1500);
                } else {
                    console.log('🔄 Should redirect to profile')
                    Toastify({
                        text: response.data.message || 'Profile updated successfully!',
                        duration: 3000,
                        gravity: "top",
                        position: "right",
                        backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
                    }).showToast();
                    setTimeout(() => window.location.href = '/profile', 1500);
                }
            }
        } catch (error) {
            console.error('Error:', error);
            console.error('❌ Error Response:', error.response);
            let msg = 'An error occurred. Please try again.';
            if (error.response?.data?.message) msg = error.response.data.message;

            Toastify({
                text: msg,
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();

            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        } finally {
            
            if (saveBtn.disabled) {
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
            }
        }
    });

    document.querySelectorAll('a[href="/logout"]').forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            Swal.fire({
                title: "Are you sure?",
                text: "Do you want to log out?",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Yes, log out!',
                cancelButtonText: 'Cancel',
                scrollbarPadding: false,
                heightAuto: false
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/logout';
                }
            });
        });
    });
});