import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext';
import UserSelector from './Components/UserSelector';
import MenuDisplay from './Components/MenuDisplay';
import './App.css';

function App() {
  return (
    <Router>
      <UserProvider>
        <div className="App">
          <UserSelector />
          <Routes>
            <Route path="/" element={<MenuDisplay />} />
          </Routes>
        </div>
      </UserProvider>
    </Router>
  );
}

export default App;