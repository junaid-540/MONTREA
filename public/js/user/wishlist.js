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

function UpdateCartBadge(count) {
    const cartLink = document.querySelector('a[href="/cart"]');
    if (!cartLink) return;

    let badge = cartLink.querySelector('.cart-badge');
    if (count > 0) {
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'cart-badge';
            cartLink.appendChild(badge);
        }
        badge.textContent = count;
    } else {
        if (badge) {
            badge.remove();
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Wishlist page loaded');
    
    const moveToCartButtons = document.querySelectorAll('.btn-move-to-cart');
    moveToCartButtons.forEach(button => {
        button.addEventListener('click', handleMoveToCart);
    });
    
    const removeButtons = document.querySelectorAll('.btn-remove');
    removeButtons.forEach(button => {
        button.addEventListener('click', handleRemoveFromWishlist);
    });
});

async function handleMoveToCart(event) {
    const button = event.currentTarget;
    const variantId = button.dataset.variantId;
    const productId = button.dataset.productId;
    
    if (!variantId || !productId) {
        showToast('Invalid product data', 'error');
        return;
    }
    
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Moving...';
    
    try {
        const response = await axios.post('/wishlist/move-to-cart', {
            productId: productId,
            productVariantId: variantId,
            quantity: 1
        });

        const data = response.data;

        if (data.success) {
            // Update badges immediately after API success (reflects cart +1, wishlist -1)
            UpdateCartBadge(data.data.cartItemsCount);
            UpdateWishlistBadge(data.data.wishlistItemsCount);

            // Grab the item element now (before potential navigation)
            const wishlistItem = button.closest('.wishlist-item');

            // Show popup FIRST
            Swal.fire({
                icon: 'success',
                title: 'Moved to Cart!',
                html: `
                    <div style="text-align: left; padding: 15px; background: #f8f9fa; border-radius: 8px; margin-top: 15px;">
                        <p style="margin: 10px 0; font-size: 15px;">
                            <strong>Product:</strong> ${data.data.productName}
                        </p>
                        <p style="margin: 10px 0; font-size: 15px;">
                            <strong>Color:</strong> ${data.data.variantDetails.color}
                        </p>
                        <p style="margin: 10px 0; font-size: 15px;">
                            <strong>Size:</strong> ${data.data.variantDetails.size}
                        </p>
                        <p style="margin: 10px 0; font-size: 15px;">
                            <strong>Quantity:</strong> ${data.data.quantity}
                        </p>
                    </div>
                `,
                showCancelButton: true,
                confirmButtonColor: '#f59e0b',
                cancelButtonColor: '#6c757d',
                confirmButtonText: '🛒 Go to Cart',
                cancelButtonText: '🛍️ Continue Shopping',
                scrollbarPadding: false,
                heightAuto: false
            }).then((result) => {
                // NOW remove item from DOM after popup closes (creates the delay you want)
                if (wishlistItem) {
                    wishlistItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    wishlistItem.style.opacity = '0';
                    wishlistItem.style.transform = 'translateX(20px)';
                    
                    setTimeout(() => {
                        wishlistItem.remove();
                        
                        const remainingItems = document.querySelectorAll('.wishlist-item');
                        if (remainingItems.length === 0 && !result.isConfirmed) {
                            // Only reload if last item AND user canceled (stayed on wishlist)
                            window.location.reload();
                        } else {
                            // Update items count in header
                            const itemsCount = document.querySelector('.items-count');
                            if (itemsCount) {
                                const count = remainingItems.length;
                                itemsCount.textContent = `(${count} ${count === 1 ? 'item' : 'items'})`;
                            }
                        }
                    }, 300);
                }

                // Handle navigation with delay to let animation finish
                if (result.isConfirmed) {
                    setTimeout(() => {
                        window.location.href = '/cart';
                    }, 300);
                }
            });

        } else {
            button.disabled = false;
            button.innerHTML = originalText;
            
            const errMsg = data.message || 'Failed to move to cart';
            showToast(errMsg, 'error');
        }
        
    } catch (error) {
        console.error('Error moving to cart:', error);
        button.disabled = false;
        button.innerHTML = originalText;
        
        // Handle specific error responses
        const errMsg = error.response?.data?.message || 'Failed to move to cart';
        showToast(errMsg, 'error');
    }
}

async function handleRemoveFromWishlist(event) {
    const button = event.currentTarget;
    const variantId = button.dataset.variantId;
    
    if (!variantId) {
        showToast('Invalid product data', 'error');
        return;
    }
    
    const confirmed = await showConfirmDialog(
        'Are you sure you want to remove this item from your wishlist?'
    );
    
    if (!confirmed) return;
    
    button.disabled = true;
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Removing...';
    
    try {
        const response = await axios.delete(`/wishlist/items/${variantId}`);

        const data = response.data;

        if (data.success) {
            UpdateWishlistBadge(data.data.wishlistItemsCount);

            const wishlistItem = button.closest('.wishlist-item');
            if (wishlistItem) {
                wishlistItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                wishlistItem.style.opacity = '0';
                wishlistItem.style.transform = 'translateX(-20px)';
                
                setTimeout(() => {
                    wishlistItem.remove();
                    
                    const remainingItems = document.querySelectorAll('.wishlist-item');
                    if (remainingItems.length === 0) {
                        window.location.reload();
                    } else {
                        const itemsCount = document.querySelector('.items-count');
                        if (itemsCount) {
                            const count = remainingItems.length;
                            itemsCount.textContent = `(${count} ${count === 1 ? 'item' : 'items'})`;
                        }
                    }
                }, 300);
            }

        } else {
            button.disabled = false;
            button.innerHTML = originalText;
            
            const errMsg = data.message || 'Failed to remove from wishlist';
            showToast(errMsg, 'error');
        }
        
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        button.disabled = false;
        button.innerHTML = originalText;
        
        const errMsg = error.response?.data?.message || 'Failed to remove from wishlist';
        showToast(errMsg, 'error');
    }
}

function showToast(message, type = 'info') {
    let bgColor;
    switch (type) {
        case 'error':
            bgColor = "linear-gradient(to right, #ff6b6b, #ee5a24)";
            break;
        case 'success':
            bgColor = "linear-gradient(to right, #00b09b, #96c93d)";
            break;
        case 'warning':
            bgColor = "linear-gradient(to right, #ffa726, #ff7043)";
            break;
        default:
            bgColor = "linear-gradient(to right, #2196f3, #21cbf3)";
    }
    
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: bgColor,
        stopOnFocus: true,
    }).showToast();
}

function showConfirmDialog(message) {
    return new Promise((resolve) => {
        Swal.fire({
            title: 'Are you sure?',
            text: message,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, Remove',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}