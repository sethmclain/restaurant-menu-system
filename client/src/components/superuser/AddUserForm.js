import React, { useState } from 'react';
import axios from 'axios';

function AddUserForm({ onUserAdded }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    restaurantName: '',
    role: 'admin'
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5001/api/superuser/users', formData, {
        headers: { 'x-auth-token': token }
      });
      
      setFormData({
        username: '',
        email: '',
        password: '',
        restaurantName: '',
        role: 'admin'
      });
      
      onUserAdded();
    } catch (error) {
      console.error('Error adding user:', error);
      setError(error.response?.data?.message || 'Error adding user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-user-form">
      <h3>Add New Restaurant</h3>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Restaurant Name</label>
          <input
            type="text"
            name="restaurantName"
            value={formData.restaurantName}
            onChange={handleChange}
            required
          />
        </div>
        
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? 'Adding...' : 'Add Restaurant'}
        </button>
      </form>
    </div>
  );
}

export default AddUserForm;