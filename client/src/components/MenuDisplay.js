import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './MenuDisplay.css';

function MenuDisplay() {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
      fetchMenuItems();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchMenuItems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/menu-items', {
        headers: {
          'x-auth-token': token
        }
      });
      setMenuItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        navigate('/admin');
      }
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5001/api/auth/login', {
        email,
        password
      });

      // Check if user is a superuser
      if (response.data.user.role === 'superuser') {
        setError('Superusers cannot access the menu display.');
        return;
      }

      localStorage.setItem('token', response.data.token);
      setIsAuthenticated(true);
      fetchMenuItems();
    } catch (error) {
      console.error('Login error:', error);
      setError(error.response?.data?.message || 'Login failed. Please try again.');
    }
  };

  // Get unique categories
  const categories = ['all', ...new Set(menuItems.map(item => item.category))];

  // Filter items by category
  const filteredItems = activeCategory === 'all'
    ? menuItems.filter(item => item.available)
    : menuItems.filter(item => item.category === activeCategory && item.available);

  if (!isAuthenticated) {
    return (
      <div className="menu-display">
        <div className="login-container">
          <h1>Menu Display Login</h1>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            {error && <p className="error-message">{error}</p>}
            <button type="submit" className="login-button">Login</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="menu-display">
      <header>
        <h1>Menu Items</h1>
      </header>

      <div className="category-filter">
        {categories.map(category => (
          <button
            key={category}
            className={activeCategory === category ? 'active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="loading">Loading menu...</p>
      ) : filteredItems.length === 0 ? (
        <p className="no-items">No menu items available in this category.</p>
      ) : (
        <div className="menu-grid">
          {filteredItems.map(item => (
            <div key={item._id} className="menu-item-card">
              <div className="menu-item-content">
                <h2>{item.name}</h2>
                <p className="description">{item.description}</p>
                <p className="price">${item.price.toFixed(2)}</p>
                {item.imageUrl && (
                  <img 
                    src={`http://localhost:5001${item.imageUrl}`} 
                    alt={item.name} 
                    className="menu-item-image"
                    onError={(e) => {
                      e.target.src = 'placeholder-image.jpg';
                      e.target.onerror = null;
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MenuDisplay;