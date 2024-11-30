var Appointment = require("../models/appointment");

var User = require("../models/user");

// all the middleware goes here
var middlewareObj = {};

middlewareObj.checkProfileOwnership = function(req, res, next){
	if(req.isAuthenticated()){
		User.findById(req.user._id, function(err, foundUser){
			if(err || !foundUser){
				req.flash("error", "something went wrong");
				res.redirect("back");
			} else{
				//does the user own the profile?
				if(foundUser._id.equals(req.user._id)|| req.user.isAdmin){
					next();
				} else{
					req.flash("error", "Current User does not match Requested User");
					res.redirect("back");
				}
			}
		});
	} else{
			req.flash("error", "You need to be logged in!");
        	res.redirect("back");
	}
}


middlewareObj.isLoggedIn = function(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
	req.flash("error", "You need to be Logged in!");
    res.redirect("/login");
}

middlewareObj.isLoggedOut = function(req, res, next){
    if(!req.isAuthenticated()){
        return next();
    }
	req.flash("success", "You're logged into Friendfone!");
    res.redirect("/users/" + req.user.id);
}

middlewareObj.isNotVerified = async function(req, res, next){
	try{
		const user = await User.findOne({ username: req.body.phoneNumber });
		if(user.isVerified){
			return next();
		}
		req.flash("error", "Your account has not been verified. Please check your email to verify your account");
		return res.redirect('/');
		} catch(error){
			console.log(error);
			req.flash("error", "Something went wrong. Please contact us so we can assist. Thank you");
			res.redirect('/');
					  }
}

middlewareObj.isAdmin = function(req, res, next){
	if(req.isAuthenticated()){
		User.findById(req.user._id, function(err, foundUser){
			if(err || !foundUser){
				req.flash("error", "something went wrong");
				res.redirect("back");
			} else{
				//is the user an admin?
				if(req.user.isAdmin){
					next();
				} else{
					req.flash("error", "You're not allowed to do that!");
					res.redirect("back");
				}
			}
		});
	} else{
			req.flash("error", "You need to be logged in!");
        	res.redirect("back");
	}
}

middlewareObj.isSuperAdmin = function(req, res, next){
	if(req.isAuthenticated()){
		User.findById(req.user._id, function(err, foundUser){
			if(err || !foundUser){
				req.flash("error", "something went wrong");
				res.redirect("back");
			} else{
				//is the user a super admin?
				if(req.user.isAdmin && req.user._id == process.env.SUPERADMIN_ID){
					next();
				} else{
					req.flash("error", "You're not allowed to do that!");
					res.redirect("back");
				}
			}
		});
	} else{
			req.flash("error", "You need to be logged in!");
        	res.redirect("back");
	}
}



middlewareObj.checkAppointmentOwnership = function(req, res, next) {
 if(req.isAuthenticated()){
        Appointment.findById(req.params.id, function(err, foundAppointment){
          if(foundAppointment.author.id.equals(req.user._id) || req.user.isAdmin){
			  next();
		  } else {
			 req.flash("error", "You don't have permission to do that!");
             // console.log("BADD!!!");
             res.redirect("/users/" + req.params.id);
		  }
        });
    } else {
		req.flash("error", "You need to be logged in to do that!");
        res.redirect("back");
    }
}


module.exports = middlewareObj;