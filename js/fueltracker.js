// FuelTracker JavaScript

// Global variables
let map;
let markers = [];
let currentUser = null;
let fuelPumps = [];
let originalPumps = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    checkAuthStatus();
    
    // Setup login/register forms if they exist
    setupAuthForms();
    
    // Initialize map if it exists on any page
    if (document.getElementById('map')) {
        initializeMap();
        
        // Setup fuel availability filters
        setupFuelFilters();
        
        // Setup admin panel if on admin page
        if (document.getElementById('admin-panel')) {
            setupAdminPanel();
            console.log('Admin panel setup initiated');
        }
    }
});

// Authentication functions
function checkAuthStatus() {
    const userData = localStorage.getItem('fueltracker_user');
    if (userData) {
        currentUser = JSON.parse(userData);
        updateUIForLoggedInUser();
    } else {
        updateUIForLoggedOutUser();
    }
}

function setupAuthForms() {
    // User login form
    const userLoginForm = document.getElementById('user-login-form');
    if (userLoginForm) {
        userLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('user-email').value;
            const password = document.getElementById('user-password').value;
            loginUser(email, password, false);
        });
    }
    
    // User register form
    const userRegisterForm = document.getElementById('user-register-form');
    if (userRegisterForm) {
        userRegisterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('user-name').value;
            const email = document.getElementById('user-email').value;
            const password = document.getElementById('user-password').value;
            registerUser(name, email, password, false);
        });
    }
    
    // Admin login form
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            loginUser(email, password, true);
        });
    }
    
    // Admin register form
    const adminRegisterForm = document.getElementById('admin-register-form');
    if (adminRegisterForm) {
        adminRegisterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const name = document.getElementById('admin-name').value;
            const email = document.getElementById('admin-email').value;
            const password = document.getElementById('admin-password').value;
            registerUser(name, email, password, true);
        });
    }
    
    // Logout buttons
    const logoutBtns = document.querySelectorAll('#logout-btn, #logout-btn-desktop, #logout-btn-mobile');
    logoutBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', function() {
                logout();
            });
        }
    });
}

function loginUser(email, password, isAdmin) {
    // In a real application, this would be an API call to the backend
    // For this demo, we'll use localStorage
    
    // Check if user exists in localStorage
    const users = JSON.parse(localStorage.getItem('fueltracker_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password && u.isAdmin === isAdmin);
    
    if (user) {
        // Store current user in localStorage
        localStorage.setItem('fueltracker_user', JSON.stringify(user));
        currentUser = user;
        
        // Update UI
        updateUIForLoggedInUser();
        
        // Redirect to appropriate page
        if (isAdmin) {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'track.html';
        }
    } else {
        alert('Invalid email or password');
    }
}

function registerUser(name, email, password, isAdmin) {
    // In a real application, this would be an API call to the backend
    // For this demo, we'll use localStorage
    
    // Check if user already exists
    const users = JSON.parse(localStorage.getItem('fueltracker_users') || '[]');
    const userExists = users.some(u => u.email === email);
    
    if (userExists) {
        alert('User with this email already exists');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password,
        isAdmin
    };
    
    // Add user to localStorage
    users.push(newUser);
    localStorage.setItem('fueltracker_users', JSON.stringify(users));
    
    // Log in the new user
    loginUser(email, password, isAdmin);
}

function logout() {
    localStorage.removeItem('fueltracker_user');
    currentUser = null;
    updateUIForLoggedOutUser();
    window.location.href = 'index.html';
}

function updateUIForLoggedInUser() {
    // Update navigation
    const loginLinks = document.querySelectorAll('.login-link');
    const logoutLinks = document.querySelectorAll('.logout-link');
    const userNameElements = document.querySelectorAll('.user-name, .user-name-mobile');
    
    loginLinks.forEach(link => link.style.display = 'none');
    logoutLinks.forEach(link => link.style.display = 'block');
    
    if (currentUser) {
        userNameElements.forEach(el => {
            el.textContent = currentUser.name;
            el.style.display = 'block';
        });
    }
    
    // Show admin panel if admin
    if (isAdmin()) {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => el.style.display = 'block');
    }
}

function updateUIForLoggedOutUser() {
    // Update navigation
    const loginLinks = document.querySelectorAll('.login-link');
    const logoutLinks = document.querySelectorAll('.logout-link');
    const userNameElements = document.querySelectorAll('.user-name, .user-name-mobile');
    const adminElements = document.querySelectorAll('.admin-only');
    
    loginLinks.forEach(link => link.style.display = 'block');
    logoutLinks.forEach(link => link.style.display = 'none');
    userNameElements.forEach(el => el.style.display = 'none');
    adminElements.forEach(el => el.style.display = 'none');
}

function isAdmin() {
    return currentUser && currentUser.isAdmin;
}

// Map functions
function initializeMap() {
    // Check if map element exists
    const mapElement = document.getElementById('map');
    if (!mapElement) {
        console.error('Map element not found');
        return;
    }
    
    // Initialize Leaflet map
    try {
        map = L.map('map').setView([10.8505, 76.2711], 8); // Kerala coordinates
        
        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Ensure map is properly sized
        setTimeout(() => {
            if (map) map.invalidateSize();
        }, 100);
        
        // Load fuel pumps
        loadFuelPumps();
        
        // Add user location marker if geolocation is available
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function(position) {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Add marker for user location
                const userMarker = L.marker([userLat, userLng], {
                    icon: L.divIcon({
                        className: 'user-location-marker',
                        html: '<div style="background-color: blue; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                        iconSize: [16, 16],
                        iconAnchor: [8, 8]
                    })
                }).addTo(map);
                
                userMarker.bindPopup('Your Location').openPopup();
                
                // Center map on user location
                map.setView([userLat, userLng], 12);
            }, function(error) {
                console.log('Error getting location:', error.message);
            });
        }
        
        console.log('Map initialized successfully');
        return true;
    } catch (error) {
        console.error('Error initializing map:', error);
        return false;
    }
}

