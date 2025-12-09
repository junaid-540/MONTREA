function updateCartBadge(count) {
    const cartLink = document.querySelector('a[href="/cart"]');
    if (!cartLink) {
        return;
    }

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

document.querySelectorAll('.qty-decrease').forEach(btn => {
    btn.addEventListener('click', async function () {
        const form = this.closest('.qty-form');
        const input = form.querySelector('input[name="quantity"]');
        const currentQty = parseInt(input.value);

        if (currentQty > 1) {
            const newQty = currentQty - 1;
            await updateCartQuantity(form, newQty);
        } else {
            Toastify({
                text: "Minimum quantity is 1",
                duration: 2000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
        }
    });
});

document.querySelectorAll('.qty-increase').forEach(btn => {
    btn.addEventListener('click', async function () {
        const form = this.closest('.qty-form');
        const input = form.querySelector('input[name="quantity"]');
        const currentQty = parseInt(input.value);
        const maxQty = parseInt(this.dataset.max);

        if (currentQty < maxQty) {
            const newQty = currentQty + 1;
            await updateCartQuantity(form, newQty);
        } else {
            const limitReason = maxQty === 5 ? "cart limit" : "available stock";
            Toastify({
                text: `Maximum quantity is ${maxQty} (${limitReason})`,
                duration: 3000,
                gravity: "top",
                position: "right",
                style: {
                    background: "#f59e0b",
                }
            }).showToast();
        }
    });
});

async function updateCartQuantity(form, newQuantity) {
    const variantId = form.querySelector('input[name="productVariantId"]').value;
    const qtyInput = form.querySelector('input[name="quantity"]');
    const decreaseBtn = form.querySelector('.qty-decrease');
    const increaseBtn = form.querySelector('.qty-increase');

    decreaseBtn.disabled = true;
    increaseBtn.disabled = true;

    try {
        const response = await axios.post('/cart/update', {
            productVariantId: variantId,
            quantity: newQuantity
        });

        if (response.data.success) {
            qtyInput.value = newQuantity;
            decreaseBtn.disabled = newQuantity <= 1;
            increaseBtn.disabled = newQuantity >= response.data.data.maxQty;
            qtyInput.max = response.data.data.maxQty;
            increaseBtn.dataset.max = response.data.data.maxQty;
            updateOrderSummary(response.data.data);

            Toastify({
                text: response.data.message || "Cart updated successfully",
                duration: 1000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            }).showToast();
        } else {
            Toastify({
                text: response.data.message || "Failed to update cart",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();

            decreaseBtn.disabled = false;
            increaseBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error updating cart:', error);

        const errorMessage = error.response?.data?.message || "Failed to update cart";
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
        }).showToast();

        decreaseBtn.disabled = false;
        increaseBtn.disabled = false;
    }
}


document.querySelectorAll('.remove-form').forEach(form => {
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        const itemElement = this.closest('.item');
        const productName = itemElement.querySelector('h3').textContent;
        const variantId = this.querySelector('input[name="productVariantId"]').value;
        const productId = itemElement.dataset.productId; // Make sure to add this data attribute in cart.ejs

        Swal.fire({
            title: 'Remove Item?',
            text: `What would you like to do with "${productName}"?`,
            icon: 'question',
            showDenyButton: true,
            confirmButtonColor: '#f59e0b',
            denyButtonColor: '#dc3545',
            confirmButtonText: '💖 Move to Wishlist',
            denyButtonText: '🗑️ Remove',
            scrollbarPadding: false,
            heightAuto: false
        }).then(async (result) => {
            if (result.isConfirmed) {
                // Move to wishlist
                await moveToWishlistFromCart(productId, variantId, itemElement);
            } else if (result.isDenied) {
                // Remove from cart
                await removeFromCart(variantId, itemElement);
            }
        });
    });
});

async function moveToWishlistFromCart(productId, variantId, itemElement) {
    try {
        const response = await axios.post('/cart/move-to-wishlist', {
            productId: productId,
            productVariantId: variantId
        });

        if (response.data.success) {
            const data = response.data.data;
            
            // Update badges
            updateCartBadge(data.cartItemscount);
            UpdateWishlistBadge(data.wishlistItemsCount);

            // Show appropriate message
            const message = data.alreadyInWishlist 
                ? 'Item was already in wishlist. Removed from cart.'
                : 'Item moved to wishlist successfully!';

            // Remove the item from DOM with animation
            itemElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            itemElement.style.opacity = '0';
            itemElement.style.transform = 'translateX(-20px)';

            setTimeout(() => {
                itemElement.remove();

                if (data.isEmpty) {
                    updateCartBadge(0);
                    window.location.reload();
                } else {
                    updateOrderSummary(data);
                    if (!data.hasInvalidItems) {
                        const warningBanner = document.querySelector('.alert-warning');
                        if (warningBanner) {
                            warningBanner.remove();
                        }
                    }
                    updateCheckoutButton(data.canCheckout);
                }

                // Show success toast
                Toastify({
                    text: message,
                    duration: 3000,
                    gravity: "top",
                    position: "right",
                    backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
                }).showToast();

            }, 300);

        } else {
            Toastify({
                text: response.data.message || "Failed to move to wishlist",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
        }
    } catch (error) {
        console.error('Error moving to wishlist:', error);
        
        const errorMessage = error.response?.data?.message || "Failed to move to wishlist";
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
        }).showToast();
    }
}

async function removeFromCart(variantId, itemElement) {
    try {
        const response = await axios.post('/cart/remove', {
            productVariantId: variantId
        });

        if (response.data.success) {
            itemElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            itemElement.style.opacity = '0';
            itemElement.style.transform = 'translateX(-20px)';

            setTimeout(() => {
                itemElement.remove();

                console.log('Cart data after removal:', response.data.data);

                if (response.data.data.isEmpty) {
                    updateCartBadge(0);
                    window.location.reload();
                } else {
                    updateCartBadge(response.data.data.cartItemscount);
                    updateOrderSummary(response.data.data);

                    if (!response.data.data.hasInvalidItems) {
                        const warningBanner = document.querySelector('.alert-warning');
                        if (warningBanner) {
                            warningBanner.remove();
                        }
                    }

                    updateCheckoutButton(response.data.data.canCheckout);
                }

            }, 300);

        } else {
            Toastify({
                text: response.data.message || "Failed to remove item",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
        }
    } catch (error) {
        console.error('Error removing from cart:', error);

        const errorMessage = error.response?.data?.message || "Failed to remove item";
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
        }).showToast();
    }
}

function clearInvalidItems() {
    const invalidItems = document.querySelectorAll('.item[data-invalid="true"]');

    if (invalidItems.length === 0) {
        Toastify({
            text: "No invalid items to remove",
            duration: 2000,
            gravity: "top",
            position: "right",
            style: {
                background: "#17a2b8",
            }
        }).showToast();
        return;
    }

    Swal.fire({
        title: 'Clear Invalid Items?',
        text: `This will remove ${invalidItems.length} unavailable item(s) from your cart.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, clear them',
        cancelButtonText: 'Cancel',
        scrollbarPadding: false,
        heightAuto: false
    }).then(async (result) => {
        if (result.isConfirmed) {
            await clearInvalidItemsRequest(invalidItems);
        }
    });
}

async function clearInvalidItemsRequest(invalidItems) {
    try {
        const response = await axios.post('/cart/clear-invalid');

        if (response.data.success) {
            const isSingleItem = invalidItems.length === 1;
            const removalDelay = isSingleItem ? 1000 : 0;

            Toastify({
                text: response.data.message || "Invalid items removed",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #00b09b, #96c93d)",
            }).showToast();

            setTimeout(() => {
                invalidItems.forEach((item, index) => {
                    setTimeout(() => {
                        item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        item.style.opacity = '0';
                        item.style.transform = 'translateX(-20px)';

                        setTimeout(() => {
                            item.remove();

                            if (index === invalidItems.length - 1) {
                                console.log('Cart data after clearing:', response.data.data);

                                if (response.data.data.isEmpty) {
                                    updateCartBadge(0);
                                    window.location.reload();
                                } else {
                                    updateCartBadge(response.data.data.itemsCount);

                                    const warningBanner = document.querySelector('.alert-warning');
                                    if (warningBanner) {
                                        warningBanner.remove();
                                    }

                                    updateOrderSummary(response.data.data);
                                    updateCheckoutButton(response.data.data.canCheckout);
                                }
                            }
                        }, 300);
                    }, index * 100);
                });
            }, removalDelay);

        } else {
            Toastify({
                text: response.data.message || "Failed to clear invalid items",
                duration: 3000,
                gravity: "top",
                position: "right",
                backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
            }).showToast();
        }
    } catch (error) {
        console.error('Error clearing invalid items:', error);

        const errorMessage = error.response?.data?.message || "Failed to clear invalid items";
        Toastify({
            text: errorMessage,
            duration: 3000,
            gravity: "top",
            position: "right",
            backgroundColor: "linear-gradient(to right, #ff6b6b, #ee5a24)",
        }).showToast();
    }
}

function updateOrderSummary(data) {
    console.log('📊 Updating order summary with data:', data);

    const subtotalElements = document.querySelectorAll('.summary-row span');
    if (subtotalElements.length >= 2) {
        subtotalElements[1].textContent = `₹${data.subtotal.toFixed(2)}`;
        console.log('✅ Updated subtotal to:', data.subtotal.toFixed(2));
    }

    if (data.hasInvalidItems !== undefined) {
        const invalidNote = document.querySelector('.invalid-items-note');

        if (data.hasInvalidItems && !invalidNote && data.totalItems) {
            const firstSummaryRow = document.querySelector('.summary-row');
            if (firstSummaryRow) {
                const invalidDiv = document.createElement('div');
                invalidDiv.className = 'summary-row invalid-items-note';
                invalidDiv.innerHTML = `
                    <span>${data.totalItems - data.itemsCount} unavailable items</span>
                    <span>Not included</span>
                `;
                firstSummaryRow.parentNode.insertBefore(invalidDiv, firstSummaryRow.nextSibling);
                console.log('✅ Added invalid items note');
            }
        } else if (!data.hasInvalidItems && invalidNote) {
            invalidNote.remove();
            console.log('✅ Removed invalid items note');
        }
    }
}

function updateCheckoutButton(canCheckout) {
    const checkoutBtn = document.querySelector('.checkout-btn');
    const blockedMsg = document.querySelector('.checkout-blocked-msg');

    if (checkoutBtn) {
        if (canCheckout) {
            checkoutBtn.disabled = false;
            checkoutBtn.textContent = 'Checkout';
            checkoutBtn.setAttribute('href', '/checkout');
            if (blockedMsg) blockedMsg.remove();
            console.log('✅ Checkout button enabled');
        } else {
            checkoutBtn.disabled = true;
            checkoutBtn.textContent = 'Cannot Proceed';
            checkoutBtn.removeAttribute('href');
            if (!blockedMsg) {
                const msg = document.createElement('p');
                msg.className = 'checkout-blocked-msg';
                msg.textContent = 'Remove unavailable or out-of-stock items to continue';
                checkoutBtn.parentNode.insertBefore(msg, checkoutBtn.nextSibling);
            }
            console.log('✅ Checkout button disabled');
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success) {
        Toastify({
            text: success,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "#28a745",
            }
        }).showToast();

        window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (error) {
        Toastify({
            text: error,
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "#dc3545",
            }
        }).showToast();

        window.history.replaceState({}, document.title, window.location.pathname);
    }
});