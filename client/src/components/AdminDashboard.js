import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';
import PromotionManager from './PromotionManager';

function AdminDashboard() {
  const [menuItems, setMenuItems] = useState([]);
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main',
    available: true
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/admin');
      return;
    }
    fetchMenuItems();
  }, [navigate]);

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/admin');
        return;
      }
      const response = await axios.get('http://localhost:5001/api/menu-items', {
        headers: { 'x-auth-token': token }
      });
      setMenuItems(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      if (error.response?.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        navigate('/admin');
      } else {
        setError(error.response?.data?.message || 'Error fetching menu items');
      }
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewItem({
      ...newItem,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  const handleImageChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (selectedFile) {
      // Check file type
      if (!selectedFile.type.match('image/jpeg') && 
          !selectedFile.type.match('image/jpg') && 
          !selectedFile.type.match('image/png')) {
        setError('Please select a valid image file (JPEG, JPG, or PNG)');
        return;
      }
      
      // Check file size (5MB max)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }
      
      setImage(selectedFile);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(selectedFile);
      
      setError(null);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/admin');
        return;
      }
  
      // Create FormData object for file upload
      const formData = new FormData();
      formData.append('name', newItem.name);
      formData.append('description', newItem.description);
      formData.append('price', parseFloat(newItem.price));
      formData.append('category', newItem.category);
      formData.append('available', newItem.available);
      
      // image if one was selected
      if (image) {
        formData.append('image', image);
      }
      
      await axios.post('http://localhost:5001/api/menu-items', formData, {
        headers: { 
          'x-auth-token': token
          // Don't set Content-Type here, it will be set automatically
        }
      });
      
      setNewItem({
        name: '',
        description: '',
        price: '',
        category: 'main',
        available: true
      });
      setImage(null);
      setPreviewUrl('');
      
      fetchMenuItems();
      setError(null);
    } catch (error) {
      console.error('Error adding menu item:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/admin');
      } else {
        setError(error.response?.data?.message || 'Error adding menu item');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/admin');
          return;
        }
        await axios.delete(`http://localhost:5001/api/menu-items/${id}`, {
          headers: { 'x-auth-token': token }
        });
        fetchMenuItems();
        setError(null);
      } catch (error) {
        console.error('Error deleting menu item:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/admin');
        } else {
          setError(error.response?.data?.message || 'Error deleting menu item');
        }
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin');
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Restaurant Menu Dashboard</h1>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="dashboard-container">
        <div className="form-section">
          <h2>New Menu Item</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name</label>
              <input 
                type="text" 
                name="name" 
                value={newItem.name} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea 
                name="description" 
                value={newItem.description} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Price ($)</label>
              <input 
                type="number" 
                name="price" 
                step="0.01" 
                min="0" 
                value={newItem.price} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Category</label>
              <select 
                name="category" 
                value={newItem.category} 
                onChange={handleChange}
              >
                <option value="appetizer">Appetizer</option>
                <option value="main">Main Course</option>
                <option value="dessert">Dessert</option>
                <option value="drink">Drink</option>
              </select>
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input 
                  type="checkbox" 
                  name="available" 
                  checked={newItem.available} 
                  onChange={handleChange} 
                />
                Available
              </label>
            </div>
            <div className="form-group">
  <label>Image (Optional)</label>
  <input
    type="file"
    name="image"
    accept="image/jpeg,image/png,image/jpg"
    onChange={handleImageChange}
  />
  <small>Max size: 5MB. Allowed formats: JPEG, JPG, PNG</small>
</div>

{previewUrl && (
  <div className="image-preview">
    <img 
      src={previewUrl} 
      alt="Preview" 
      style={{ maxWidth: '100%', maxHeight: '200px', marginTop: '10px' }} 
    />
  </div>
)}
            <button type="submit" className="add-button">Menu Item</button>
          </form>
        </div>
        
        <div className="menu-section">
          <h2>Current Menu Items</h2>
          {loading ? (
            <p>Loading...</p>
          ) : menuItems.length === 0 ? (
            <p>No menu items yet. some!</p>
          ) : (
            <div className="menu-items-list">
             {menuItems.map(item => (
  <div key={item._id} className="menu-item">
    {item.imageUrl && (
      <div className="menu-image">
        <img 
          src={`http://localhost:5001${item.imageUrl}`} 
          alt={item.name} 
        />
      </div>
    )}
    <div className="menu-content">
      <h3>{item.name}</h3>
      <p>{item.description}</p>
      <p className="price">${item.price.toFixed(2)}</p>
      <p className="category">Category: {item.category}</p>
      <p className={item.available ? 'available' : 'unavailable'}>
        {item.available ? 'Available' : 'Not Available'}
      </p>
    </div>
    <div className="menu-actions">
      <button 
        onClick={() => handleDelete(item._id)}
        className="delete-button"
      >
        Delete
      </button>
    </div>
  </div>
))}
            </div>
          )}
        </div>
      </div>
      <PromotionManager />
    </div>
  );
}

export default AdminDashboard;