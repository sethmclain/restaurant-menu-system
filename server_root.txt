const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
// Create Express app
const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());
// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Configure multer for file storage
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    // Create unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter to only allow certain image types
const fileFilter = (req, file, cb) => {
  // Accept only jpeg, jpg, and png
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, JPG and PNG file formats are allowed!'), false);
  }
};

// Initialize multer with our configuration
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB max file size
  },
  fileFilter: fileFilter
});
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://admin:887887@cluster0.hpdva.mongodb.net/Project0?retryWrites=true&w=majority&appName=Cluster0')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define menu item schema
const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  available: { type: Boolean, default: true },
  imageUrl: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});
// Promotion Schema
const promotionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  isActive: { type: Boolean, default: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});
// Advertisement Schema
const advertisementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  imageUrl: { type: String, required: true },
  targetUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true }
});
// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  restaurantName: { type: String, required: true },
  role: { type: String, enum: ['user', 'superuser'], default: 'user' }
});
// Create User model
const User = mongoose.model('User', userSchema);
// Create MenuItem model
const MenuItem = mongoose.model('MenuItem', menuItemSchema);
// Create Promotion model
const Promotion = mongoose.model('Promotion', promotionSchema);
// Create Advertisement model
const Advertisement = mongoose.model('Advertisement', advertisementSchema);
// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
// Superuser middleware - verifies if the user has superuser role
const isSuperuser = async (req, res, next) => {
  try {
    // First get the user from the database
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== 'superuser') {
      return res.status(403).json({ 
        message: 'Access denied. Superuser privileges required.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Superuser authorization error:', error);
    res.status(500).json({ message: 'Server error during authorization' });
  }
};
// User registration
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// Create the initial superuser (should be secured or removed after initial setup)
app.post('/api/create-superuser', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    // Check if a superuser already exists
    const existingSuperuser = await User.findOne({ role: 'superuser' });
    if (existingSuperuser) {
      return res.status(400).json({ message: 'A superuser already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create superuser
    const superuser = new User({
      username,
      password: hashedPassword,
      email,
      restaurantName: 'Platform Management',
      role: 'superuser'
    });
    
    await superuser.save();
    
    // Generate token
    const token = jwt.sign(
      { id: superuser._id, role: superuser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    res.status(201).json({
      message: 'Superuser created successfully',
      token,
      user: {
        id: superuser._id,
        username: superuser.username,
        email: superuser.email,
        role: superuser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// User login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }
    
    // Create token with all necessary user information
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username, 
        email: user.email,
        restaurantName: user.restaurantName,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Return user data without sensitive information
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        restaurantName: user.restaurantName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get user's menu items (admin only)
app.get('/api/menu-items', auth, async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ userId: req.user.id });
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new menu item (admin only)
app.post('/api/menu-items', auth, upload.single('image'), async (req, res) => {
  try {
    console.log("Request body:", req.body); // Log the request body for debugging
    console.log("File:", req.file); // Log the file for debugging
    
    // Validate required fields
    const { name, description, price, category } = req.body;
    
    if (!name || !description || !price || !category) {
      // If an image was uploaded but validation failed, delete it
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        message: 'Name, description, price, and category are required' 
      });
    }

    // Get image URL if an image was uploaded
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    const menuItem = new MenuItem({
      name,
      description,
      price: parseFloat(price), // Make sure to parse the price as a number
      category,
      available: req.body.available === 'true', // Convert string to boolean
      imageUrl,
      userId: req.user.id
    });
    
    const newItem = await menuItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    // If an error occurred and an image was uploaded, delete it
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error adding menu item:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a menu item (admin only)
app.delete('/api/menu-items/:id', auth, async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    // Check if menu item exists
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Check if user owns the menu item
    if (menuItem.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all promotions for a user
app.get('/api/promotions', auth, async (req, res) => {
  try {
    const promotions = await Promotion.find({ userId: req.user.id });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new promotion
app.post('/api/promotions', auth, upload.single('image'), async (req, res) => {
  try {
    // Validate required fields
    const { title, description } = req.body;
    
    if (!title || !description) {
      // If an image was uploaded but validation failed, delete it
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        message: 'Title and description are required' 
      });
    }

    // Get image URL if an image was uploaded
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';

    // Parse dates if provided
    const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
    const endDate = req.body.endDate ? new Date(req.body.endDate) : null;

    const promotion = new Promotion({
      title,
      description,
      imageUrl,
      startDate,
      endDate,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      userId: req.user.id
    });
    
    const newPromotion = await promotion.save();
    res.status(201).json(newPromotion);
  } catch (error) {
    // If an error occurred and an image was uploaded, delete it
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error adding promotion:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete a promotion
app.delete('/api/promotions/:id', auth, async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    
    // Check if promotion exists
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    
    // Check if user owns the promotion
    if (promotion.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    // Delete the associated image if it exists
    if (promotion.imageUrl) {
      const imagePath = path.join(__dirname, promotion.imageUrl.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Promotion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ message: error.message });
  }
});

// Public endpoint to get active promotions for a specific user
app.get('/api/public/promotions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // Find all active promotions for this user that haven't expired
    const currentDate = new Date();
    const promotions = await Promotion.find({
      userId: userId,
      isActive: true,
      $or: [
        { endDate: { $gt: currentDate } },
        { endDate: null }
      ]
    });
    res.json(promotions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// ===== SUPERUSER ROUTES =====
// These routes are only accessible to users with the superuser role

// Superuser routes for advertisements
app.post('/api/superuser/advertisements', auth, isSuperuser, upload.single('image'), async (req, res) => {
  try {
    // Validate required fields
    const { title, targetUserIds } = req.body;
    
    if (!title || !req.file) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Title and image are required' });
    }

    // Parse target user IDs
    let parsedTargetUserIds = [];
    if (targetUserIds) {
      try {
        parsedTargetUserIds = JSON.parse(targetUserIds);
      } catch (error) {
        console.error('Error parsing targetUserIds:', error);
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Invalid targetUserIds format' });
      }
    }

    // Create advertisement
    const advertisement = new Advertisement({
      title,
      imageUrl: `/uploads/${req.file.filename}`,
      targetUserIds: parsedTargetUserIds,
      active: true
    });
    
    const newAdvertisement = await advertisement.save();
    res.status(201).json(newAdvertisement);
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Error creating advertisement:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get all advertisements (superuser only)
app.get('/api/superuser/advertisements', auth, isSuperuser, async (req, res) => {
  try {
    const advertisements = await Advertisement.find().sort({ createdAt: -1 });
    res.json(advertisements);
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete an advertisement (superuser only)
app.delete('/api/superuser/advertisements/:id', auth, isSuperuser, async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id);
    
    if (!advertisement) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }
    
    // Delete the image file
    if (advertisement.imageUrl) {
      const imagePath = path.join(__dirname, advertisement.imageUrl.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Advertisement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('Error deleting advertisement:', error);
    res.status(500).json({ message: error.message });
  }
});

// Public endpoint to get advertisements for a specific user
app.get('/api/public/advertisements/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find all active advertisements that target this user
    const advertisements = await Advertisement.find({
      targetUserIds: userId,
      active: true
    }).sort({ createdAt: -1 });
    
    res.json(advertisements);
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    res.status(500).json({ message: error.message });
  }
});
// Get all users (superuser only)
app.get('/api/superuser/users', auth, isSuperuser, async (req, res) => {
  try {
    // Exclude passwords from the response
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get a specific user by ID (superuser only)
app.get('/api/superuser/users/:userId', auth, isSuperuser, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get menu items for any user (superuser only)
app.get('/api/superuser/menu-items/:userId', auth, isSuperuser, async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ userId: req.params.userId });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add menu item for a specific user (superuser only)
app.post('/api/superuser/menu-items/:userId', auth, isSuperuser, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, available } = req.body;
    const userId = req.params.userId;

    // Create new menu item
    const menuItem = new MenuItem({
      name,
      description,
      price: parseFloat(price),
      category,
      available: available === 'true',
      userId
    });

    // Handle image upload if present
    if (req.file) {
      menuItem.imageUrl = `/uploads/${req.file.filename}`;
    }

    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Error adding menu item:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update menu item for any user (superuser only)
app.put('/api/superuser/menu-items/:id', auth, isSuperuser, upload.single('image'), async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // If a new image was uploaded, delete the old one
    if (req.file && menuItem.imageUrl) {
      const oldImagePath = path.join(__dirname, menuItem.imageUrl.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
    
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : menuItem.imageUrl;
    
    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name || menuItem.name,
        description: req.body.description || menuItem.description,
        price: req.body.price ? parseFloat(req.body.price) : menuItem.price,
        category: req.body.category || menuItem.category,
        available: req.body.available !== undefined ? req.body.available === 'true' : menuItem.available,
        imageUrl
      },
      { new: true }
    );
    
    res.json(updatedMenuItem);
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Error updating menu item:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete menu item (superuser only)
app.delete('/api/superuser/menu-items/:id', auth, isSuperuser, async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Delete the associated image if it exists
    if (menuItem.imageUrl) {
      const imagePath = path.join(__dirname, menuItem.imageUrl.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get promotions for any user (superuser only)
app.get('/api/superuser/promotions/:userId', auth, isSuperuser, async (req, res) => {
  try {
    const promotions = await Promotion.find({ userId: req.params.userId });
    res.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add promotion for any user (superuser only)
app.post('/api/superuser/promotions/:userId', auth, isSuperuser, upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get image URL if an image was uploaded
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : '';
    
    // Parse dates if provided
    const startDate = req.body.startDate ? new Date(req.body.startDate) : new Date();
    const endDate = req.body.endDate ? new Date(req.body.endDate) : null;

    const promotion = new Promotion({
      title: req.body.title,
      description: req.body.description,
      imageUrl,
      startDate,
      endDate,
      isActive: req.body.isActive !== undefined ? req.body.isActive === 'true' : true,
      userId
    });
    
    const newPromotion = await promotion.save();
    res.status(201).json(newPromotion);
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    console.error('Error adding promotion:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete promotion (superuser only)
app.delete('/api/superuser/promotions/:id', auth, isSuperuser, async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);
    
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }
    
    // Delete the associated image if it exists
    if (promotion.imageUrl) {
      const imagePath = path.join(__dirname, promotion.imageUrl.replace('/uploads/', 'uploads/'));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    
    await Promotion.findByIdAndDelete(req.params.id);
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new user (superuser only)
app.post('/api/superuser/users', auth, isSuperuser, async (req, res) => {
  try {
    const { username, email, password, restaurantName } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword,
      restaurantName,
      role: 'user' // Ensure new users created by superuser are regular users
    });
    
    await user.save();
    
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        restaurantName: user.restaurantName
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get menu items for a specific user (superuser only)
app.get('/api/superuser/users/:userId/menu-items', auth, isSuperuser, async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ userId: req.params.userId });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: 'Error fetching menu items' });
  }
});

// Delete a menu item (superuser only)
app.delete('/api/superuser/menu-items/:itemId', auth, isSuperuser, async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.itemId);
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    // Delete the image file if it exists
    if (menuItem.imageUrl) {
      const imagePath = path.join(__dirname, menuItem.imageUrl);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await menuItem.deleteOne();
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: 'Error deleting menu item' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});