// routes/employeeRoute.js
const express = require('express');
const { 
    getHumanData 
} = require('../controller/controller');

const router = express.Router();

router.get('/human', getHumanData);

module.exports = router;
