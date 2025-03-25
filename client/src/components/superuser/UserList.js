import React from 'react';

function UserList({ users, selectedUser, onSelectUser, onDeleteUser, loading }) {
  if (loading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="user-list">
      {users.map(user => (
        <div 
          key={user._id} 
          className={`user-item ${selectedUser?._id === user._id ? 'selected' : ''}`}
        >
          <div 
            className="user-info"
            onClick={() => onSelectUser(user)}
          >
            <h4>{user.restaurantName || user.username}</h4>
            <p>{user.email}</p>
          </div>
          <button 
            className="delete-button"
            onClick={() => onDeleteUser(user._id)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

export default UserList;