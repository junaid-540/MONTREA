const variantForm = document.getElementById('editVariantForm');
const variantImagesContainer = document.getElementById('variantImagesContainer');
const cropModal = document.getElementById('cropModal');
const cropImage = document.getElementById('cropImage');
let currentCropper = null;
let currentUploadArea = null;
// Track existing images vs new uploads
// Structure: { index: { type: 'existing'|'new'|'empty', isDeleted: boolean } }
const imageStates = {};

// Toast notifications
function toastSuccess(msg, duration = 2500) {
    Toastify({
        text: msg,
        duration,
        gravity: "top",
        position: "right",
        style: { background: "#27ae60" }
    }).showToast();
}
function toastError(msg, duration = 3500) {
    Toastify({
        text: msg,
        duration,
        gravity: "top",
        position: "right",
        style: { background: "#e74c3c" }
    }).showToast();
}
function toastInfo(msg, duration = 2500) {
    Toastify({
        text: msg,
        duration,
        gravity: "top",
        position: "right",
        style: { background: "#34495e" }
    }).showToast();
}
// Inline error handling
function showError(input, message) {
    if (!input) return;
    input.classList.add('is-invalid');
    let feedback = input.nextElementSibling;
    if (!feedback || !feedback.classList.contains('invalid-feedback')) {
        feedback = document.createElement('div');
        feedback.classList.add('invalid-feedback');
        input.parentNode.appendChild(feedback);
    }
    feedback.textContent = message;
}
function hideError(input) {
    if (!input) return;
    input.classList.remove('is-invalid');
    const feedback = input.nextElementSibling;
    if (feedback && feedback.classList.contains('invalid-feedback')) {
        feedback.textContent = '';
    }
}
// Validation functions
function validateColor(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return 'Color is required';
    if (trimmed.length < 3) return 'Color must be at least 3 characters';
    if (trimmed.length > 20) return 'Color must not exceed 20 characters';
    if (!/^[A-Za-z\s\-]+$/.test(trimmed)) return 'Color contains invalid characters';
    return null;
}
function validateSize(value) {
    if (!value) return 'Size is required';
    return null;
}
function validatePrice(value) {
    if (value === '' || value === null) return 'Price is required';
    const n = Number(value);
    if (Number.isNaN(n) || n <= 0) return 'Price must be greater than 0';
    if (n > 999999) return 'Price seems too large';
    return null;
}
function validateDiscountedPrice(priceVal, discountedVal) {
    if (discountedVal === '' || discountedVal === null) return null; // optional
    const p = Number(priceVal);
    const d = Number(discountedVal);
    if (Number.isNaN(d) || d < 0) return 'Discount price must be 0 or more';
    if (!Number.isNaN(p) && d >= p) return 'Discount price must be less than regular price';
    return null;
}
function validateStock(value) {
    if (value === '' || value === null) return 'Stock is required';
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0) return 'Stock must be 0 or more';
    if (n > 99999) return 'Stock seems too large';
    return null;
}
// Initialize image states from existing data
function initializeImageStates() {
    const uploadAreas = variantImagesContainer.querySelectorAll('.image-upload');

    uploadAreas.forEach((area, index) => {
        const previewImg = area.querySelector('.image-preview');
        const previewContainer = area.querySelector('.image-preview-container');
        const existingInput = area.querySelector('.existing-image-data');

        // Check if image exists and is not placeholder
        const hasExistingImage = previewImg &&
            previewImg.src &&
            previewImg.src.startsWith('http') && // for URL
            !previewImg.src.includes('placeholder') &&
            !previewImg.src.includes('data:image/svg');
        
        console.log(`Slot ${index} init →`, hasExistingImage ? 'EXISTING' : 'EMPTY', previewImg?.src);

        if (hasExistingImage && !previewContainer.classList.contains('hidden')) {
            imageStates[index] = {
                type: 'existing',
                isDeleted: false
            };
            // Ensure existing input has the URL
            if (existingInput) existingInput.value = previewImg.src;

            // Hide upload icon/text/button for existing images
            const uploadIcon = area.querySelector('.upload-icon');
            const uploadText = area.querySelector('.upload-text');
            const uploadBtn = area.querySelector('.upload-btn');

            if (uploadIcon) uploadIcon.classList.add('hidden');
            if (uploadText) uploadText.classList.add('hidden');
            if (uploadBtn) {
                uploadBtn.classList.remove('hidden');
                uploadBtn.textContent = 'CHANGE IMAGE';
            }
        } else {
            // No existing image
            imageStates[index] = {
                type: 'empty',
                isDeleted: false
            };
            // Ensure empty
            if (existingInput) existingInput.value = '';
        }
    });

    console.log('Initialized image states:', imageStates);
}
// Fix placeholder images
function fixPlaceholderImages() {
    const placeholderImages = document.querySelectorAll('img[src="/placeholder.svg"]');
    const fallbackSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgc3R5bGU9ImZpbGw6I2NjYyIgLz48L3N2Zz4=';
    placeholderImages.forEach(img => {
        img.src = fallbackSrc;
        img.alt = 'No image selected';
    });
}
// File input handling with FLEXIBLE CROPPER
function setupFileInputs() {
    document.addEventListener('change', function (e) {
        if (e.target.matches('input[type="file"]')) {
            const input = e.target;
            if (input.files && input.files[0]) {
                const file = input.files[0];
                if (!file.type.match('image.*')) {
                    toastError('Please select an image file.');
                    input.value = '';
                    return;
                }

                const reader = new FileReader();
                reader.onload = function (ev) {
                    currentUploadArea = input.closest('.image-upload');
                    const cropImg = document.getElementById('cropImage');
                    if (cropImg) cropImg.src = ev.target.result;

                    // Show crop modal
                    if (cropModal) cropModal.style.display = 'block';

                    setTimeout(() => {
                        if (currentCropper) {
                            currentCropper.destroy();
                            currentCropper = null;
                        }
                        if (cropImg) {
                            // FLEXIBLE ASPECT RATIO - allows any width/height
                            currentCropper = new Cropper(cropImg, {
                                aspectRatio: NaN, // Free aspect ratio
                                viewMode: 1,
                                guides: true,
                                background: false,
                                autoCropArea: 0.9,
                                minCropBoxWidth: 200,
                                minCropBoxHeight: 200
                            });
                        }
                    }, 100);
                };
                reader.readAsDataURL(file);
            }
        }
    });
}