function setupFuelFilters() {
    const filterPetrol = document.getElementById('filter-petrol');
    const filterDiesel = document.getElementById('filter-diesel');
    const filterPremiumPetrol = document.getElementById('filter-premium-petrol');
    const filterCNG = document.getElementById('filter-cng');
    const filterAll = document.getElementById('filter-all');
    const districtFilter = document.getElementById('district-filter');

    if (filterPetrol) filterPetrol.addEventListener('click', () => applyFilters('petrol'));
    if (filterDiesel) filterDiesel.addEventListener('click', () => applyFilters('diesel'));
    if (filterPremiumPetrol) filterPremiumPetrol.addEventListener('click', () => applyFilters('premium'));
    if (filterCNG) filterCNG.addEventListener('click', () => applyFilters('cng'));
    if (filterAll) filterAll.addEventListener('click', () => applyFilters('all'));
    if (districtFilter) districtFilter.addEventListener('change', () => applyFilters('all'));
}

function applyFilters(fuelType) {
    const selectedDistrict = document.getElementById('district-filter')?.value;
    
    // Start with all pumps
    let filteredPumps = [...originalPumps];
    
    // Always apply district filter first
    if (selectedDistrict && selectedDistrict !== 'all') {
        filteredPumps = filteredPumps.filter(pump => pump.district === selectedDistrict);
    }
    
    // Then apply fuel type filter within the selected district
    if (fuelType !== 'all') {
        filteredPumps = filteredPumps.filter(pump => {
            switch(fuelType) {
                case 'petrol': return pump.petrolAvailable === true;
                case 'diesel': return pump.dieselAvailable === true;
                case 'premium': return pump.premiumPetrolAvailable === true;
                case 'cng': return pump.cngAvailable === true;
                default: return true;
            }
        });
    }
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add new markers only for filtered pumps
    filteredPumps.forEach(pump => {
        addMarkerToMap(pump);
    });
    
    // Update result count with district-specific information
    const resultCount = document.getElementById('result-count');
    if (resultCount) {
        let countMessage = `${filteredPumps.length}`;
        if (selectedDistrict && selectedDistrict !== 'all') {
            countMessage += ` pumps in ${selectedDistrict}`;
            if (fuelType !== 'all') {
                countMessage += ` with ${fuelType} available`;
            }
        } else {
            if (fuelType !== 'all') {
                countMessage += ` pumps with ${fuelType} available`;
            } else {
                countMessage += ' total pumps';
            }
        }
        resultCount.textContent = countMessage;
    }
}

