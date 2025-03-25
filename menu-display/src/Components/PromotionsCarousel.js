import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useUser } from '../context/UserContext';
import './PromotionsCarousel.css';

function PromotionsCarousel() {
  const [promotions, setPromotions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { currentUser } = useUser();

  useEffect(() => {
    const fetchPromotions = async () => {
      try {
        setLoading(true);
        console.log('Attempting to fetch promotions for user:', currentUser?.id);
        
        if (!currentUser?.id) {
          console.log('No user logged in, skipping promotions fetch');
          setPromotions([]);
          setLoading(false);
          return;
        }

        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // Fetch promotions for the current user
        const response = await axios.get(`http://localhost:5001/api/public/promotions/${currentUser.id}`, {
            headers: {
              'x-auth-token': token
            }
          });
        
        console.log('Promotions data received:', response.data);
        setPromotions(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching promotions:', error);
        setError('Failed to load promotions');
        setLoading(false);
      }
    };

    fetchPromotions();
  }, [currentUser]);

  // Rotate through promotions every 10 seconds
  useEffect(() => {
    if (promotions.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % promotions.length);
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [promotions]);

  // Don't render anything if there are no promotions
  if (loading) {
    return <div className="promotions-loading">Loading promotions...</div>;
  }

  if (error || promotions.length === 0) {
    return null; // Don't show anything if there's an error or no promotions
  }

  const currentPromotion = promotions[currentIndex];

  return (
    <div className="promotions-carousel">
      <div className="promotion-card">
        {currentPromotion.imageUrl && (
          <div className="promotion-image">
            <img 
              src={`http://localhost:5001${currentPromotion.imageUrl}`} 
              alt={currentPromotion.title} 
            />
          </div>
        )}
        <div className="promotion-content">
          <h3>{currentPromotion.title}</h3>
          <p>{currentPromotion.description}</p>
        </div>
        
        {promotions.length > 1 && (
          <div className="promotion-indicators">
            {promotions.map((_, index) => (
              <span 
                key={index} 
                className={`indicator ${index === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(index)}
              ></span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PromotionsCarousel;