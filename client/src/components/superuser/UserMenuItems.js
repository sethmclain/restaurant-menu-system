import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddMenuItemForm from './AddMenuItemForm';

function UserMenuItems({ userId }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchMenuItems();
  }, [userId]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`http://localhost:5001/api/superuser/users/${userId}/menu-items`, {
        headers: { 'x-auth-token': token }
      });
      
      setMenuItems(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      setError(error.response?.data?.message || 'Error fetching menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(`http://localhost:5001/api/superuser/menu-items/${itemId}`, {
        headers: { 'x-auth-token': token }
      });
      
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      setError(error.response?.data?.message || 'Error deleting menu item');
    }
  };

  if (loading) return <div className="loading">Loading menu items...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="user-menu-items">
      <div className="section-header">
        <h3>Menu Items</h3>
        <button 
          className="add-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Menu Item'}
        </button>
      </div>
      
      {showAddForm && (
        <AddMenuItemForm 
          userId={userId} 
          onItemAdded={() => {
            fetchMenuItems();
            setShowAddForm(false);
          }} 
        />
      )}
      
      {menuItems.length === 0 ? (
        <p>No menu items found for this restaurant.</p>
      ) : (
        <div className="menu-items-grid">
          {menuItems.map(item => (
            <div key={item._id} className="menu-item-card">
              <h4>{item.name}</h4>
              <p className="description">{item.description}</p>
              <p className="price">${item.price.toFixed(2)}</p>
              <p className="category">Category: {item.category}</p>
              <p className="status">Status: {item.available ? 'Available' : 'Unavailable'}</p>
              {item.imageUrl && (
                <img 
                  src={`http://localhost:5001${item.imageUrl}`} 
                  alt={item.name} 
                  className="menu-item-image"
                />
              )}
              <button 
                className="delete-button"
                onClick={() => handleDeleteMenuItem(item._id)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserMenuItems;