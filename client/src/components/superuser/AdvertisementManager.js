import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdvertisementManager.css';

function AdvertisementManager({ users }) {
  const [advertisements, setAdvertisements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    targetUserIds: []
  });
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    fetchAdvertisements();
  }, []);

  const fetchAdvertisements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5001/api/superuser/advertisements', {
        headers: { 'x-auth-token': token }
      });
      
      setAdvertisements(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching advertisements:', error);
      setError(error.response?.data?.message || 'Error fetching advertisements');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

  const handleTargetUserChange = (userId) => {
    setFormData(prev => {
      const newTargetUserIds = [...prev.targetUserIds];
      
      if (newTargetUserIds.includes(userId)) {
        // Remove the user if already selected
        return {
          ...prev,
          targetUserIds: newTargetUserIds.filter(id => id !== userId)
        };
      } else {
        // Add the user if not selected
        return {
          ...prev,
          targetUserIds: [...newTargetUserIds, userId]
        };
      }
    });
  };

  const handleSelectAllUsers = () => {
    const allUserIds = users
      .filter(user => user.role !== 'superuser')
      .map(user => user._id);
    
    setFormData(prev => ({
      ...prev,
      targetUserIds: allUserIds
    }));
  };

  const handleUnselectAllUsers = () => {
    setFormData(prev => ({
      ...prev,
      targetUserIds: []
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!image) {
      setError('Please select an image for the advertisement');
      return;
    }
    
    if (formData.targetUserIds.length === 0) {
      setError('Please select at least one user to target');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const formDataObj = new FormData();
      formDataObj.append('title', formData.title.trim());
      formDataObj.append('targetUserIds', JSON.stringify(formData.targetUserIds));
      formDataObj.append('image', image);
      
      const response = await axios.post(
        'http://localhost:5001/api/superuser/advertisements',
        formDataObj,
        {
          headers: { 
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log('Advertisement created successfully:', response.data);
      
      setFormData({
        title: '',
        targetUserIds: []
      });
      setImage(null);
      setPreviewUrl('');
      setShowAddForm(false);
      fetchAdvertisements();
    } catch (error) {
      console.error('Error creating advertisement:', error);
      setError(error.response?.data?.message || error.response?.data?.error || 'Error creating advertisement');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this advertisement?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(`http://localhost:5001/api/superuser/advertisements/${id}`, {
        headers: { 'x-auth-token': token }
      });
      
      fetchAdvertisements();
    } catch (error) {
      console.error('Error deleting advertisement:', error);
      setError(error.response?.data?.message || 'Error deleting advertisement');
    }
  };

  const getFullImageUrl = (imageUrl) => {
    if (!imageUrl) return '';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `http://localhost:5001${imageUrl}`;
  };

  return (
    <div className="advertisement-manager">
      <div className="section-header">
        <h2>Advertisement Manager</h2>
        <button 
          className="add-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add New Advertisement'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {showAddForm && (
        <div className="add-advertisement-form">
          <h3>Create New Advertisement</h3>
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
              <label htmlFor="image">Advertisement Image</label>
              <input
                type="file"
                id="image"
                name="image"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleImageChange}
                required
              />
              <small>Max size: 5MB. Allowed formats: JPEG, JPG, PNG</small>
            </div>
            
            {previewUrl && (
              <div className="image-preview">
                <img
                  src={previewUrl}
                  alt="Advertisement Preview"
                  style={{ maxWidth: '100%', maxHeight: '200px', marginTop: '10px' }}
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Target Users</label>
              <div className="target-users-actions">
                <button 
                  type="button" 
                  className="select-all-button" 
                  onClick={handleSelectAllUsers}
                >
                  Select All
                </button>
                <button 
                  type="button" 
                  className="unselect-all-button" 
                  onClick={handleUnselectAllUsers}
                >
                  Unselect All
                </button>
              </div>
              <div className="target-users-list">
                {users
                  .filter(user => user.role !== 'superuser')
                  .map(user => (
                    <label key={user._id} className="user-checkbox">
                      <input
                        type="checkbox"
                        checked={formData.targetUserIds.includes(user._id)}
                        onChange={() => handleTargetUserChange(user._id)}
                      />
                      {user.restaurantName || user.username}
                    </label>
                  ))}
              </div>
            </div>
            
            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Creating...' : 'Create Advertisement'}
            </button>
          </form>
        </div>
      )}
      
      <div className="advertisements-list">
        {loading && !showAddForm ? (
          <div className="loading">Loading advertisements...</div>
        ) : advertisements.length === 0 ? (
          <div className="no-advertisements">
            No advertisements found. Create one to get started!
          </div>
        ) : (
          advertisements.map(ad => (
            <div key={ad._id} className="advertisement-card">
              <img
                src={getFullImageUrl(ad.imageUrl)}
                alt={ad.title}
                className="advertisement-image"
                onError={(e) => {
                  console.error('Error loading image:', ad.imageUrl);
                  e.target.src = 'https://via.placeholder.com/300x200?text=Image+Not+Found';
                }}
              />
              <div className="advertisement-info">
                <h3>{ad.title}</h3>
                <p>Target Users: {ad.targetUserIds.length}</p>
                <p>Created: {new Date(ad.createdAt).toLocaleDateString()}</p>
              </div>
              <button
                className="delete-button"
                onClick={() => handleDelete(ad._id)}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdvertisementManager;