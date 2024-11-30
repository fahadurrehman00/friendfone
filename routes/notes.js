var express = require('express');
var router = express.Router({mergeParams: true});
var Note = require("../models/note");

var middleware = require("../middleware");

const{isLoggedIn} = require("../middleware");


// GET: /notes
router.get('/', function(req, res) {
  Note.find()
    .then(function(notes) {
      res.render('users/show'), {notes: notes};
    });
});


// GET: /notes/create
router.post('/create', isLoggedIn, function(req, res, next) {
  res.render('notes/create', {
    note: new Note({
		notes: ''
				}),
 	 user_id: req.body.user_id});
	
});

// POST: /notes
router.post('/', isLoggedIn, function(req, res, next) {
	const user_id = req.body.user_id;
  // const author = req.body.author = req.user._id;
	var author = '';
	if (req.user.isAdmin) {
		// add author to notes
  		author = user_id;
	} else {
		author = req.user._id;
	}
	const notes = req.body.notes;
	
 	const note = new Note({notes: notes,
						author: author,
						});
	
  note.save()
    .then(function() {
	  if (req.user.isAdmin) { res.redirect('/users/' + user_id); }
      else { res.redirect('/users/' + req.user._id); }
    });
});



router.delete("/:id", middleware.checkProfileOwnership, function(req, res){
	Note.findById(req.params.id, async function(err, note){
		if(err){
			req.flash("error", err.message);
			console.log("err");
			return res.redirect("back");
		} 
		try{
			note.remove();
			req.flash("success", "Note Deleted Successfully");
			return res.redirect('/users/' + req.user.id);
			// if (req.user.isAdmin) { res.redirect('/users/' + user_id); }
			// else { res.redirect('/users/' + req.user._id); }
		} catch{
			req.flash("error", err.message);
		console.log("err");
			return res.redirect("back");
		}	
	});
});


module.exports = router;