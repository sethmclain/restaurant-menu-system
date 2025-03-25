import React, { useState } from 'react';
import axios from 'axios';

function AddPromotionForm({ userId, onPromotionAdded }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActive: true
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
      formDataObj.append('title', formData.title);
      formDataObj.append('description', formData.description);
      formDataObj.append('startDate', formData.startDate);
      if (formData.endDate) {
        formDataObj.append('endDate', formData.endDate);
      }
      formDataObj.append('isActive', formData.isActive);
      
      if (image) {
        formDataObj.append('image', image);
      }
      
      await axios.post(
        `http://localhost:5001/api/superuser/promotions/${userId}`,
        formDataObj,
        {
          headers: { 
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      onPromotionAdded();
    } catch (error) {
      console.error('Error adding promotion:', error);
      setError(error.response?.data?.message || 'Error adding promotion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-promotion-form">
      <h3>Add New Promotion</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
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
          <label htmlFor="startDate">Start Date</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="endDate">End Date (Optional)</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group checkbox">
          <label>
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
            />
            Active
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
          {loading ? 'Adding...' : 'Add Promotion'}
        </button>
      </form>
    </div>
  );
}

export default AddPromotionForm;