// routes/employeeRoute.js
const express = require('express');
const { 
    getHumanData 
} = require('../controller/controller');

const router = express.Router();
const { updateEmployee } = require('../controller/controller');

router.post('/updateEmployee', updateEmployee);

router.get('/human', getHumanData);

module.exports = router;
