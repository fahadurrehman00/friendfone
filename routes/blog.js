var express = require("express");
var router = express.Router();

//INDEX - Show Home Page
router.get("/", function(req, res){
	res.render("blog/index");
});


module.exports = router;