function loadFuelPumps() {
    // In a real application, this would be an API call to the backend
    // For this demo, we'll use localStorage
    fuelPumps = JSON.parse(localStorage.getItem('fueltracker_pumps') || '[]');
    
    // Ensure boolean values are properly set for availability
    fuelPumps = fuelPumps.map(pump => ({
        ...pump,
        petrolAvailable: Boolean(pump.petrolAvailable),
        dieselAvailable: Boolean(pump.dieselAvailable),
        premiumPetrolAvailable: pump.premiumPetrolAvailable !== undefined ? Boolean(pump.premiumPetrolAvailable) : undefined,
        cngAvailable: pump.cngAvailable !== undefined ? Boolean(pump.cngAvailable) : undefined
    }));
    
    originalPumps = [...fuelPumps]; // Store original pumps for filtering
    applyFilters('all'); // Initial load with all filters
}

function addMarkerToMap(pump) {
    // Create custom icon based on fuel availability
    const getMarkerColor = () => {
        if (pump.petrolAvailable && pump.dieselAvailable) return '#28a745';
        if (pump.petrolAvailable) return '#ffc107';
        if (pump.dieselAvailable) return '#17a2b8';
        return '#dc3545';
    };

    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="width: 24px; height: 24px;">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${getMarkerColor()}"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
        </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 24]
    });

    const marker = L.marker([pump.lat, pump.lng], { icon: customIcon }).addTo(map);
    
    // Create tooltip content showing availability
    const tooltipContent = `
        ${pump.name}
        Petrol: ${pump.petrolAvailable ? '✓' : '✗'}
        Diesel: ${pump.dieselAvailable ? '✓' : '✗'}
        ${pump.premiumPetrolAvailable !== undefined ? `Premium: ${pump.premiumPetrolAvailable ? '✓' : '✗'}` : ''}
        ${pump.cngAvailable !== undefined ? `CNG: ${pump.cngAvailable ? '✓' : '✗'}` : ''}
    `;
    marker.bindTooltip(tooltipContent);
    
    // Create detailed popup content
    const popupContent = `
        <div class="pump-popup">
            <h3>${pump.name}</h3>
            <p><strong>Address:</strong> ${pump.address}</p>
            <p><strong>District:</strong> ${pump.district}</p>
            <p><strong>Petrol Price:</strong> ₹${pump.petrolPrice}/L</p>
            <p><strong>Diesel Price:</strong> ₹${pump.dieselPrice}/L</p>
            ${pump.premiumPetrolPrice ? `<p><strong>Premium Petrol Price:</strong> ₹${pump.premiumPetrolPrice}/L</p>` : ''}
            ${pump.cngPrice ? `<p><strong>CNG Price:</strong> ₹${pump.cngPrice}/kg</p>` : ''}
            <p><strong>Petrol Available:</strong> <span class="${pump.petrolAvailable ? 'available' : 'unavailable'}">${pump.petrolAvailable ? 'Yes' : 'No'}</span></p>
            <p><strong>Diesel Available:</strong> <span class="${pump.dieselAvailable ? 'available' : 'unavailable'}">${pump.dieselAvailable ? 'Yes' : 'No'}</span></p>
            ${pump.premiumPetrolAvailable !== undefined ? `<p><strong>Premium Petrol Available:</strong> <span class="${pump.premiumPetrolAvailable ? 'available' : 'unavailable'}">${pump.premiumPetrolAvailable ? 'Yes' : 'No'}</span></p>` : ''}
            ${pump.cngAvailable !== undefined ? `<p><strong>CNG Available:</strong> <span class="${pump.cngAvailable ? 'available' : 'unavailable'}">${pump.cngAvailable ? 'Yes' : 'No'}</span></p>` : ''}
            ${pump.cardPayment !== undefined || pump.upiPayment !== undefined ? `<p><strong>Payment Methods:</strong> ${[pump.cardPayment ? 'Card' : '', pump.upiPayment ? 'UPI' : ''].filter(Boolean).join(', ') || 'None'}</p>` : ''}
            <p><strong>Last Updated:</strong> ${new Date(pump.lastUpdated).toLocaleString()}</p>
        </div>
    `;
    
    marker.bindPopup(popupContent);
    markers.push(marker);
}

