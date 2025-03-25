import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import PromotionsCarousel from './PromotionsCarousel';
import './MenuDisplay.css';

function MenuDisplay() {
  const { currentUser } = useUser();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [advertisements, setAdvertisements] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adError, setAdError] = useState(null);

  useEffect(() => {
    if (currentUser) {
      fetchMenuItems();
      fetchAdvertisements();
    } else {
      setMenuItems([]);
      setAdvertisements([]);
      setLoading(false);
    }
  }, [currentUser]);

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
      setError('Failed to load menu items');
      setLoading(false);
    }
  };

  const fetchAdvertisements = async () => {
    try {
      console.log('Fetching advertisements...');
      // Use the public advertisements endpoint with the current user's ID
      const response = await axios.get(`http://localhost:5001/api/public/advertisements/${currentUser.id}`);
      console.log('Advertisements received:', response.data);
      setAdvertisements(response.data);
      setAdError(null);
    } catch (error) {
      console.error('Error fetching advertisements:', error);
      setAdError('Failed to load advertisements');
    }
  };

  // Rotate through advertisements every 20 seconds
  useEffect(() => {
    if (advertisements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentAdIndex(prevIndex => (prevIndex + 1) % advertisements.length);
    }, 20000); // 20 seconds

    return () => clearInterval(interval);
  }, [advertisements]);

  // Get unique categories
  const categories = ['all', ...new Set(menuItems.map(item => item.category))];

  // Filter items by category
  const filteredItems = activeCategory === 'all'
    ? menuItems.filter(item => item.available)
    : menuItems.filter(item => item.category === activeCategory && item.available);

  if (loading) {
    return <div>Loading menu items...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="menu-display-container">
      {/* Left section - Advertisement Carousel (1/3 width) */}
      <div className="advertisement-section">
        <h2>Special Offers</h2>
        {adError ? (
          <div className="error-message">{adError}</div>
        ) : advertisements.length > 0 ? (
          <div className="advertisement-carousel">
            <div className="advertisement-image-container">
              <img
                src={`http://localhost:5001${advertisements[currentAdIndex].imageUrl}`}
                alt={advertisements[currentAdIndex].title}
                className="advertisement-image"
              />
              {advertisements.length > 1 && (
                <div className="advertisement-indicators">
                  {advertisements.map((_, index) => (
                    <span
                      key={index}
                      className={`indicator ${index === currentAdIndex ? 'active' : ''}`}
                      onClick={() => setCurrentAdIndex(index)}
                    ></span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="advertisement-placeholder">
            <p>No advertisements available</p>
          </div>
        )}
      </div>

      {/* Right section container (2/3 width) */}
      <div className="right-section">
        {/* Top right - Promotions Carousel */}
        <div className="promotions-section">
          <PromotionsCarousel />
        </div>

        {/* Bottom right - Menu Items */}
        <div className="menu-items-section">
          <h2>Menu Items</h2>
          <div className="menu-grid">
            {filteredItems.map(item => (
              <div key={item._id} className="menu-item">
                {item.imageUrl && (
                  <div className="menu-item-image">
                    <img 
                      src={`http://localhost:5001${item.imageUrl}`}
                      alt={item.name}
                    />
                  </div>
                )}
                <div className="menu-item-details">
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <p className="price">${item.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MenuDisplay;