

const form = document.getElementById('addCategoryForm');
const nameInput = document.getElementById('categoryName');
const descriptionInput = document.getElementById('categoryDescription');

function validateName(name) {
    const namePattern = /^[A-Za-z\s\-]+$/
    if (!name.trim()) return 'Category name is required';
    if (name.trim().length < 3) return 'Category name must be at least 3 characters';
    if (!namePattern.test(name.trim())) return 'Category name can only contain letters, spaces, and hyphens';
    return null;
}

function validateDescription(description) {
    if (!description.trim()) return 'Description is required';
    if (description.trim().length < 10) return 'Description must be at least 10 characters';
    return null;
}

function showError(input, message) {
    input.classList.add('is-invalid');
    if (!input.nextElementSibling || !input.nextElementSibling.classList.contains('invalid-feedback')) {
        const feedback = document.createElement('div');
        feedback.classList.add('invalid-feedback');
        feedback.textContent = message;
        input.parentNode.appendChild(feedback);
    } else {
        input.nextElementSibling.textContent = message;
    }
}

function hideError(input) {
    input.classList.remove('is-invalid');
    if (input.nextElementSibling && input.nextElementSibling.classList.contains('invalid-feedback')) {
        input.nextElementSibling.textContent = '';
    }
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameError = validateName(nameInput.value);
    const descError = validateDescription(descriptionInput.value);

    let isValid = true;

    if (nameError) {
        showError(nameInput, nameError);
        isValid = false;
    } else hideError(nameInput);

    if (descError) {
        showError(descriptionInput, descError);
        isValid = false;
    } else hideError(descriptionInput);

    if (!isValid) return;

    try {
        const response = await axios.post('/admin/category/add', {
            name: nameInput.value.trim(),
            description: descriptionInput.value.trim()
        });


        if (response.data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: response.data.message,
                timer: 1500,
                showConfirmButton: false,
                willClose: () => {
                    window.location.href = '/admin/category';
                }
            });
            form.reset();
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Oops!',
                text: response.data.message,
                confirmButtonColor: '#e31414'
            });
        }
    } catch (error) {
       
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


[nameInput, descriptionInput].forEach(input => {
    input.addEventListener('focus', () => {
        hideError(input);
    });
});


// if you want to remove the data when coming back to this use the window.persit function used in the user signin and signup