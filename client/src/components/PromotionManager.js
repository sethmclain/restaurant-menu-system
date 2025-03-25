import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PromotionManager.css';

function PromotionManager() {
  const [promotions, setPromotions] = useState([]);
  const [newPromotion, setNewPromotion] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    isActive: true
  });
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5001/api/promotions', {
        headers: { 'x-auth-token': token }
      });
      
      setPromotions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      setError(error.response?.data?.message || 'Error fetching promotions');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewPromotion({
      ...newPromotion,
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
      
      // Create FormData object for file upload
      const formData = new FormData();
      formData.append('title', newPromotion.title);
      formData.append('description', newPromotion.description);
      
      if (newPromotion.startDate) {
        formData.append('startDate', newPromotion.startDate);
      }
      
      if (newPromotion.endDate) {
        formData.append('endDate', newPromotion.endDate);
      }
      
      formData.append('isActive', newPromotion.isActive);
      
      // Add image if one was selected
      if (image) {
        formData.append('image', image);
      }
      
      await axios.post('http://localhost:5001/api/promotions', formData, {
        headers: { 
          'x-auth-token': token
        }
      });
      
      // Reset form
      setNewPromotion({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        isActive: true
      });
      setImage(null);
      setPreviewUrl('');
      
      // Refresh the promotions list
      fetchPromotions();
      setError(null);
    } catch (error) {
      console.error('Error adding promotion:', error);
      setError(error.response?.data?.message || 'Error adding promotion');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this promotion?')) {
      try {
        const token = localStorage.getItem('token');
        
        await axios.delete(`http://localhost:5001/api/promotions/${id}`, {
          headers: { 'x-auth-token': token }
        });
        
        fetchPromotions();
        setError(null);
      } catch (error) {
        console.error('Error deleting promotion:', error);
        setError(error.response?.data?.message || 'Error deleting promotion');
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No end date';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="promotion-manager">
      <h2>Manage Promotions</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="promotion-container">
        <div className="form-section">
          <h3>Add New Promotion</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title</label>
              <input 
                type="text" 
                name="title" 
                value={newPromotion.title} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea 
                name="description" 
                value={newPromotion.description} 
                onChange={handleChange} 
                required 
              />
            </div>
            
            <div className="form-group">
              <label>Start Date (Optional)</label>
              <input 
                type="date" 
                name="startDate" 
                value={newPromotion.startDate} 
                onChange={handleChange} 
              />
            </div>
            
            <div className="form-group">
              <label>End Date (Optional)</label>
              <input 
                type="date" 
                name="endDate" 
                value={newPromotion.endDate} 
                onChange={handleChange} 
              />
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input 
                  type="checkbox" 
                  name="isActive" 
                  checked={newPromotion.isActive} 
                  onChange={handleChange} 
                />
                Active
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
            
            <button type="submit" className="add-button">Add Promotion</button>
          </form>
        </div>
        
        <div className="promotions-section">
          <h3>Current Promotions</h3>
          {loading ? (
            <p>Loading...</p>
          ) : promotions.length === 0 ? (
            <p>No promotions yet. Add some!</p>
          ) : (
            <div className="promotions-list">
              {promotions.map(promotion => (
                <div key={promotion._id} className="promotion-item">
                  {promotion.imageUrl && (
                    <div className="promotion-image">
                      <img 
                        src={`http://localhost:5001${promotion.imageUrl}`} 
                        alt={promotion.title} 
                      />
                    </div>
                  )}
                  <div className="promotion-content">
                    <h4>{promotion.title}</h4>
                    <p>{promotion.description}</p>
                    <div className="promotion-details">
                      <p>Start: {formatDate(promotion.startDate)}</p>
                      <p>End: {formatDate(promotion.endDate)}</p>
                      <p className={promotion.isActive ? 'active' : 'inactive'}>
                        {promotion.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                  <div className="promotion-actions">
                    <button 
                      onClick={() => handleDelete(promotion._id)}
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
    </div>
  );
}

export default PromotionManager;