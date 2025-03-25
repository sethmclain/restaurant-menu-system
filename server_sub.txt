const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/restaurant-menu-system', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('x-auth-token');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, 'your_jwt_secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'superuser'],
    default: 'admin'
  },
  restaurantName: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

// Menu Item Schema
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  price: {
    type: Number,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  imageUrl: String,
  available: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// Promotion Schema
const promotionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  discountPercentage: {
    type: Number,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Promotion = mongoose.model('Promotion', promotionSchema);

// Advertisement Schema
const advertisementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  targetUserIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Advertisement = mongoose.model('Advertisement', advertisementSchema);

// Routes
// User Routes
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, email, password, restaurantName } = req.body;
    
    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    user = new User({
      username,
      email,
      password: hashedPassword,
      restaurantName
    });

    await user.save();

    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      'your_jwt_secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        restaurantName: user.restaurantName
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Error registering user' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      'your_jwt_secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        restaurantName: user.restaurantName
      }
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Error logging in' });
  }
});

// Menu Item Routes
app.get('/api/menu-items', auth, async (req, res) => {
  try {
    const menuItems = await MenuItem.find({ userId: req.user.userId });
    res.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu items:', error);
    res.status(500).json({ message: 'Error fetching menu items' });
  }
});

app.post('/api/menu-items', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, available } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const menuItem = new MenuItem({
      name,
      description,
      price: parseFloat(price),
      category,
      available: available === 'true',
      imageUrl,
      userId: req.user.userId
    });

    await menuItem.save();
    res.status(201).json(menuItem);
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ message: 'Error creating menu item' });
  }
});

app.put('/api/menu-items/:id', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, available } = req.body;
    const menuItem = await MenuItem.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    menuItem.name = name;
    menuItem.description = description;
    menuItem.price = parseFloat(price);
    menuItem.category = category;
    menuItem.available = available === 'true';

    if (req.file) {
      // Delete old image if exists
      if (menuItem.imageUrl) {
        const oldImagePath = path.join(__dirname, 'uploads', path.basename(menuItem.imageUrl));
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      menuItem.imageUrl = `/uploads/${req.file.filename}`;
    }

    await menuItem.save();
    res.json(menuItem);
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ message: 'Error updating menu item' });
  }
});

app.delete('/api/menu-items/:id', auth, async (req, res) => {
  try {
    const menuItem = await MenuItem.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    if (menuItem.imageUrl) {
      const imagePath = path.join(__dirname, 'uploads', path.basename(menuItem.imageUrl));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await menuItem.remove();
    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ message: 'Error deleting menu item' });
  }
});

// Promotion Routes
app.get('/api/promotions', auth, async (req, res) => {
  try {
    const promotions = await Promotion.find({ userId: req.user.userId });
    res.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ message: 'Error fetching promotions' });
  }
});

app.post('/api/promotions', auth, async (req, res) => {
  try {
    const { title, description, discountPercentage, startDate, endDate } = req.body;
    const promotion = new Promotion({
      title,
      description,
      discountPercentage: parseFloat(discountPercentage),
      startDate,
      endDate,
      userId: req.user.userId
    });

    await promotion.save();
    res.status(201).json(promotion);
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ message: 'Error creating promotion' });
  }
});

app.put('/api/promotions/:id', auth, async (req, res) => {
  try {
    const { title, description, discountPercentage, startDate, endDate, active } = req.body;
    const promotion = await Promotion.findOne({ _id: req.params.id, userId: req.user.userId });

    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    promotion.title = title;
    promotion.description = description;
    promotion.discountPercentage = parseFloat(discountPercentage);
    promotion.startDate = startDate;
    promotion.endDate = endDate;
    promotion.active = active === 'true';

    await promotion.save();
    res.json(promotion);
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ message: 'Error updating promotion' });
  }
});

app.delete('/api/promotions/:id', auth, async (req, res) => {
  try {
    const promotion = await Promotion.findOne({ _id: req.params.id, userId: req.user.userId });
    if (!promotion) {
      return res.status(404).json({ message: 'Promotion not found' });
    }

    await promotion.remove();
    res.json({ message: 'Promotion deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    res.status(500).json({ message: 'Error deleting promotion' });
  }
});

// Superuser Routes
app.get('/api/superuser/users', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ message: 'Access denied. Superuser only.' });
    }

    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users' });
  }
});

app.delete('/api/superuser/users/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ message: 'Access denied. Superuser only.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete user's menu items
    await MenuItem.deleteMany({ userId: user._id });
    
    // Delete user's promotions
    await Promotion.deleteMany({ userId: user._id });

    // Delete user
    await user.remove();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user' });
  }
});

// Superuser Advertisement Routes
app.get('/api/superuser/advertisements', auth, async (req, res) => {
  try {
    console.log('Fetching advertisements for user:', req.user);
    
    // Check if user is superuser
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ message: 'Access denied. Superuser only.' });
    }

    const advertisements = await Advertisement.find()
      .sort({ createdAt: -1 });
    
    console.log('Found advertisements:', advertisements);
    res.json(advertisements);
  } catch (error) {
    console.error('Error fetching advertisements:', error);
    res.status(500).json({ message: 'Error fetching advertisements' });
  }
});

app.post('/api/superuser/advertisements', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('Received advertisement request:', req.body);
    console.log('File:', req.file);
    console.log('User:', req.user);

    // Check if user is superuser
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ message: 'Access denied. Superuser only.' });
    }

    const { title, targetUserIds } = req.body;
    
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!targetUserIds) {
      return res.status(400).json({ message: 'Target users are required' });
    }

    let parsedTargetUserIds;
    try {
      parsedTargetUserIds = JSON.parse(targetUserIds);
    } catch (error) {
      console.error('Error parsing targetUserIds:', error);
      return res.status(400).json({ message: 'Invalid target users format' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Image is required' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    console.log('Created image URL:', imageUrl);

    const advertisement = new Advertisement({
      title,
      imageUrl,
      targetUserIds: parsedTargetUserIds
    });

    await advertisement.save();
    console.log('Advertisement saved successfully:', advertisement);
    res.status(201).json(advertisement);
  } catch (error) {
    console.error('Error creating advertisement:', error);
    res.status(500).json({ 
      message: 'Error creating advertisement',
      error: error.message 
    });
  }
});

app.delete('/api/superuser/advertisements/:id', auth, async (req, res) => {
  try {
    // Check if user is superuser
    if (req.user.role !== 'superuser') {
      return res.status(403).json({ message: 'Access denied. Superuser only.' });
    }

    const advertisement = await Advertisement.findById(req.params.id);
    if (!advertisement) {
      return res.status(404).json({ message: 'Advertisement not found' });
    }

    // Delete the image file
    const imagePath = path.join(__dirname, 'uploads', path.basename(advertisement.imageUrl));
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await advertisement.remove();
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (error) {
    console.error('Error deleting advertisement:', error);
    res.status(500).json({ message: 'Error deleting advertisement' });
  }
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 