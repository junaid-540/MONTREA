function UpdateWishlistBadge(count) {
  const wishlistLink = document.querySelector('a[href="/wishlist"]');
  if (!wishlistLink) return;

  let badge = wishlistLink.querySelector('.wishlist-badge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'wishlist-badge';
      wishlistLink.appendChild(badge);
    }
    badge.textContent = count;
  } else {
    if (badge) {
      badge.remove();
    }
  }
}

async function checkIfVariantInWishlist(variantId) {
  try {
    const response = await fetch(`/wishlist/check/${variantId}`);
    const data = await response.json();
    if (data.success && data.data) {
      return data.data.inWishlist;
    }
    return false;
  } catch (error) {
    console.error('Error checking wishlist:', error);
    return false;
  }
}

async function initializeWishlistIcons() {
  const wishlistIcons = document.querySelectorAll('.wishlist-icon');

  for (const icon of wishlistIcons) {
    const productCard = icon.closest('.product-card');
    if (!productCard) continue;

    const productLink = productCard.querySelector('.product-link');
    if (!productLink) continue;


    const productId = productLink.getAttribute('href').split('/').pop();


    const variantId = productCard.dataset.firstVariantId;

    if (variantId) {
      const inWishlist = await checkIfVariantInWishlist(variantId);
      if (inWishlist) {
        icon.classList.add('in-wishlist');
        icon.querySelector('i').classList.remove('far');
        icon.querySelector('i').classList.add('fas');
      }
    }
  }
}

// Handle wishlist icon click
async function handleWishlistClick(event, icon) {
  event.preventDefault();
  event.stopPropagation();

  const productCard = icon.closest('.product-card');
  if (!productCard) return;

  const productLink = productCard.querySelector('.product-link');
  if (!productLink) return;

  const productId = productLink.getAttribute('href').split('/').pop();
  const variantId = productCard.dataset.firstVariantId;

  if (!variantId) {
    Toastify({
      text: "Product variant not found",
      duration: 3000,
      gravity: "top",
      position: "right",
      style: {
        background: "#dc3545",
      }
    }).showToast();
    return;
  }


  if (icon.classList.contains('in-wishlist')) {
    Toastify({
      text: "This item is already in your wishlist",
      duration: 2000,
      gravity: "top",
      position: "right",
      style: {
        background: "linear-gradient(to right, #f59e0b, #d97706)",
      }
    }).showToast();
    return;
  }

  // Disable icon temporarily
  icon.style.pointerEvents = 'none';
  icon.style.opacity = '0.6';

  try {
    const response = await fetch('/wishlist/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: productId,
        productVariantId: variantId
      })
    });

    const raw = await response.text();
    const contentType = response.headers.get('content-type') || '';
    let data = null;

    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(raw);
      } catch (err) {
        console.error('Invalid JSON from /wishlist/add:', raw);
      }
    }

    if (response.ok && data && data.success) {
      // Update badge
      UpdateWishlistBadge(data.data.wishlistItemsCount);

      // Animate icon
      icon.classList.add('in-wishlist');
      const heartIcon = icon.querySelector('i');
      heartIcon.classList.remove('far');
      heartIcon.classList.add('fas');

      // Add animation class
      icon.classList.add('wishlist-added-animation');
      setTimeout(() => {
        icon.classList.remove('wishlist-added-animation');
      }, 600);

      Toastify({
        text: "Added to wishlist! ❤️",
        duration: 2000,
        gravity: "top",
        position: "right",
        style: {
          background: "linear-gradient(to right, #f59e0b, #d97706)",
        }
      }).showToast();

    } else {
      // Handle errors
      icon.style.pointerEvents = 'auto';
      icon.style.opacity = '1';

      if (data && (data.statusCode === 401 || data.statusCode === 403) && data.redirectTo) {
        Swal.fire({
          icon: 'warning',
          title: 'Login Required',
          text: data.message || 'Please sign in to add items to your wishlist.',
          showCancelButton: true,
          confirmButtonColor: '#f59e0b',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Go to Login',
          cancelButtonText: 'Cancel',
          scrollbarPadding: false,
          heightAuto: false
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = data.redirectTo;
          }
        });
        return;
      }

      if (raw && raw.trim().startsWith('<')) {
        Swal.fire({
          icon: 'warning',
          title: 'Login Required',
          text: 'Please sign in to add items to your wishlist.',
          showCancelButton: true,
          confirmButtonColor: '#f59e0b',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Go to Login',
          cancelButtonText: 'Cancel',
          scrollbarPadding: false,
          heightAuto: false
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = '/signin';
          }
        });
        return;
      }

      const errMsg = (data && data.message) ? data.message : 'Failed to add to wishlist';
      Toastify({
        text: errMsg,
        duration: 3000,
        gravity: "top",
        position: "right",
        style: { background: "#dc3545" }
      }).showToast();
    }

  } catch (error) {
    icon.style.pointerEvents = 'auto';
    icon.style.opacity = '1';
    console.error('Error adding to wishlist:', error);
    Toastify({
      text: 'Something went wrong. Please try again.',
      duration: 3000,
      gravity: "top",
      position: "right",
      style: { background: "#dc3545" }
    }).showToast();
  } finally {
    // Re-enable icon
    icon.style.pointerEvents = 'auto';
    icon.style.opacity = '1';
  }
}

document.addEventListener('DOMContentLoaded', function () {

  initializeWishlistIcons();


  const wishlistIcons = document.querySelectorAll('.wishlist-icon');
  wishlistIcons.forEach(icon => {
    icon.addEventListener('click', (event) => handleWishlistClick(event, icon));
  });


  const form = document.getElementById('filterForm');
  const clearBtn = document.getElementById('clearAll');
  const sortSelect = document.getElementById('sortBy');

  // Prevent dropdown close on filter clicks
  document.addEventListener('click', function (e) {
    if (e.target.closest('.filter-dropdown .dropdown-item label')) {
      e.stopPropagation();
    }
  });

  // Function to build and submit query params
  function updateFilters() {
    const formData = new FormData(form);
    const params = new URLSearchParams();

    // Collect multi-selects
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

    // Submit GET
    const currentParams = new URLSearchParams(window.location.search);
    params.forEach((value, key) => {
      if (key === 'sort' && !value) {
        currentParams.delete(key);
      } else {
        currentParams.set(key, value);
      }
    });
    const newSearch = currentParams.toString();
    window.location.search = newSearch ? `?${newSearch}` : '/shop';
  }

  // Event listeners
  form.addEventListener('change', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
      setTimeout(updateFilters, 100);
    }
  });

  clearBtn.addEventListener('click', function () {
    form.querySelectorAll('input[type="checkbox"], input[type="radio"]').forEach(el => el.checked = false);
    sortSelect.value = '';
    window.location.href = '/shop';
  });
});