// Delete image buttons
function setupDeleteButtons() {
    document.addEventListener('click', function (e) {
        if (e.target.closest('.delete-image-btn')) {
            const deleteBtn = e.target.closest('.delete-image-btn');
            const uploadArea = deleteBtn.closest('.image-upload');
            const imageIndex = parseInt(uploadArea.dataset.image);
            const fileInput = uploadArea.querySelector('input[type="file"]');
            const existingInput = uploadArea.querySelector('.existing-image-data');
            const previewContainer = uploadArea.querySelector('.image-preview-container');
            const uploadIcon = uploadArea.querySelector('.upload-icon');
            const uploadText = uploadArea.querySelector('.upload-text');
            const uploadBtn = uploadArea.querySelector('.upload-btn');

            // Mark as deleted in state
            if (imageStates[imageIndex]) {
                imageStates[imageIndex].isDeleted = true;
                imageStates[imageIndex].type = 'empty';
            }

            if (fileInput) fileInput.value = '';
            if (existingInput) existingInput.value = '';
            if (previewContainer) previewContainer.classList.add('hidden');
            if (uploadIcon) uploadIcon.classList.remove('hidden');
            if (uploadText) uploadText.classList.remove('hidden');
            if (uploadBtn) {
                uploadBtn.classList.remove('hidden');
                uploadBtn.textContent = 'BROWSE IMAGE';
            }

            toastInfo('Image removed');
        }
    });
}

// Drag and drop
function setupDragAndDrop() {
    document.addEventListener('dragover', function (e) {
        if (e.target.closest('.image-upload')) {
            e.preventDefault();
            e.target.closest('.image-upload').classList.add('dragover');
        }
    });

    document.addEventListener('dragleave', function (e) {
        if (e.target.closest('.image-upload')) {
            e.target.closest('.image-upload').classList.remove('dragover');
        }
    });

    document.addEventListener('drop', function (e) {
        const uploadArea = e.target.closest('.image-upload');
        if (uploadArea) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;

            if (files.length > 0 && files[0].type.startsWith('image/')) {
                const fileInput = uploadArea.querySelector('input[type="file"]');
                if (fileInput) {
                    const dt = new DataTransfer();
                    dt.items.add(files[0]);
                    fileInput.files = dt.files;
                    const event = new Event('change');
                    fileInput.dispatchEvent(event);
                }
            } else {
                toastError('Please drop an image file.');
            }
        }
    });
}

