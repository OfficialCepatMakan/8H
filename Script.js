''
  // Initialize Firebase
  const app = firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  const provider = new firebase.auth.GoogleAuthProvider();

  console.log("script loaded")

  function logsales(method, name, quantity, price) {
    const logId = Date.now(); // Unique ID (timestamp)

    database.ref('sales_logs/' + logId).set({
      paymentMethod: method,
      productName: name,
      quantity: quantity,
      price: price,
      total: price * quantity,
      date: new Date().toISOString()
    })
    .then(() => {
      console.log("Sales log saved!");
    })
    .catch((error) => {
      console.error("Error saving log:", error);
    });
  }

  
  function checkLoginInfo(callback) { 
    callback(); // call the passed-in function
  }

  function openAdmin() {
    document.getElementById('adminPanel').style.display = 'block';
    renderAdminProducts(); // Render admin products list when admin logs in
  }

  function saveProduct() {
    const name = document.getElementById('newName').value;
    const price = parseFloat(document.getElementById('newPrice').value);
    const image = document.getElementById('newImage').value;

    if (!name || !price) {
      alert("Please enter all fields.");
      return;
    }

    // Save to Firebase
    const productId = Date.now(); // unique ID
    firebase.database().ref('products/' + productId).set({
      name: name,
      price: parseFloat(price)
    }).then(() => {
      alert("Product saved!");
    }).catch((error) => {
      console.error("Error saving product:", error);
    });
  }
  let products = JSON.parse(localStorage.getItem('products')) || [
    { name: 'Fidget Spinner', price: 50000, image: 'https://via.placeholder.com/150' },
    { name: 'Fidget Cube', price: 70000, image: 'https://via.placeholder.com/150' },
    { name: 'Stress Ball', price: 40000, image: 'https://via.placeholder.com/150' }
  ];
  let cart = [];
  let discount = parseFloat(localStorage.getItem('discount')) || 0;
  let fee = parseFloat(localStorage.getItem('fee')) || 0;
  const ADMIN_PASS = 'playdots123';
  let systemLog = JSON.parse(localStorage.getItem('systemLog')) || [];
  let cashierNotes = localStorage.getItem('cashierNotes') || '';

  // Load cashier notes
  async function loadProductsFromFirebase() {
    const snapshot = await firebase.database().ref('products').once('value');
    const data = snapshot.val();
    
    products = [];
  
    if (data) {
      for (const id in data) {
        products.push({
          id,
          ...data[id]
        });
      }
    }
  
    renderProducts();  // Call your render function after loading
  }
  
  async function renderProducts() {
    const cont = document.getElementById('productsContainer');
    cont.innerHTML = ''; // Clear previous products

    try {
      const snapshot = await firebase.database().ref('products').once('value');
      const productsData = snapshot.val();

      if (productsData) {
        for (const id in productsData) {
          const product = productsData[id];
          const priceFormatted = product.price.toLocaleString('id-ID', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });

          const d = document.createElement('div');
          console.log('Price value:', product.price, 'Type:', typeof product.price);
          console.log(priceFormatted);
          d.className = 'product';
          d.innerHTML = `
            <img src="${product.image}" alt="${product.name}" />
            <h4>${product.name}</h4>
            <p>Rp ${priceFormatted}</p>
            <button onclick="addToCart('${id}')">Add to Cart</button>
          `;
          cont.appendChild(d);
        }
      } else {
        cont.innerHTML = '<p>No products available.</p>';
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      cont.innerHTML = '<p>Error loading products.</p>';
    }
  }

  
  function renderAdminProducts() {
    const adminProducts = document.getElementById('adminProducts');
    adminProducts.innerHTML = ''; // Clear current products in admin panel

    // Fetch the products from Firebase
    const productsRef = database.ref('products');
    productsRef.once('value')
      .then(snapshot => {
        if (snapshot.exists()) {
          const products = snapshot.val(); // Get all products

          // Loop through the products and create the UI
          Object.keys(products).forEach((key, i) => {
            const p = products[key]; // Access product data by its key
            const productDiv = document.createElement('div');
            productDiv.className = 'product';
            productDiv.innerHTML = `
              <h4>${p.name}</h4>
              <p>Price: Rp ${p.price}</p>
              <button onclick="deleteProduct('${key}')">Delete Product</button>
            `;
            adminProducts.appendChild(productDiv);
          });
        } else {
          adminProducts.innerHTML = '<p>No products available.</p>';
        }
      })
      .catch(error => {
        console.error('Error fetching products:', error);
      });
  }


  function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
      // Delete the product from Firebase
      const productRef = database.ref('products/' + productId);
      productRef.remove()
        .then(() => {
          console.log('Product deleted successfully');
          renderAdminProducts(); // Re-render the admin panel after deletion
        })
        .catch(error => {
          console.error('Error deleting product:', error);
        });
    }
  }


  function saveNotes() {
    const notes = document.getElementById('cashierNotes').value;
    database.ref('cashierNotes').set(notes)
      .then(() => {
        alert('Notes saved to Firebase!');
      })
      .catch((error) => {
        console.error('Error saving notes:', error);
        alert('Failed to save notes.');
      });
  }

  function loadNotes() {
    database.ref('cashierNotes').once('value')
      .then(snapshot => {
        const notes = snapshot.val();
        if (notes) {
          document.getElementById('cashierNotes').value = notes;
        } else {
          document.getElementById('cashierNotes').value = ''; // If no notes, clear it
        }
      })
      .catch(error => {
        console.error('Error loading notes:', error);
      });
  }
  
  
  function renderCart() {
    const cont = document.getElementById('cartContainer');
    cont.innerHTML = ''; // Clear current cart items

    if (cart.length > 0) {
      cont.parentElement.querySelector('.cart').classList.add('shrink');
    } else {
      cont.parentElement.querySelector('.cart').classList.remove('shrink');
    }

    // Loop through each item in the cart and display it
    cart.forEach((item, i) => {
      const d = document.createElement('div');
      d.className = 'cart-item';
      d.innerHTML = `
        <span style="width: 80%;">${item.name} Rp ${item.price.toLocaleString('id-ID')} x ${item.qty} = Rp ${(item.price * item.qty).toLocaleString('id-ID')}</span>
        <span style="width: 5%; text-align: center;"><button onclick="changeQty(${i},-1)">–</button></span>
        <span style="width: 5%; text-align: center;"><p>${item.qty}</p></span>
        <span style="width: 5%; text-align: center;"><button onclick="changeQty(${i},+1)">+</button></span>
        <span style="width: 5%; text-align: center;"><button onclick="removeCart(${i})">✕</button></span>
      `;
      cont.appendChild(d);
    });

    updateTotals(); // Update the totals after rendering
  }


  function updateTotals(){
    const sub = cart.reduce((a,i)=>a + i.price*i.qty, 0);
    document.getElementById('subtotalDisplay').innerText = 'Rp ' + sub.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('discountDisplay').innerText = discount + '%';
    document.getElementById('feeDisplay').innerText = fee.toFixed(2);
    const final = sub*(1 - discount/100) + fee;
    document.getElementById('finalTotalDisplay').innerText = 'Rp ' + final.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const billingBox = document.querySelector('.billing-container');
    const carttext = document.querySelector('.cart-text');
    billingBox.style.display = sub > 0 ? 'flex' : 'none';
    carttext.style.display = sub > 0 ? 'flex' : 'none';
  }

  function addToCart(productId) {
    const productRef = database.ref("products/" + productId);
    productRef.once("value")
      .then(snapshot => {
        if (snapshot.exists()) {
          const product = snapshot.val();
          console.log(product);
          
          // Check if the item already exists in the cart
          const index = cart.findIndex(cartItem => cartItem.id === productId);
          if (index !== -1) {
            cart[index].qty += 1; // If it exists, increase quantity
          } else {
            cart.push({...product, qty: 1}); // If it doesn't exist, add it with qty 1
          }
    
          console.log(cart); // Debugging: log the cart after adding the item
          renderCart(); // Re-render the cart to reflect the new item
        } else {
          console.error("Product not found!");
        }
      })
      .catch(error => {
        console.error("Error getting product:", error);
      });
  }  

  function changeQty(i,delta){
    cart[i].qty += delta;
    if(cart[i].qty<1) cart.splice(i,1);
    renderCart();
  }

  function removeCart(i){
    cart.splice(i,1); renderCart();
  }

  function checkout(method){
    cart.forEach((item, i) => {
      logsales(method, item.name, item.qty, item.price);
    });
    if (method === "QRIS"){
      document.getElementById('Qris').style.display = 'flex';
      cart = [];          // Clear the cart array
      renderCart();
    } else {
      alert('Payment recorded')
      cart = [];          // Clear the cart array
      renderCart();
    }
  }

  function closeQris(){
    document.getElementById('Qris').style.display = 'none';
  }

  function calculateChange() {
    const bill = parseFloat(document.getElementById('billAmount').value);
    
    // Get total text and clean it (remove "Rp", commas, and periods if needed)
    const totalText = document.getElementById('finalTotalDisplay').innerText;
    const totalClean = totalText.replace(/[^\d.-]/g, ''); // Remove "Rp" and any commas
    const total = parseFloat(totalClean);
    console.log(totalClean, bill, bill - (totalClean * 1000))
    if (isNaN(bill)) {
      return alert('Please enter a valid bill amount');
    }
  
    const change = bill - (totalClean * 1000);
    document.getElementById('changeDisplay').innerText = change.toLocaleString('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    });
  }  

  function showAdminPassword() {
    document.getElementById('pwPrompt').style.display = 'block';
  }

  function hidePasswordPrompt() {
    document.getElementById('pwPrompt').style.display = 'none';
  }

  function checkAdminPass() {
    const pass = document.getElementById('adminPassInput').value;
    if (pass === ADMIN_PASS) {
      document.getElementById('pwPrompt').style.display = 'none';
      document.getElementById('adminPanel').style.display = 'block';
      renderAdminProducts(); // Render admin products list when admin logs in
    } else {
      alert('Incorrect password!');
    }
  }

  function closeAdmin() {
    document.getElementById('adminPanel').style.display = 'none';
  }

  function adminAddProduct() {
    const name = document.getElementById('newName').value;
    const price = parseFloat(document.getElementById('newPrice').value);
    const image = document.getElementById('newImage').value;

    if (!name || isNaN(price) || !image) {
      alert('Please enter all fields');
      return;
    }

    const newProduct = { name, price, image };
    products.push(newProduct);
    localStorage.setItem('products', JSON.stringify(products)); // Update localStorage
    // Save to Firebase
    const productId = Date.now(); // unique ID
    firebase.database().ref('products/' + productId).set({
      name: name,
      price: parseFloat(price),
      image: image
    }).then(() => {
      alert("Product saved!");
    }).catch((error) => {
      console.error("Error saving product:", error);
    });
    renderProducts(); // Re-render products
    renderAdminProducts(); // Re-render admin panel product list
  }

  renderProducts();
