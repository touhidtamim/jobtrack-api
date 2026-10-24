const express = require('express');
const controller = require('../controllers/applicationController');
const interviewRoutes = require('./interviewRoutes');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../validators/applicationValidators');
const { idParam } = require('../validators/common');

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(validate({ query: schemas.list }), controller.getApplications)
  .post(validate({ body: schemas.create }), controller.createApplication);

// must be declared before '/:id'
router.get('/stats', controller.getStats);

router
  .route('/:id')
  .get(validate({ params: idParam() }), controller.getApplication)
  .put(validate({ params: idParam(), body: schemas.create }), controller.replaceApplication)
  .patch(validate({ params: idParam(), body: schemas.patch }), controller.updateApplication)
  .delete(validate({ params: idParam() }), controller.deleteApplication);

router.use('/:applicationId/interviews', interviewRoutes);

module.exports = router;
