var express = require('express');
var router = express.Router({mergeParams: true});
var Code = require("../models/code");
const{isLoggedIn} = require("../middleware");


// GET: /codes
router.get('/', function(req, res) {
  Code.find()
    .then(function(codes) {
      res.render('admin/index'), {codes: codes};
    });
});


// GET: /codes/create
router.get('/create', isLoggedIn, function(req, res, next) {
  res.render('codes/create', {
    code: new Code({codes: '',
						 codeAmount: ''})});
	
});

// POST: /codes
router.post('/', isLoggedIn, function(req, res, next) {
  const codes = req.body.codes;	

  const codeAmount = req.body.codeAmount;
	
  const code = new Code({codes: codes,
						codeAmount: codeAmount,
						});
	
  code.save()
    .then(function() {
      res.redirect('/admin');
    });
});


// DELETE: /codes
router.delete('/', isLoggedIn, async (req, res, next) => {
  const codeId = req.body.codeId;

  const deleteCode = await Code.findByIdAndDelete(codeId);

  return res.json({ deleted: deleteCode && typeof deleteCode._id != "undefined" });
});


//promo apply

router.post("/apply", function(req, res){
	Code.findOne({codes : req.body.code}) .then(function(apply) {
		 if(apply != null) {
          let tax = parseFloat(apply.codeAmount) * 0.0625;
		 return res.json({'amount': apply.codeAmount, 'tax': tax});
			 

		 } else {
			 
		 return res.json({'amount': 0, 'tax': 0});

		 }
		 // return res.json({ 'code': req.body.codes , 'oby': apply});
    });
	
});

module.exports = router;