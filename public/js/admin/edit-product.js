
const productForm = document.getElementById('productForm');

if (!productForm) {
    console.error('Form with id="productForm" not found!');
}



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

// Inline error display
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

// Get form elements safely
function getFormElements() {
    const form = document.getElementById('productForm');
    if (!form) {
        console.error('Form with id="productForm" not found!');
        return { nameInput: null, descInput: null, catSelect: null, highInput: null };
    }
    const nameInput = form.querySelector('input[name="name"]');
    const descInput = form.querySelector('textarea[name="description"]');
    const catSelect = form.querySelector('select[name="categoryId"]');
    const highInput = form.querySelector('input[name="highlights"]');

    return { nameInput, descInput, catSelect, highInput };
}


// Reused from add-product.js (product fields only)

function validateProductName(value) {
    const trimmed = (value || '').trim();
    const pattern = /^[A-Za-z0-9\s\-\&']+$/;
    if (!trimmed) return 'Product name is required';
    if (trimmed.length < 3) return 'Product name must be at least 3 characters';
    if (trimmed.length > 100) return 'Product name must not exceed 100 characters';
    if (!pattern.test(trimmed)) return 'Product name contains invalid characters';
    return null;
}

function validateDescription(value) {
    const trimmed = (value || '').trim();
    if (!trimmed) return 'Description is required';
    if (trimmed.length < 10) return 'Description must be at least 10 characters';
    if (trimmed.length > 2000) return 'Description must not exceed 2000 characters';
    return null;
}

function validateCategory(value) {
    if (!value) return 'Please select a category';
    return null;
}

function validateHighlights(value) {
    if (!value) return null; // optional field
    const parts = value.split(',').map(p => p.trim()).filter(Boolean);
    for (let p of parts) {
        if (p.length < 2) return 'Each highlight must be at least 2 characters';
        if (p.length > 50) return 'Each highlight must not exceed 50 characters';
    }
    return null;
}



document.addEventListener('DOMContentLoaded', function () {
    const elements = getFormElements();

    // Add focus listeners to hide errors on focus
    [elements.nameInput, elements.descInput, elements.catSelect, elements.highInput].forEach(el => {
        if (el) {
            el.addEventListener('focus', () => hideError(el));
        }
    });

    // Setup form submission
    setupFormSubmission();
});



function setupFormSubmission() {
    if (!productForm) {
        console.error('Cannot set up submission: productForm is null');
        return;
    }

    productForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Get product ID from form dataset
        const productId = productForm.dataset.productId;
        if (!productId) {
            toastError('Product ID not found!');
            return;
        }

        // Re-query elements fresh on submit
        const elements = getFormElements();
        const { nameInput, descInput, catSelect, highInput } = elements;

        // Safe value access
        const nameValue = nameInput?.value || '';
        const descValue = descInput?.value || '';
        const catValue = catSelect?.value || '';
        const highValue = highInput?.value || '';

        // --- Inline validation ---
        const nameErr = validateProductName(nameValue);
        const descErr = validateDescription(descValue);
        const catErr = validateCategory(catValue);
        const highErr = validateHighlights(highValue);

        let isValid = true;
        if (nameErr) { showError(nameInput, nameErr); isValid = false; } else hideError(nameInput);
        if (descErr) { showError(descInput, descErr); isValid = false; } else hideError(descInput);
        if (catErr) { showError(catSelect, catErr); isValid = false; } else hideError(catSelect);
        if (highErr) { showError(highInput, highErr); isValid = false; } else hideError(highInput);

        if (!isValid) return;

        // --- SweetAlert confirmation ---
        const result = await Swal.fire({
            title: 'Save Changes?',
            text: 'This will update the product details.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, save it!',
            cancelButtonText: 'Cancel',
            confirmButtonColor: '#27ae60',
            cancelButtonColor: '#e74c3c'
        });

        if (!result.isConfirmed) return;

        // Disable submit button
        const submitBtn = productForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.classList.add('loading');
        }

        // --- Axios PUT request ---
        try {
            const response = await axios.put(`/admin/products/edit/${productId}`, {
                name: nameValue.trim(),
                description: descValue.trim(),
                categoryId: catValue,
                highlights: highValue.trim()
            });

            if (response.data.success) {
                Swal.fire({
                    icon: "success",
                    title: "Updated Successfully",
                    text: "Product updated successfully!",
                    timer: 2500, 
                    timerProgressBar: true, //  fading progress line
                    showConfirmButton: false, 
                    willClose: () => {
                        
                        window.location.href = "/admin/products";
                    },
                });
            } else {
                toastError(response.data.message || "Failed to update product");
            }
        } catch (error) {
            console.error('Product update error:', error);
            const errMsg = error.response?.data?.message || error.message || 'Something went wrong while updating product.';
            toastError(errMsg);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.classList.remove('loading');
            }
        }
    });
}