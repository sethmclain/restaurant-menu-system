import React, { useState } from 'react';
import axios from 'axios';

function AddMenuItemForm({ userId, onItemAdded }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'main',
    available: true
  });
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
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
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      // Create FormData object for file upload
      const formDataObj = new FormData();
      formDataObj.append('name', formData.name);
      formDataObj.append('description', formData.description);
      formDataObj.append('price', parseFloat(formData.price));
      formDataObj.append('category', formData.category);
      formDataObj.append('available', formData.available);
      
      if (image) {
        formDataObj.append('image', image);
      }
      
      await axios.post(
        `http://localhost:5001/api/superuser/menu-items/${userId}`,
        formDataObj,
        {
          headers: { 
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      onItemAdded();
    } catch (error) {
      console.error('Error adding menu item:', error);
      setError(error.response?.data?.message || 'Error adding menu item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-menu-item-form">
      <h3>Add New Menu Item</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="price">Price ($)</label>
          <input
            type="number"
            id="price"
            name="price"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="category">Category</label>
          <select
            id="category"
            name="category"
            value={formData.category}
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
              checked={formData.available}
              onChange={handleChange}
            />
            Available
          </label>
        </div>
        
        <div className="form-group">
          <label htmlFor="image">Image (Optional)</label>
          <input
            type="file"
            id="image"
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
        
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Adding...' : 'Add Menu Item'}
        </button>
      </form>
    </div>
  );
}

export default AddMenuItemForm;