// --- 1. Data Global Aplikasi ---
// MENGGUNAKAN BASE64 PLACEHOLDER UNTUK SIMULASI GAMBAR LOKAL
const PLACEHOLDER_IMG_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // 1x1 Transparent PNG

const initialMenuData = [
    // imageUrl sekarang menyimpan Base64 string dari gambar yang diupload
    { id: 'M1', name: 'Kopi Susu Panas', price: 12000, stock: 20, category: 'Minuman', imageUrl: PLACEHOLDER_IMG_BASE64 },
    { id: 'M2', name: 'Kentang Goreng Keju', price: 18000, stock: 0, category: 'Snack', imageUrl: PLACEHOLDER_IMG_BASE64 },
    { id: 'M3', name: 'Nasi Goreng Spesial', price: 30000, stock: 15, category: 'Makanan Berat', imageUrl: PLACEHOLDER_IMG_BASE64 },
    { id: 'M4', name: 'Es Jeruk Nipis', price: 15000, stock: 25, category: 'Minuman', imageUrl: PLACEHOLDER_IMG_BASE64 },
];

const defaultSettings = {
    restaurantAddress: 'Jl. Kenangan Indah No. 45, BSD City, Tangerang Selatan', 
    taxRate: 0, 
    qrisMerchantName: 'Pondok Marisa Official',
    bankName: 'BCA',
    bankAccountNumber: '1234567890',
    accountHolderName: 'Pondok Marisa PT',
    qrisImageUrl: 'https://i.imgur.com/FwW7N5E.png', 
};

