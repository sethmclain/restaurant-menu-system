import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AddPromotionForm from './AddPromotionForm';

function UserPromotions({ userId }) {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchPromotions();
  }, [userId]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get(`http://localhost:5001/api/superuser/promotions/${userId}`, {
        headers: { 'x-auth-token': token }
      });
      
      setPromotions(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching promotions:', error);
      setError(error.response?.data?.message || 'Error fetching promotions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromotion = async (promotionId) => {
    if (!window.confirm('Are you sure you want to delete this promotion?')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(`http://localhost:5001/api/superuser/promotions/${promotionId}`, {
        headers: { 'x-auth-token': token }
      });
      
      fetchPromotions();
    } catch (error) {
      console.error('Error deleting promotion:', error);
      setError(error.response?.data?.message || 'Error deleting promotion');
    }
  };

  if (loading) return <div className="loading">Loading promotions...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="user-promotions">
      <div className="section-header">
        <h3>Promotions</h3>
        <button 
          className="add-button"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : 'Add Promotion'}
        </button>
      </div>
      
      {showAddForm && (
        <AddPromotionForm 
          userId={userId} 
          onPromotionAdded={() => {
            fetchPromotions();
            setShowAddForm(false);
          }} 
        />
      )}
      
      {promotions.length === 0 ? (
        <p>No promotions found.</p>
      ) : (
        <div className="promotions-grid">
          {promotions.map(promotion => (
            <div key={promotion._id} className="promotion-card">
              <h4>{promotion.title}</h4>
              <p className="description">{promotion.description}</p>
              <div className="promotion-dates">
                <p>Start Date: {new Date(promotion.startDate).toLocaleDateString()}</p>
                {promotion.endDate && (
                  <p>End Date: {new Date(promotion.endDate).toLocaleDateString()}</p>
                )}
              </div>
              <p className="status">Status: {promotion.isActive ? 'Active' : 'Inactive'}</p>
              {promotion.imageUrl && (
                <img 
                  src={`http://localhost:5001${promotion.imageUrl}`} 
                  alt={promotion.title} 
                  className="promotion-image"
                />
              )}
              <button 
                className="delete-button"
                onClick={() => handleDeletePromotion(promotion._id)}
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

export default UserPromotions;