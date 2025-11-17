document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('filterForm');
  const clearBtn = document.getElementById('clearAll');
  const sortSelect = document.getElementById('sortBy');

  // Prevent dropdown close on filter clicks (UX: Keep open for multi-toggle)
  document.addEventListener('click', function(e) {
    if (e.target.closest('.filter-dropdown .dropdown-item label')) {
      e.stopPropagation();  // Stops Bootstrap from closing dropdown
    }
  });

  // Function to build and submit query params
  function updateFilters() {
    const formData = new FormData(form);
    const params = new URLSearchParams();

    // Collect multi-selects (size, color, category as comma-separated)
    ['size', 'color', 'category'].forEach(field => {
      const values = [];
      form.querySelectorAll(`input[name="${field}"]:checked`).forEach(cb => values.push(cb.value));
      if (values.length > 0) {
        params.set(field, values.join(','));
      }
    });

    // Single selects
    const priceRange = formData.get('priceRange');
    if (priceRange) params.set('priceRange', priceRange);

    const sortValue = formData.get('sort');
    if (sortValue) {
      params.set('sort', sortValue);
    }

    // Preserve page
    const page = formData.get('page');
    if (page) params.set('page', page);

    // Submit GET (merge with existing params like search)
    const currentParams = new URLSearchParams(window.location.search);
    params.forEach((value, key) => {
      if (key === 'sort' && !value) {
        currentParams.delete(key);  // Remove empty sort
      } else {
        currentParams.set(key, value);
      }
    });
    const newSearch = currentParams.toString();
    window.location.search = newSearch ? `?${newSearch}` : '/shop';

    // Debug: Log current checked (see if uncheck registered)
    console.log('Checked after toggle:', {
      category: Array.from(form.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value),
      urlCategory: params.get('category')
    });
  }

  // Event listeners
  form.addEventListener('change', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
      // Longer delay for uncheck to settle
      setTimeout(updateFilters, 100);
    }
  });

  // Clear All
  clearBtn.addEventListener('click', function() {
    form.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(el => el.checked = false);
    sortSelect.value = '';
    window.location.href = '/shop';
  });
});