// --- 2. Inisialisasi Data Global ---
let menus = JSON.parse(localStorage.getItem('menus')) || initialMenuData;
let cart = (document.getElementById('body-pelanggan')) ? (JSON.parse(localStorage.getItem('cart')) || []) : [];
let orders = JSON.parse(localStorage.getItem('orders')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || defaultSettings;
let cartMap = {};

// --- 3. Fungsi Utilitas Global ---
function formatRupiah(number) { 
    if (typeof number !== 'number' || isNaN(number)) return 'Rp 0';
    return 'Rp ' + number.toLocaleString('id-ID'); 
}

function saveToLocalStorage() {
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.setItem('menus', JSON.stringify(menus)); 
    localStorage.setItem('settings', JSON.stringify(settings));
}

function calculateCartTotals() {
    const subtotal = cart.reduce((sum, item) => {
        const price = Number(item.price) || 0;
        const qty = Number(item.qty) || 0;
        return sum + (qty * price);
    }, 0);
    
    const taxRate = Number(settings.taxRate) || 0;
    const tax = subtotal * (taxRate / 100);
    const totalAmount = subtotal + tax;
    
    return { subtotal, tax, totalAmount };
}
function updateCartMap() {
    cartMap = {};
    cart.forEach(item => { cartMap[item.id] = item; });
}
function closeModal(event, modalId) {
    const modal = document.getElementById(modalId);
    if (!event || event.target === modal || event.target.classList.contains('close-btn')) {
        modal.style.display = 'none';
        // Khusus untuk modal menu, reset form saat ditutup
        if (modalId === 'menu-form-modal') {
             document.getElementById('menu-item-id').value = '';
             document.getElementById('menu-form').reset();
             document.getElementById('form-title').textContent = 'Tambah Produk Baru';
             document.getElementById('delete-menu-btn').style.display = 'none';
             document.getElementById('menu-image-preview').src = PLACEHOLDER_IMG_BASE64;
             document.getElementById('menu-image-preview').style.display = 'none';
        }
    }
}

// FUNGSI BARU: Generate ID Baru (M1, M2, M3, ...)
function generateNewId() {
    const maxId = menus.reduce((max, item) => {
        if (item.id.startsWith('M')) {
            const num = parseInt(item.id.substring(1));
            return Math.max(max, num);
        }
        return max;
    }, 0);
    return 'M' + (maxId + 1);
}

// FUNGSI BARU: Mengubah File menjadi Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

// --- 4. FUNGSI MENU & KERANJANG (PELANGGAN) ---

function renderMenu() {
    const container = document.getElementById('menu-grid');
    if (!container) return; 
    container.innerHTML = ''; 
    updateCartMap();

    menus.forEach(item => {
        const currentQty = cartMap[item.id] ? cartMap[item.id].qty : 0;
        const isDisabled = item.stock <= 0 ? 'disabled' : '';
        const stockText = item.stock > 0 ? `Stok: ${item.stock} porsi` : `<span style="color: var(--color-danger); font-weight: bold;">HABIS</span>`;

        // Menggunakan imageUrl (Base64) di style background-image
        container.insertAdjacentHTML('beforeend', `
            <div class="menu-item-card" data-id="${item.id}">
                <div class="item-image" style="background-image: url('${item.imageUrl}');">
                    ${item.stock <= 0 ? '<span class="sold-out-badge">HABIS</span>' : ''}
                </div>
                <div class="item-details-card">
                    <h4>${item.name}</h4>
                    <div class="item-info-row">
                        <span class="price">${formatRupiah(item.price)}</span>
                        <span class="stock">${stockText}</span>
                    </div>
                    <div class="add-to-cart-controls">
                        <button onclick="updateCart('${item.id}', -1)" ${currentQty === 0 ? 'disabled' : ''}>-</button>
                        <span id="qty-${item.id}" class="item-qty-display">${currentQty}</span>
                        <button onclick="updateCart('${item.id}', 1)" ${isDisabled}>+</button>
                    </div>
                </div>
            </div>
        `);
    });
    updateCartDisplay(); 
}

function updateCart(itemId, change) {
    if (!document.getElementById('body-pelanggan')) return; 

    const menuIndex = menus.findIndex(m => m.id === itemId);
    if (menuIndex === -1) return;
    const menuItem = menus[menuIndex];
    
    if (change > 0 && menuItem.stock <= 0) { alert('Maaf, stok item ini sudah habis.'); return; }

    const cartItemIndex = cart.findIndex(c => c.id === itemId);
    let newQty;

    if (cartItemIndex !== -1) {
        newQty = Math.max(0, cart[cartItemIndex].qty + change);
        if (newQty > menuItem.stock) { alert('Tidak bisa menambah, melebihi stok yang tersedia.'); return; }
        
        if (newQty === 0) { cart.splice(cartItemIndex, 1); } 
        else { cart[cartItemIndex].qty = newQty; }
    } else if (change > 0) {
        if (change > menuItem.stock) { alert('Tidak bisa menambah, melebihi stok yang tersedia.'); return; }
        // Pastikan menyimpan imageUrl (Base64) ke keranjang
        cart.push({ id: itemId, name: menuItem.name, price: Number(menuItem.price), qty: change, imageUrl: menuItem.imageUrl });
        newQty = change;
    } else { newQty = 0; }
    
    updateCartMap();
    const qtyDisplayElement = document.getElementById(`qty-${itemId}`);
    if(qtyDisplayElement) {
        qtyDisplayElement.textContent = newQty;
        qtyDisplayElement.previousElementSibling.disabled = newQty === 0; 
    }
    updateCartDisplay();
    localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartDisplay() {
    if (!document.getElementById('body-pelanggan')) return; 

    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const { totalAmount } = calculateCartTotals();

    const cartCountElement = document.getElementById('cart-count');
    const cartTotalElement = document.getElementById('cart-total-price');
    const cartFixedElement = document.getElementById('cart-total-fixed');

    if (cartCountElement) cartCountElement.textContent = totalItems;
    if (cartTotalElement) cartTotalElement.textContent = formatRupiah(totalAmount); 
    
    if (cartFixedElement) {
        cartFixedElement.style.display = totalItems > 0 ? 'flex' : 'none';
    }
}

// --- 5. FUNGSI CHECKOUT (PELANGGAN) (TIDAK ADA PERUBAHAN) ---

function loadCheckoutInfo() {
    if (!document.getElementById('body-pelanggan')) return; 
    settings = JSON.parse(localStorage.getItem('settings')) || defaultSettings; 

    if(document.getElementById('bank-name-display')) {
        document.getElementById('bank-name-display').textContent = settings.bankName;
        document.getElementById('qris-merchant-display').textContent = settings.qrisMerchantName;
    }
    if(document.querySelector('.qris-image-display')) {
        // Ini masih pakai URL karena QRIS umumnya gambar statis eksternal
        document.querySelector('.qris-image-display').src = settings.qrisImageUrl;
    }
}

function togglePaymentDisplay() {
    if (!document.getElementById('body-pelanggan')) return; 

    const selectedMethodElement = document.querySelector('input[name="payment-method"]:checked');
    if (!selectedMethodElement) return;

    const selectedMethod = selectedMethodElement.value;
    const cashBox = document.getElementById('cash-box');
    const qrisBox = document.getElementById('qris-box');
    const transferBox = document.getElementById('transfer-box');
    const { subtotal, tax, totalAmount } = calculateCartTotals();
    
    if (cashBox) cashBox.style.display = 'none';
    if (qrisBox) qrisBox.style.display = 'none';
    if (transferBox) transferBox.style.display = 'none';
    
    if (selectedMethod === 'Cash' && cashBox) {
        cashBox.style.display = 'block';
    } else if (selectedMethod === 'QRIS' && qrisBox) {
        qrisBox.style.display = 'block';
        document.getElementById('qris-total-amount-display').textContent = formatRupiah(totalAmount); 
        document.getElementById('qris-merchant-info').textContent = settings.qrisMerchantName;
    } else if (selectedMethod === 'Transfer' && transferBox) {
        transferBox.style.display = 'block';
        document.getElementById('transfer-bank').textContent = settings.bankName;
        document.getElementById('transfer-rekening').textContent = settings.bankAccountNumber;
        document.getElementById('transfer-an').textContent = settings.accountHolderName;
        document.getElementById('transfer-total-amount-display').textContent = formatRupiah(totalAmount); 
    }

    document.getElementById('checkout-subtotal').textContent = formatRupiah(subtotal);
    document.getElementById('checkout-tax').textContent = settings.taxRate > 0 ? `${settings.taxRate}% (${formatRupiah(tax)})` : 'Gratis';
    document.getElementById('final-total-amount').textContent = formatRupiah(totalAmount); 
}

function renderCheckoutSummary() {
    if (!document.getElementById('body-pelanggan')) return; 

    const listDiv = document.getElementById('checkout-items-list');
    if (!listDiv) return;

    listDiv.innerHTML = '';
    
    cart.forEach(item => {
        const itemTotal = (Number(item.qty) || 0) * (Number(item.price) || 0); 
        
        // Menggunakan imageUrl (Base64) di img src
        listDiv.insertAdjacentHTML('beforeend', `
            <li class="checkout-review-list">
                <span class="item-details-checkout">
                    <img src="${item.imageUrl}" alt="${item.name}" class="checkout-item-image">
                    <div>
                        <strong>${item.name}</strong> 
                        <span style="display: block; font-size: 0.9em; color: var(--color-text-light);">(${item.qty} x ${formatRupiah(item.price)})</span>
                    </div>
                </span>
                <span class="text-secondary-checkout">${formatRupiah(itemTotal)}</span>
            </li>
        `);
    });
    
    togglePaymentDisplay(); 
}

function placeOrder(paymentProof = null) {
    if (!document.getElementById('body-pelanggan')) return; 

    const customerInfo = document.getElementById('customer-info').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
    const { subtotal, tax, totalAmount } = calculateCartTotals();

    if (!customerInfo) { alert('Mohon isi Nomor Meja atau Nama Pelanggan!'); document.getElementById('customer-info').focus(); return; }

    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const orderCount = orders.length + 1;
    const orderId = 'P' + dateStr + '-' + String(orderCount).padStart(3, 0);

    const orderItems = JSON.parse(JSON.stringify(cart)); 
    
    const newOrder = { 
        id: orderId, customerInfo, notes, paymentMethod, subtotal, tax, totalAmount, 
        timestamp: new Date().toISOString(), status: 'Pending', items: orderItems, 
        paymentProof: paymentProof
    };

    let isStockSufficient = true;
    let insufficientItemName = '';
    const menusCopy = [...menus];
    
    cart.forEach(cartItem => {
        const menuIndex = menusCopy.findIndex(m => m.id === cartItem.id);
        if (menuIndex !== -1) {
            if (menusCopy[menuIndex].stock >= cartItem.qty) {
                menusCopy[menuIndex].stock -= cartItem.qty;
            } else { 
                isStockSufficient = false; 
                insufficientItemName = menusCopy[menuIndex].name; 
            }
        }
    });

    if (!isStockSufficient) { 
        alert(`Maaf, stok ${insufficientItemName} tidak mencukupi untuk pesanan Anda. Keranjang dikosongkan.`); 
        localStorage.removeItem('cart'); 
        if (typeof switchView === 'function') switchView('menu'); 
        return; 
    }

    menus = menusCopy;
    orders.unshift(newOrder); 
    saveToLocalStorage();

    cart = [];
    localStorage.removeItem('cart');

    document.getElementById('order-id-display').textContent = orderId;
    document.getElementById('paid-total-amount').textContent = formatRupiah(totalAmount); 
    
    const infoText = document.getElementById('payment-info-text');
    if (newOrder.paymentMethod === 'Cash') {
        infoText.innerHTML = '<i class="fas fa-money-bill-wave" style="color: var(--color-success);"></i> Pesanan dicatat. **Mohon tunggu Kasir** untuk mengambil pembayaran tunai Anda.';
    } else {
        let proofStatus = newOrder.paymentProof 
            ? 'Bukti pembayaran sudah diterima. Kasir akan segera memverifikasi pesanan Anda.' 
            : 'Bukti pembayaran belum diterima/terdeteksi.';
            
        infoText.innerHTML = `<i class="fas fa-exclamation-triangle" style="color: var(--color-warning);"></i> Pesanan dicatat, status: **Menunggu Verifikasi Pembayaran**. ${proofStatus}`;
    }

    document.getElementById('success-modal').style.display = 'flex';
}

// --- 6. FUNGSI ADMIN ---

function showAdminTab(tabId, element) {
    if (!document.getElementById('body-admin')) return; 

    document.querySelectorAll('.tab-content-admin').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.tab-btn-admin').forEach(btn => btn.classList.remove('active'));
    if(element) element.classList.add('active');
    
    if (tabId === 'settings-tab') loadSettings();
    if (tabId === 'orders-tab') renderOrders();
    if (tabId === 'menu-tab') renderMenuAdmin(); 
}

function renderOrders() {
    const tableBody = document.querySelector('#orders-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    orders = JSON.parse(localStorage.getItem('orders')) || []; 

    orders.sort((a, b) => {
        const statusOrder = { 'Pending': 0, 'In Process': 1, 'Ready': 2, 'Completed': 3 };
        return statusOrder[a.status] - statusOrder[b.status];
    });

    const pendingCountElement = document.getElementById('pending-count');
    const pendingCount = orders.filter(o => o.status === 'Pending').length;
    if (pendingCountElement) pendingCountElement.textContent = pendingCount;

    orders.forEach(order => { 
        let statusColor = 'var(--color-warning)'; 
        if (order.status === 'In Process') statusColor = 'var(--color-info)';
        if (order.status === 'Ready') statusColor = 'var(--color-success)';
        if (order.status === 'Completed') statusColor = 'var(--color-text-light)';
        
        const proofButton = (order.paymentMethod === 'QRIS' || order.paymentMethod === 'Transfer') && order.paymentProof
            ? `<button class="btn-action view-proof" onclick="viewPaymentProof('${order.id}')"><i class="fas fa-image"></i> Bukti</button>`
            : '';

        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.customerInfo}</td>
            <td>${order.paymentMethod}</td>
            <td>${formatRupiah(order.totalAmount)}</td>
            <td style="color: ${statusColor}; font-weight: bold;">${order.status}</td>
            <td class="admin-actions">
                ${proofButton}
                <button class="btn-action print-struk" onclick="viewOrderStruk('${order.id}')"><i class="fas fa-print"></i> Struk</button>
                
                ${order.status === 'Pending' ? 
                    `<button class="btn-action status-process" onclick="updateOrderStatus('${order.id}', 'In Process')"><i class="fas fa-concierge-bell"></i> Proses</button>` : ''}
                ${order.status === 'In Process' ? 
                    `<button class="btn-action status-ready" onclick="updateOrderStatus('${order.id}', 'Ready')"><i class="fas fa-check"></i> Siap</button>` : ''}
                ${order.status === 'Ready' ? 
                    `<button class="btn-action status-completed" onclick="updateOrderStatus('${order.id}', 'Completed')"><i class="fas fa-archive"></i> Selesai</button>` : ''}
            </td>
        `;
    });
}

function updateOrderStatus(id, newStatus) {
    if (!document.getElementById('body-admin')) return;
    
    const orderIndex = orders.findIndex(o => o.id === id);
    if (orderIndex !== -1) {
        orders[orderIndex].status = newStatus;
        saveToLocalStorage();
        renderOrders();
    }
}

function loadSettings() {
    if(document.getElementById('bankName')) {
        settings = JSON.parse(localStorage.getItem('settings')) || defaultSettings;
        
        document.getElementById('restaurantAddress').value = settings.restaurantAddress || '';
        document.getElementById('bankName').value = settings.bankName || '';
        document.getElementById('bankAccountNumber').value = settings.bankAccountNumber || '';
        document.getElementById('accountHolderName').value = settings.accountHolderName || '';
        document.getElementById('qrisMerchantName').value = settings.qrisMerchantName || '';
        document.getElementById('taxRate').value = settings.taxRate !== undefined ? settings.taxRate : defaultSettings.taxRate;
        
        const qrisUrlInput = document.getElementById('qrisImageUrl');
        const qrisPreview = document.getElementById('qris-preview');
        
        if (qrisUrlInput && qrisPreview) {
            qrisUrlInput.value = settings.qrisImageUrl || '';
            qrisPreview.src = settings.qrisImageUrl || "https://via.placeholder.com/150x150?text=QRIS+Preview";
        }
    }
}

function saveSettings(event) {
    event.preventDefault();
    
    settings.restaurantAddress = document.getElementById('restaurantAddress').value.trim();
    settings.bankName = document.getElementById('bankName').value;
    settings.bankAccountNumber = document.getElementById('bankAccountNumber').value;
    settings.accountHolderName = document.getElementById('accountHolderName').value;
    settings.qrisMerchantName = document.getElementById('qrisMerchantName').value;
    settings.qrisImageUrl = document.getElementById('qrisImageUrl').value.trim();
    settings.taxRate = parseFloat(document.getElementById('taxRate').value) || 0; 

    saveToLocalStorage();
    alert('Pengaturan Pembayaran & Struk (Termasuk Alamat) berhasil disimpan, Boss Syafiq!');
    
    loadSettings(); 
}

function viewOrderStruk(orderId) {
    if (!document.getElementById('body-admin')) return;
    
    const order = orders.find(o => o.id === orderId);
    if (!order) { alert('Data pesanan tidak ditemukan.'); return; }

    settings = JSON.parse(localStorage.getItem('settings')) || defaultSettings; 

    const strukContentDiv = document.getElementById('struk-content');
    if (!strukContentDiv) return;

    const totalWithTax = order.totalAmount; 
    
    let itemsHtml = order.items.map(item => {
        const itemTotal = (Number(item.qty) || 0) * (Number(item.price) || 0);
        return `
            <tr style="font-size: 0.9em;">
                <td style="padding: 3px 0;">${item.qty}x ${item.name}</td>
                <td style="text-align: right; padding: 3px 0;">${formatRupiah(item.price)}</td>
                <td style="text-align: right; padding: 3px 0;">${formatRupiah(itemTotal)}</td>
            </tr>
        `;
    }).join('');

    const date = new Date(order.timestamp).toLocaleString('id-ID', { hour12: false });
    const taxValue = order.tax > 0 ? formatRupiah(order.tax) : 'Gratis';

    strukContentDiv.innerHTML = `
        <div style="font-family: monospace; line-height: 1.4; color: var(--color-text-dark);">
            <h3 style="text-align: center; margin-bottom: 5px;">RM PONDOK MARISA</h3>
            <p style="text-align: center; font-size: 0.8em; border-bottom: 1px dashed #333; padding-bottom: 10px;">
                ${settings.restaurantAddress || 'Alamat Restoran Belum Diatur'}
            </p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr style="font-size: 0.9em;"><td style="width: 50%;">No. Pesanan</td><td style="text-align: right;">${order.id}</td></tr>
                <tr style="font-size: 0.9em;"><td>Waktu</td><td style="text-align: right;">${date}</td></tr>
                <tr style="font-size: 0.9em;"><td>Pelanggan</td><td style="text-align: right;">${order.customerInfo}</td></tr>
            </table>
            <p style="border-bottom: 1px dashed #333; margin: 10px 0;"></p>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="font-size: 0.9em;">
                        <th style="text-align: left; padding-bottom: 5px;">Item</th>
                        <th style="text-align: right; padding-bottom: 5px; width: 25%;">Harga</th>
                        <th style="text-align: right; padding-bottom: 5px; width: 25%;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml} 
                </tbody>
            </table>
            <p style="border-top: 1px dashed #333; margin: 10px 0;"></p>
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="font-size: 0.9em;">
                    <td style="padding: 3px 0;">Subtotal</td>
                    <td style="text-align: right; padding: 3px 0;">${formatRupiah(order.subtotal)}</td>
                </tr>
                <tr style="font-size: 0.9em;">
                    <td style="padding: 3px 0;">Pajak/Layanan (${settings.taxRate}%)</td>
                    <td style="text-align: right; padding: 3px 0;">${taxValue}</td>
                </tr>
                <tr style="font-weight: bold; font-size: 1em;">
                    <td style="padding: 5px 0;">TOTAL BAYAR</td>
                    <td style="text-align: right; color: var(--color-primary);">${formatRupiah(totalWithTax)}</td>
                </tr>
            </table>
            <p style="text-align: center; font-size: 0.8em; margin-top: 15px;">
                Metode Bayar: ${order.paymentMethod}<br>
                *** TERIMA KASIH ***
            </p>
        </div>
    `;

    document.getElementById('struk-modal').style.display = 'flex';
}

// FUNGSI BARU: CRUD MENU ITEM DI ADMIN

function openMenuForm(itemId = null) {
    const form = document.getElementById('menu-form');
    document.getElementById('menu-item-id').value = '';
    form.reset();
    document.getElementById('form-title').textContent = 'Tambah Produk Baru';
    document.getElementById('delete-menu-btn').style.display = 'none';
    
    const preview = document.getElementById('menu-image-preview');
    preview.src = PLACEHOLDER_IMG_BASE64;
    preview.style.display = 'none';

    if (itemId) {
        const item = menus.find(m => m.id === itemId);
        if (!item) return;

        document.getElementById('form-title').textContent = 'Edit Produk: ' + item.name;
        document.getElementById('menu-item-id').value = item.id;
        document.getElementById('menu-name').value = item.name;
        document.getElementById('menu-price').value = item.price;
        document.getElementById('menu-stock').value = item.stock;
        document.getElementById('menu-category').value = item.category;
        
        // Tampilkan Base64 gambar saat edit
        preview.src = item.imageUrl;
        preview.style.display = 'block';
        
        document.getElementById('delete-menu-btn').style.display = 'block';
    }

    document.getElementById('menu-form-modal').style.display = 'flex';
}

async function saveMenuItem(event) {
    event.preventDefault();

    const id = document.getElementById('menu-item-id').value;
    const name = document.getElementById('menu-name').value.trim();
    const price = parseInt(document.getElementById('menu-price').value) || 0;
    const stock = parseInt(document.getElementById('menu-stock').value) || 0;
    const category = document.getElementById('menu-category').value;
    const fileInput = document.getElementById('menu-image-file');

    if (name === '' || price <= 0 || stock < 0 || category === '') {
        alert('Data produk tidak lengkap atau harga/stok tidak valid.');
        return;
    }

    let imageUrl = '';

    if (fileInput.files.length > 0) {
        // ADA FILE BARU: Konversi ke Base64
        try {
            imageUrl = await fileToBase64(fileInput.files[0]);
        } catch (error) {
            console.error("Gagal mengkonversi file:", error);
            alert('Gagal memproses file gambar. Simpan tanpa gambar baru.');
            imageUrl = PLACEHOLDER_IMG_BASE64;
        }
    } else if (id) {
        // EDIT TAPI TIDAK ADA FILE BARU: Pertahankan gambar lama
        const existingItem = menus.find(m => m.id === id);
        imageUrl = existingItem ? existingItem.imageUrl : PLACEHOLDER_IMG_BASE64;
    } else {
        // TAMBAH BARU TAPI TIDAK ADA FILE: Gunakan placeholder
        imageUrl = PLACEHOLDER_IMG_BASE64;
    }

    if (id) {
        // Edit Item
        const index = menus.findIndex(m => m.id === id);
        if (index !== -1) {
            menus[index] = { id, name, price, stock, category, imageUrl };
            alert(`Produk ${name} berhasil diperbarui, Boss Syafiq!`);
        }
    } else {
        // Tambah Item Baru
        const newId = generateNewId();
        menus.push({ id: newId, name, price, stock, category, imageUrl });
        alert(`Produk ${name} berhasil ditambahkan dengan ID ${newId}!`);
    }

    saveToLocalStorage();
    renderMenuAdmin();
    closeModal(null, 'menu-form-modal');
}

function deleteMenuItem() {
    const id = document.getElementById('menu-item-id').value;
    const name = document.getElementById('menu-name').value;
    
    if (confirm(`Yakin ingin menghapus produk "${name}" (ID: ${id})? Aksi ini tidak bisa dibatalkan.`)) {
        menus = menus.filter(m => m.id !== id);
        saveToLocalStorage();
        renderMenuAdmin();
        closeModal(null, 'menu-form-modal');
        alert(`Produk ${name} berhasil dihapus.`);
    }
}

function renderMenuAdmin() {
    const tableBody = document.querySelector('#menu-admin-table tbody');
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    // Sortir menu berdasarkan ID
    menus.sort((a, b) => a.id.localeCompare(b.id));

    menus.forEach(item => {
        const stockColor = item.stock <= 5 ? 'color: var(--color-danger); font-weight: bold;' : '';
        
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${item.id}</td>
            <td class="menu-name-cell">
                <img src="${item.imageUrl}" alt="${item.name}" class="menu-thumb">
                <span>${item.name}</span>
            </td>
            <td>${formatRupiah(item.price)}</td>
            <td style="${stockColor}">${item.stock} porsi</td>
            <td>${item.category}</td>
            <td class="admin-actions">
                <button class="btn-action status-process" onclick="openMenuForm('${item.id}')"><i class="fas fa-edit"></i> Edit</button>
            </td>
        `;
    });
}


// Tambahkan fungsi printStruk dan viewPaymentProof
function printStruk() {
    if (!document.getElementById('body-admin')) return;
    
    const strukContent = document.getElementById('struk-content').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=400');
    
    printWindow.document.write('<html><head><title>Struk Pesanan</title>');
    printWindow.document.write('<style>');
    printWindow.document.write(`
        body { font-family: 'Montserrat', sans-serif; font-size: 12px; margin: 0; padding: 10px; color: #333; }
        table { width: 100%; border-collapse: collapse; }
        td, th { font-size: 11px; padding: 2px 0; }
        p, h3 { margin: 0; padding: 0; }
        .total-row td { font-weight: bold; font-size: 1.1em; }
    `);
    printWindow.document.write('</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(strukContent);
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

function viewPaymentProof(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order || !order.paymentProof) {
        alert('Bukti pembayaran tidak ditemukan.');
        return;
    }

    const modal = document.getElementById('proof-modal');
    const proofDetails = document.getElementById('proof-details');
    
    proofDetails.innerHTML = `
        <h3 style="color: var(--color-primary); margin-bottom: 15px;"><i class="fas fa-file-image"></i> Bukti Bayar #${order.id}</h3>
        <p style="margin-bottom: 5px;">Metode Pembayaran: <strong>${order.paymentProof.method}</strong></p>
        <p style="margin-bottom: 15px;">Nama File: <strong>${order.paymentProof.name}</strong></p>
        <div class="proof-image-container">
            <img src="${order.paymentProof.simulatedUrl}" alt="Bukti Pembayaran" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--color-border);">
            <p style="font-size: 0.8em; color: var(--color-text-light); margin-top: 10px;">*Ini adalah simulasi tampilan URL gambar.</p>
        </div>
    `;
    modal.style.display = 'flex';
}