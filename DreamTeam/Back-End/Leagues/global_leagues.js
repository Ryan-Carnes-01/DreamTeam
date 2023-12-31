const express = require('express');
const bodyParser = require('body-parser');
const { get_league, show_all, create_league, update_name, update_sport, update_profile_picture, delete_league} = require('../controllers/global_leagues.js');
const router = express.Router();

router.use(bodyParser.json());

//list all leagues to console
router.get('/', show_all);

//create league
router.post('/', create_league);

//get league info
router.get('/:id', get_league);

//delete league
router.delete('/:id', delete_league);

//update league info
router.patch('/update_name/:id', update_name);
router.patch('/update_sport/:id', update_sport);
router.patch('/update_picture/:id', update_profile_picture);

module.exports = router;