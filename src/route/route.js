// routes/employeeRoute.js
const express = require('express');
const { 
    getHumanData 
} = require('../controller/controller');

const router = express.Router();
const { updateEmployee, deleteEmployee, addEmployee } = require('../controller/controller');

router.post('/updateEmployee', updateEmployee);
router.post('/addEmployee', addEmployee);
router.delete('/deleteEmployee/:id', deleteEmployee);

router.get('/human', getHumanData);

module.exports = router;