// UPDATED Crop modal with flexible canvas sizing
function setupCropModal() {
    const closeBtnCrop = document.querySelector('#cropModal .close');
    const cancelBtn = document.getElementById('cancelCrop');
    const applyBtn = document.getElementById('applyCrop');

    const closeModal = () => {
        if (cropModal) cropModal.style.display = 'none';
        if (currentCropper) {
            currentCropper.destroy();
            currentCropper = null;
        }
        currentUploadArea = null;
    };

    const cancelCrop = () => {
        // Clear the temporary file on cancel
        if (currentUploadArea) {
            const fileInput = currentUploadArea.querySelector('input[type="file"]');
            if (fileInput) fileInput.value = '';
        }
        closeModal();
    };

    if (closeBtnCrop) closeBtnCrop.onclick = cancelCrop;
    if (cancelBtn) cancelBtn.onclick = cancelCrop;

    if (applyBtn) {
        applyBtn.onclick = () => {
            console.log('ImageStates after cropping:', imageStates);
            if (currentCropper && currentUploadArea) {
                // Get the cropped area dimensions
                const cropData = currentCropper.getData();
                
                // Calculate canvas size while maintaining aspect ratio
                // Max dimensions: 1200x1600
                const maxWidth = 1200;
                const maxHeight = 1600;
                
                let canvasWidth = Math.round(cropData.width);
                let canvasHeight = Math.round(cropData.height);
                
                // Scale down proportionally if needed
                if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
                    const ratio = Math.min(maxWidth / canvasWidth, maxHeight / canvasHeight);
                    canvasWidth = Math.round(canvasWidth * ratio);
                    canvasHeight = Math.round(canvasHeight * ratio);
                }
                
                const canvas = currentCropper.getCroppedCanvas({
                    width: canvasWidth,
                    height: canvasHeight,
                    fillColor: '#fff',
                    imageSmoothingEnabled: true,
                    imageSmoothingQuality: 'high'
                });

                // Convert to blob asynchronously
                canvas.toBlob((blob) => {
                    if (!blob) {
                        toastError('Failed to process the cropped image.');
                        return;
                    }

                    const imageIndex = parseInt(currentUploadArea.dataset.image);
                    const fileName = `variant-image-${imageIndex}-${Date.now()}.jpg`;
                    const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });

                    // Get existing elements
                    const fileInput = currentUploadArea.querySelector('input[type="file"]');
                    const existingInput = currentUploadArea.querySelector('.existing-image-data');
                    const previewImg = currentUploadArea.querySelector('.image-preview');
                    const previewContainer = currentUploadArea.querySelector('.image-preview-container');
                    const uploadIcon = currentUploadArea.querySelector('.upload-icon');
                    const uploadText = currentUploadArea.querySelector('.upload-text');
                    const uploadBtn = currentUploadArea.querySelector('.upload-btn');

                    // Set file input
                    if (fileInput) {
                        const dt = new DataTransfer();
                        dt.items.add(croppedFile);
                        fileInput.files = dt.files;
                    }

                    // Update preview
                    if (previewImg) {
                        previewImg.src = URL.createObjectURL(blob);
                    }

                    // Clear existing image flag (signals replacement)
                    if (existingInput) {
                        existingInput.value = '';
                    }

                    // Update state
                    imageStates[imageIndex] = {
                        type: 'new',
                        isDeleted: false
                    };

                    // Show/hide elements
                    if (previewContainer) previewContainer.classList.remove('hidden');
                    if (uploadIcon) uploadIcon.classList.add('hidden');
                    if (uploadText) uploadText.classList.add('hidden');
                    if (uploadBtn) {
                        uploadBtn.classList.remove('hidden');
                        uploadBtn.textContent = 'CHANGE IMAGE';
                    }

                    closeModal();
                    toastSuccess('Image cropped successfully');
                }, 'image/jpeg', 0.9);
            }
        };
    }

    if (cropModal) {
        cropModal.onclick = function (event) {
            if (event.target === cropModal) {
                cancelCrop(); // Treat modal click as cancel
            }
        };
    }
}

