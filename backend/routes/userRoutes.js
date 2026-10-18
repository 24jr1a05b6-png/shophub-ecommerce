const express = require('express');

const { getUsers, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const { authenticateUser, authorizeAdmin } = require('../middleware/auth');

const router = express.Router();

// All user-management routes require an authenticated admin.
router.use(authenticateUser, authorizeAdmin);

router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
