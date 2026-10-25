const express = require('express');
const controller = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/adminValidators');
const { idParam } = require('../validators/common');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/stats', controller.getPlatformStats);
router.get('/users', validate({ query: schemas.listUsers }), controller.listUsers);
router
  .route('/users/:id')
  .get(validate({ params: idParam() }), controller.getUser)
  .patch(validate({ params: idParam(), body: schemas.updateUser }), controller.updateUser)
  .delete(validate({ params: idParam() }), controller.deleteUser);

module.exports = router;