// Admin functions
function setupAdminPanel() {
    console.log('Setting up admin panel');
    
    // Show admin panel
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'block';
        console.log('Admin panel display set to block');
    }
    
    // Setup fuel pump form
    const pumpForm = document.getElementById('pump-form');
    if (pumpForm) {
        console.log('Pump form found, setting up event listener');
        
        // Remove existing event listeners to prevent duplicates
        const newPumpForm = pumpForm.cloneNode(true);
        pumpForm.parentNode.replaceChild(newPumpForm, pumpForm);
        
        newPumpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            console.log('Pump form submitted');
            saveFuelPump();
        });

        // Make sure the cancel button works
        const cancelBtn = document.getElementById('cancel-pump');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('pump-form').reset();
                document.getElementById('pump-id').value = '';
                document.getElementById('pump-form-container').style.display = 'none';
            });
        }
    } else {
        console.log('Pump form not found');
    }
    
    // Setup pump list
    loadPumpList();
    
    // Setup add pump button
    const addPumpBtn = document.getElementById('add-pump-btn');
    if (addPumpBtn) {
        addPumpBtn.addEventListener('click', function() {
            // Reset form
            document.getElementById('pump-form').reset();
            document.getElementById('pump-id').value = '';
            document.getElementById('pump-form-container').style.display = 'block';
        });
    }
    
    // Setup admin map controls
    if (map) {
        setupAdminMapControls();
        console.log('Admin map controls setup complete');
    } else {
        console.error('Map is not initialized, cannot setup admin map controls');
        // Try to initialize map again
        if (document.getElementById('map')) {
            console.log('Attempting to initialize map again');
            initializeMap();
            if (map) {
                setupAdminMapControls();
            }
        }
    }
    
    // Setup tab switching
    const tabs = document.querySelectorAll('.admin-panel .tab');
    const tabContents = document.querySelectorAll('.admin-panel .tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Add active class to current tab and content
            this.classList.add('active');
            document.getElementById(tabId + '-tab').classList.add('active');
            
            // If switching to map tab, refresh the map
            if (tabId === 'map' && map) {
                map.invalidateSize();
            }
        });
    });
}

