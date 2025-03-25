import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './SuperuserDashboard.css';
import UserList from './superuser/UserList';
import UserMenuItems from './superuser/UserMenuItems';
import UserPromotions from './superuser/UserPromotions';
import AddUserForm from './superuser/AddUserForm';
import AdvertisementManager from './superuser/AdvertisementManager';

function SuperuserDashboard() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'promotions', or 'addUser' or 'advertisements'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is logged in and is a superuser
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      navigate('/admin');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser.role !== 'superuser') {
        navigate('/admin-dashboard');
        return;
      }
    } catch (err) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/admin');
      return;
    }

    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('http://localhost:5001/api/superuser/users', {
        headers: { 'x-auth-token': token }
      });
      
      setUsers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.message || 'Error fetching users');
      setLoading(false);
      
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/admin');
      }
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setActiveTab('menu');
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(`http://localhost:5001/api/superuser/users/${userId}`, {
        headers: { 'x-auth-token': token }
      });
      
      fetchUsers();
      
      if (selectedUser && selectedUser._id === userId) {
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setError(error.response?.data?.message || 'Error deleting user');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/admin');
  };

  return (
    <div className="superuser-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Restaurant Management Platform</h1>
          <h2>Superuser Dashboard</h2>
        </div>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </header>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="dashboard-content">
        <div className="sidebar">
          <div className="sidebar-header">
            <h3>Restaurant Accounts</h3>
            <div className="sidebar-actions">
              <button 
                className="action-button"
                onClick={() => {
                  setSelectedUser(null);
                  setActiveTab('addUser');
                }}
              >
                Add New User
              </button>
              <button 
                className="action-button"
                onClick={() => {
                  setSelectedUser(null);
                  setActiveTab('advertisements');
                }}
              >
                Manage Advertisements
              </button>
            </div>
          </div>
          <div className="user-list">
            <UserList 
              users={users} 
              selectedUser={selectedUser} 
              onSelectUser={handleUserSelect}
              onDeleteUser={handleDeleteUser}
              loading={loading}
            />
          </div>
        </div>
        
        <div className="main-content">
          {activeTab === 'advertisements' ? (
            <AdvertisementManager users={users} />
          ) : activeTab === 'addUser' ? (
            <AddUserForm onUserAdded={fetchUsers} />
          ) : selectedUser ? (
            <div className="user-management">
              <div className="user-header">
                <h2>{selectedUser.restaurantName || selectedUser.username}'s Restaurant</h2>
                <div className="tab-buttons">
                  <button 
                    className={`tab-button ${activeTab === 'menu' ? 'active' : ''}`}
                    onClick={() => setActiveTab('menu')}
                  >
                    Menu Items
                  </button>
                  <button 
                    className={`tab-button ${activeTab === 'promotions' ? 'active' : ''}`}
                    onClick={() => setActiveTab('promotions')}
                  >
                    Promotions
                  </button>
                </div>
              </div>
              
              {activeTab === 'menu' ? (
                <UserMenuItems userId={selectedUser._id} />
              ) : (
                <UserPromotions userId={selectedUser._id} />
              )}
            </div>
          ) : (
            <div className="select-user-prompt">
              <h2>Select a restaurant to manage or add a new one</h2>
              <p>Use the sidebar to view and manage restaurant accounts.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SuperuserDashboard;