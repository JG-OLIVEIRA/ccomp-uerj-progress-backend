import express from 'express';
import swaggerUi from 'swagger-ui-express';
import specs from '../swagger.js';

const router = express.Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs));
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

export default router;