function saveFuelPump() {
    console.log('Saving fuel pump');
    
    try {
        // Check if user is admin
        if (!isAdmin()) {
            alert('Only administrators can add or edit fuel pumps');
            return;
        }

        // Get form values
        const name = document.getElementById('pump-name').value;
        const address = document.getElementById('pump-address').value;
        const district = document.getElementById('pump-district').value;
        const lat = parseFloat(document.getElementById('pump-lat').value || 0);
        const lng = parseFloat(document.getElementById('pump-lng').value || 0);
        const petrolPrice = parseFloat(document.getElementById('pump-petrol-price').value || 0);
        const dieselPrice = parseFloat(document.getElementById('pump-diesel-price').value || 0);
        const petrolAvailable = document.getElementById('pump-petrol-available')?.checked || false;
        const dieselAvailable = document.getElementById('pump-diesel-available')?.checked || false;
        
        // Get new field values with fallbacks
        const premiumPetrolPrice = document.getElementById('pump-premium-petrol-price')?.value ? 
            parseFloat(document.getElementById('pump-premium-petrol-price').value) : null;
        const cngPrice = document.getElementById('pump-cng-price')?.value ? 
            parseFloat(document.getElementById('pump-cng-price').value) : null;
        const premiumPetrolAvailable = document.getElementById('pump-premium-petrol-available')?.checked || false;
        const cngAvailable = document.getElementById('pump-cng-available')?.checked || false;
        const cardPayment = document.getElementById('pump-card-payment')?.checked || false;
        const upiPayment = document.getElementById('pump-upi-payment')?.checked || false;
        
        // Validate required fields
        if (!name || !address || !district) {
            alert('Please fill in all required fields (Name, Address, District)');
            return;
        }
        
        // Create pump object with owner information
        const pump = {
            id: document.getElementById('pump-id').value || Date.now().toString(),
            name,
            address,
            district,
            lat,
            lng,
            petrolPrice,
            dieselPrice,
            petrolAvailable,
            dieselAvailable,
            premiumPetrolPrice,
            premiumPetrolAvailable,
            cngPrice,
            cngAvailable,
            cardPayment,
            upiPayment,
            lastUpdated: new Date().toISOString(),
            ownerId: currentUser.id // Add owner ID to the pump
        };
        
        console.log('Pump object created:', pump);
        
        // Save to localStorage
        const pumps = JSON.parse(localStorage.getItem('fueltracker_pumps') || '[]');
        const existingPumpIndex = pumps.findIndex(p => p.id === pump.id);
        
        if (existingPumpIndex >= 0) {
            // Update existing pump
            pumps[existingPumpIndex] = pump;
            console.log('Updated existing pump');
        } else {
            // Add new pump
            pumps.push(pump);
            console.log('Added new pump');
        }
        
        localStorage.setItem('fueltracker_pumps', JSON.stringify(pumps));
        console.log('Pumps saved to localStorage');
        
        // Reload pumps on map
        loadFuelPumps();
        
        // Reload pump list
        loadPumpList();
        
        // Reset form
        document.getElementById('pump-form').reset();
        document.getElementById('pump-id').value = '';
        document.getElementById('pump-form-container').style.display = 'none';
        
        alert('Fuel pump saved successfully!');
    } catch (error) {
        console.error('Error saving fuel pump:', error);
        alert('Error saving fuel pump: ' + error.message);
    }
}

function setupAdminMapControls() {
    // Check if map is initialized
    if (!map) {
        console.error('Map is not initialized yet');
        return;
    }
    
    console.log('Setting up admin map controls');
    
    // Add instructions for admin
    const mapTab = document.getElementById('map-tab');
    if (mapTab) {
        // Check if instructions already exist to avoid duplicates
        if (!mapTab.querySelector('.admin-instructions')) {
            const instructions = document.createElement('div');
            instructions.className = 'admin-instructions';
            instructions.innerHTML = `
                <p><strong>How to add a new petrol pump:</strong></p>
                <ol>
                    <li>Click on the map at the location of your petrol pump</li>
                    <li>Fill in the details in the form that appears</li>
                    <li>Click "Save Petrol Pump" to add it to the map</li>
                </ol>
            `;
            const mapElement = document.getElementById('map');
            if (mapElement) {
                mapTab.insertBefore(instructions, mapElement);
            }
        }
    }
    
    // Create a temporary marker for new pump location
    let tempMarker = null;
    
    // Remove existing click event listeners to prevent duplicates
    map.off('click');
    
    // Enable clicking on map to set location
    map.on('click', function(e) {
        console.log('Map clicked at:', e.latlng);
        
        // Set lat/lng in form
        const latInput = document.getElementById('pump-lat');
        const lngInput = document.getElementById('pump-lng');
        
        if (latInput && lngInput) {
            latInput.value = e.latlng.lat;
            lngInput.value = e.latlng.lng;
            
            // Remove previous temporary marker if exists
            if (tempMarker) {
                map.removeLayer(tempMarker);
            }
            
            // Add temporary marker at clicked location
            tempMarker = L.marker([e.latlng.lat, e.latlng.lng], {
                icon: L.divIcon({
                    className: 'new-pump-marker',
                    html: '<div style="background-color: #ff9800; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
                    iconSize: [16, 16],
                    iconAnchor: [8, 8]
                })
            }).addTo(map);
            
            tempMarker.bindPopup('New Petrol Pump Location').openPopup();
            
            // Show form
            const formContainer = document.getElementById('pump-form-container');
            if (formContainer) {
                formContainer.style.display = 'block';
                console.log('Pump form container displayed');
            } else {
                console.error('Pump form container not found');
            }
        } else {
            console.error('Lat/Lng inputs not found');
        }
    });
    
    // Add cancel button functionality
    const cancelBtn = document.getElementById('cancel-pump');
    if (cancelBtn) {
        // Remove existing event listeners to prevent duplicates
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newCancelBtn.addEventListener('click', function() {
            // Remove temporary marker
            if (tempMarker) {
                map.removeLayer(tempMarker);
                tempMarker = null;
            }
            
            // Hide form
            const pumpForm = document.getElementById('pump-form');
            const pumpIdInput = document.getElementById('pump-id');
            const formContainer = document.getElementById('pump-form-container');
            
            if (pumpForm) pumpForm.reset();
            if (pumpIdInput) pumpIdInput.value = '';
            if (formContainer) formContainer.style.display = 'none';
        });
    }
}

