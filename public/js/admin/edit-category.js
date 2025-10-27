document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("editCategoryForm");
    if (!form) return;

    const nameInput = document.getElementById("categoryName");
    const descriptionInput = document.getElementById("categoryDescription");

    
    function validateName(name) {
        const namePattern = /^[A-Za-z\s\-]+$/;
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

    
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const categoryId = form.getAttribute("data-id");
        const name = nameInput.value.trim();
        const description = descriptionInput.value.trim();

        
        const nameError = validateName(name);
        const descError = validateDescription(description);

        let isValid = true;

        if (nameError) { showError(nameInput, nameError); isValid = false; } else hideError(nameInput);
        if (descError) { showError(descriptionInput, descError); isValid = false; } else hideError(descriptionInput);

        if (!isValid) return;

        try {
            const response = await axios.put(`/admin/category/edit/${categoryId}`, {
                name,
                description
            });

            if (response.data.success) {
                Swal.fire({
                    icon: "success",
                    title: "Updated Successfully",
                    text: response.data.message,
                    confirmButtonColor: "#3085d6"
                }).then(() => {
                    window.location.href = "/admin/category";
                });
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Update Failed",
                    text: response.data.message,
                });
            }
        } catch (error) {
            console.error("Error updating category:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.response?.data?.message || "Something went wrong!",
            });
        }
    });

    
    [nameInput, descriptionInput].forEach(input => {
        input.addEventListener('focus', () => hideError(input));
    });
});
