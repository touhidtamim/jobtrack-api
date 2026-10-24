const express = require('express');
const controller = require('../controllers/interviewController');
const validate = require('../middleware/validate');
const schemas = require('../validators/interviewValidators');
const { idParams } = require('../validators/common');

// mergeParams: exposes :applicationId from the parent router
const router = express.Router({ mergeParams: true });

const appParam = idParams('applicationId');
const bothParams = idParams('applicationId', 'interviewId');

router
  .route('/')
  .get(validate({ params: appParam, query: schemas.list }), controller.getInterviews)
  .post(validate({ params: appParam, body: schemas.create }), controller.createInterview);

router
  .route('/:interviewId')
  .get(validate({ params: bothParams }), controller.getInterview)
  .patch(validate({ params: bothParams, body: schemas.patch }), controller.updateInterview)
  .delete(validate({ params: bothParams }), controller.deleteInterview);

module.exports = router;