function loadPumpList() {
    const pumpList = document.getElementById('pump-list');
    if (!pumpList) return;
    
    pumpList.innerHTML = '';
    
    const pumps = JSON.parse(localStorage.getItem('fueltracker_pumps') || '[]');
    
    // Filter pumps to show only those owned by current admin
    const userPumps = pumps.filter(pump => pump.ownerId === currentUser.id);
    
    userPumps.forEach(pump => {
        const item = document.createElement('div');
        item.className = 'pump-item';
        
        // Format the last updated date
        const lastUpdated = new Date(pump.lastUpdated).toLocaleString();
        
        // Create a more detailed pump item with availability indicators
        item.innerHTML = `
            <div class="pump-info">
                <h3>${pump.name}</h3>
                <p><strong>District:</strong> ${pump.district}</p>
                <p><strong>Address:</strong> ${pump.address}</p>
                <p><strong>Petrol:</strong> ₹${pump.petrolPrice}/L <span class="availability ${pump.petrolAvailable ? 'available' : 'unavailable'}">${pump.petrolAvailable ? 'Available' : 'Unavailable'}</span></p>
                <p><strong>Diesel:</strong> ₹${pump.dieselPrice}/L <span class="availability ${pump.dieselAvailable ? 'available' : 'unavailable'}">${pump.dieselAvailable ? 'Available' : 'Unavailable'}</span></p>
                ${pump.premiumPetrolPrice ? `<p><strong>Premium Petrol:</strong> ₹${pump.premiumPetrolPrice}/L <span class="availability ${pump.premiumPetrolAvailable ? 'available' : 'unavailable'}">${pump.premiumPetrolAvailable ? 'Available' : 'Unavailable'}</span></p>` : ''}
                ${pump.cngPrice ? `<p><strong>CNG:</strong> ₹${pump.cngPrice}/kg <span class="availability ${pump.cngAvailable ? 'available' : 'unavailable'}">${pump.cngAvailable ? 'Available' : 'Unavailable'}</span></p>` : ''}
                <p><strong>Payment Methods:</strong> ${[pump.cardPayment ? 'Card' : '', pump.upiPayment ? 'UPI' : ''].filter(Boolean).join(', ') || 'None'}</p>
                <p><strong>Last Updated:</strong> ${lastUpdated}</p>
            </div>
            <div class="pump-actions">
                <button class="edit-pump" data-id="${pump.id}">Edit</button>
                <button class="delete-pump" data-id="${pump.id}">Delete</button>
            </div>
        `;
        
        pumpList.appendChild(item);
    });
    
    // Add event listeners to buttons
    document.querySelectorAll('.edit-pump').forEach(button => {
        button.addEventListener('click', function() {
            editPump(this.getAttribute('data-id'));
        });
    });
    
    document.querySelectorAll('.delete-pump').forEach(button => {
        button.addEventListener('click', function() {
            deletePump(this.getAttribute('data-id'));
        });
    });
}