// Form submission with Axios
function setupFormSubmission() {
    if (!variantForm) {
        console.error('Form with id="editVariantForm" not found!');
        return;
    }

    variantForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get form inputs for non-image validation
        const colorInput = variantForm.querySelector('input[name="color"]');
        const sizeSelect = variantForm.querySelector('select[name="size"]');
        const priceInput = variantForm.querySelector('input[name="price"]');
        const discountedPriceInput = variantForm.querySelector('input[name="discountedPrice"]');
        const stockInput = variantForm.querySelector('input[name="stock"]');
        const variantIdInput = variantForm.querySelector('input[name="variantId"]');
        const productIdInput = variantForm.querySelector('input[name="productId"]');

        const color = colorInput?.value?.trim() || '';
        const size = sizeSelect?.value || '';
        const price = priceInput?.value || '';
        const discountedPrice = discountedPriceInput?.value?.trim() || '';
        const stock = stockInput?.value || '';
        const variantId = variantIdInput?.value || '';
        const productId = productIdInput?.value || '';

        // Validate all fields
        let isValid = true;

        const colorErr = validateColor(color);
        if (colorErr) { showError(colorInput, colorErr); isValid = false; } else hideError(colorInput);

        const sizeErr = validateSize(size);
        if (sizeErr) { showError(sizeSelect, sizeErr); isValid = false; } else hideError(sizeSelect);

        const priceErr = validatePrice(price);
        if (priceErr) { showError(priceInput, priceErr); isValid = false; } else hideError(priceInput);

        const discountedErr = validateDiscountedPrice(price, discountedPrice);
        if (discountedErr) { showError(discountedPriceInput, discountedErr); isValid = false; } else hideError(discountedPriceInput);

        const stockErr = validateStock(stock);
        if (stockErr) { showError(stockInput, stockErr); isValid = false; } else hideError(stockInput);

        // Validate images - must have exactly 3 valid images
        const validImageCount = Object.values(imageStates).filter(
            state => !state.isDeleted && (state.type === 'existing' || state.type === 'new')
        ).length;

        if (validImageCount !== 3) {
            toastError('Exactly 3 images are required for this variant.');
            isValid = false;
        }

        if (!isValid) return;

        console.log("=== FRONTEND DEBUG ===");
        console.log("Image states:", imageStates);

        // Show confirmation dialog
        const result = await Swal.fire({
            title: 'Update Variant?',
            text: `Update ${color} - ${size} variant?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Update It',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#27ae60',
            cancelButtonColor: '#95a5a6'
        });

        if (!result.isConfirmed) return;

        // Use native FormData - includes all fields, files for new images, and existing flags
        const formData = new FormData(variantForm);

        // Debug: Log FormData contents
        console.log("=== FormData Contents ===");
        for (let [key, value] of formData.entries()) {
            if (value instanceof File || value instanceof Blob) {
                console.log(`${key}: [File/Blob ${value.size} bytes]`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }

        // Verify we're sending the right data
        const totalImages = validImageCount;
        if (totalImages !== 3) {
            console.error('❌ Image count mismatch:', totalImages);
            toastError('Internal error: Image count mismatch. Please refresh and try again.');
            return;
        }

        // Disable submit button
        const submitBtn = variantForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';
        }

        try {
            const response = await axios.put(
                `/admin/products/variants/edit/${variantId}`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    timeout: 30000,
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        console.log('Upload progress:', percentCompleted + '%');
                        if (submitBtn && percentCompleted < 100) {
                            submitBtn.textContent = `Updating... ${percentCompleted}%`;
                        }
                    }
                }
            );

            await Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: response.data.message || 'Variant updated successfully',
                confirmButtonColor: '#27ae60',
                timer: 2000
            });

            window.location.href = `/admin/products/${productId}/variants`;

        } catch (error) {
            console.error('Variant update error:', error);

            let errorMessage = 'Server error occurred';

            if (error.response) {
                errorMessage = error.response.data?.message || `Error: ${error.response.status}`;
                console.error('Server error:', error.response.data);
            } else if (error.request) {
                errorMessage = 'No response from server. Please check your connection.';
            } else {
                errorMessage = error.message;
            }

            Swal.fire({
                icon: 'error',
                title: 'Oops!',
                text: errorMessage,
                confirmButtonColor: '#e74c3c'
            });
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Update Variant';
            }
        }
    });
}
// Add focus listeners to hide errors on input
function setupFocusListeners() {
    const inputs = [
        variantForm?.querySelector('input[name="color"]'),
        variantForm?.querySelector('select[name="size"]'),
        variantForm?.querySelector('input[name="price"]'),
        variantForm?.querySelector('input[name="discountedPrice"]'),
        variantForm?.querySelector('input[name="stock"]')
    ];

    inputs.forEach(input => {
        if (input) {
            input.addEventListener('focus', () => hideError(input));
        }
    });
}
// Initialize everything
document.addEventListener('DOMContentLoaded', function () {
    initializeImageStates();
    fixPlaceholderImages();
    setupFileInputs();
    setupDeleteButtons();
    setupDragAndDrop();
    setupCropModal();
    setupFormSubmission();
    setupFocusListeners();
});