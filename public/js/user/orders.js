
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    const orderCards = document.querySelectorAll('.order-card');
    const ordersList = document.querySelector('.orders-list');

    
    const toggleClearButton = () => {
        if (searchInput.value.trim()) {
            clearBtn.classList.add('show');
        } else {
            clearBtn.classList.remove('show');
        }
    };

    
    const filterOrders = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    let visibleCount = 0;

    orderCards.forEach(card => {
        const orderId = card.dataset.orderId.toLowerCase();
        const productNames = (card.dataset.productNames || '').toLowerCase();

        if (orderId.includes(searchTerm) || productNames.includes(searchTerm)) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.3s ease';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    removeNoResultsMessage();
    if (visibleCount === 0 && searchTerm !== '') {
        showNoResultsMessage();
    }
};

    // Clear button click
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        toggleClearButton();
        filterOrders();
        searchInput.focus();
    });

    // Input events
    searchInput.addEventListener('input', () => {
        toggleClearButton();
        filterOrders();
    });


    // Initial state
    toggleClearButton();
    filterOrders(); 

    // No results message
    function showNoResultsMessage() {
        const existing = document.querySelector('.no-results-message');
        if (existing) return;

        const msg = document.createElement('div');
        msg.className = 'no-results-message empty-state';
        msg.innerHTML = `
            <i class="fas fa-search" style="font-size: 3.5rem; color: #ddd; margin-bottom: 1rem;"></i>
            <h2>No Orders Found</h2>
            <p>We couldn't find any orders matching "<strong>${searchInput.value.trim()}</strong>"</p>
        `;
        ordersList.appendChild(msg);
    }

    function removeNoResultsMessage() {
        const msg = document.querySelector('.no-results-message');
        if (msg) msg.remove();
    }

    // Fade-in animation (your original)
    if (!document.querySelector('#fadeInStyle')) {
        const style = document.createElement('style');
        style.id = 'fadeInStyle';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(-10px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
});