function editPump(pumpId) {
    const pumps = JSON.parse(localStorage.getItem('fueltracker_pumps') || '[]');
    const pump = pumps.find(p => p.id === pumpId);
    
    // Check if pump exists and belongs to current admin
    if (!pump || pump.ownerId !== currentUser.id) {
        alert('You can only edit your own fuel pumps');
        return;
    }
    
    if (pump) {
        // Fill form with pump data
        document.getElementById('pump-id').value = pump.id;
        document.getElementById('pump-name').value = pump.name;
        document.getElementById('pump-address').value = pump.address;
        document.getElementById('pump-district').value = pump.district;
        document.getElementById('pump-lat').value = pump.lat;
        document.getElementById('pump-lng').value = pump.lng;
        document.getElementById('pump-petrol-price').value = pump.petrolPrice;
        document.getElementById('pump-diesel-price').value = pump.dieselPrice;
        document.getElementById('pump-petrol-available').checked = pump.petrolAvailable;
        document.getElementById('pump-diesel-available').checked = pump.dieselAvailable;
        
        // Load premium petrol, CNG, and payment method values
        if (pump.premiumPetrolPrice !== undefined) {
            document.getElementById('pump-premium-petrol-price').value = pump.premiumPetrolPrice || '';
        }
        if (pump.cngPrice !== undefined) {
            document.getElementById('pump-cng-price').value = pump.cngPrice || '';
        }
        if (pump.premiumPetrolAvailable !== undefined) {
            document.getElementById('pump-premium-petrol-available').checked = pump.premiumPetrolAvailable;
        }
        if (pump.cngAvailable !== undefined) {
            document.getElementById('pump-cng-available').checked = pump.cngAvailable;
        }
        if (pump.cardPayment !== undefined) {
            document.getElementById('pump-card-payment').checked = pump.cardPayment;
        }
        if (pump.upiPayment !== undefined) {
            document.getElementById('pump-upi-payment').checked = pump.upiPayment;
        }
        
        // Show form
        document.getElementById('pump-form-container').style.display = 'block';
    }
}

function deletePump(pumpId) {
    const pumps = JSON.parse(localStorage.getItem('fueltracker_pumps') || '[]');
    const pump = pumps.find(p => p.id === pumpId);
    
    // Check if pump exists and belongs to current admin
    if (!pump || pump.ownerId !== currentUser.id) {
        alert('You can only delete your own fuel pumps');
        return;
    }
    
    if (confirm('Are you sure you want to delete this fuel pump?')) {
        const updatedPumps = pumps.filter(p => p.id !== pumpId);
        localStorage.setItem('fueltracker_pumps', JSON.stringify(updatedPumps));
        loadFuelPumps();
        loadPumpList();
    }
}

// Filter functions for user interface
function filterPumpsByDistrict(district) {
    // Use the original pumps for filtering
    const allPumps = originalPumps;
    
    // If district is 'all', show all pumps
    if (district === 'all') {
        fuelPumps = allPumps;
    } else {
        // Filter pumps by district
        fuelPumps = allPumps.filter(pump => pump.district === district);
    }
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add markers for each filtered fuel pump
    fuelPumps.forEach(pump => {
        addMarkerToMap(pump);
    });
    
    // Update UI to show filtered results
    const resultCount = document.getElementById('result-count');
    if (resultCount) {
        resultCount.textContent = fuelPumps.length;
    }
}

function filterPumpsByFuelType(fuelType, available) {
    // Use the original pumps for filtering
    const allPumps = originalPumps;
    
    // Filter pumps by fuel type and availability
    if (fuelType === 'petrol') {
        fuelPumps = available ? allPumps.filter(pump => pump.petrolAvailable) : allPumps;
    } else if (fuelType === 'diesel') {
        fuelPumps = available ? allPumps.filter(pump => pump.dieselAvailable) : allPumps;
    } else {
        fuelPumps = allPumps;
    }
    
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
    
    // Add markers for each filtered fuel pump
    fuelPumps.forEach(pump => {
        addMarkerToMap(pump);
    });
    
    // Update UI to show filtered results
    const resultCount = document.getElementById('result-count');
    if (resultCount) {
        resultCount.textContent = fuelPumps.length;
    }
}