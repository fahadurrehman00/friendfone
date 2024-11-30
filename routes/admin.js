var express = require("express");
var router = express.Router({mergeParams: true});
var {ObjectId} = require('mongoose').Types.ObjectId; 
var User = require("../models/user");

const {isAdmin} = require("../middleware");
var Code = require("../models/code");
var Unverified = require('../models/unverified');



//get route of admin "/admin"
router.get("/", isAdmin, function (req, res) {

    var noMatch = null;
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        User.find({$or: [{"username": regex}, {"firstName": regex}]}, function (err, foundUsers) {
            if (err) {
                req.flash("error", err.message);
                res.redirect("back");
            } else {
                var noMatch = '';
                if (foundUsers.length === 0) {
                    noMatch = "No user matches that query, please try again";
                }
                Code.find({}, function (err, codes) {
                    if (err) {
                        req.flash("code not correct");
                    }

                    Unverified.find()
                    .populate('appointmentId')
                    .exec( ( err, unverified ) => {
                        if ( err ) {
                            req.flash("error", err.message);
                            res.redirect("back");
                        } else {
                            res.render('admin/index', {
                                users: foundUsers,
                                noMatch,
                                codes,
                                unverified: unverified.filter(uv => uv.appointmentId !== null),
                            });
                        }
                    } );
                });
            }
        });
    } else {
        //get all users from db
        User.find({}, function (err, allUsers) {
            if (err) {
                req.flash("error", err.message);
                res.redirect("back");
            } else {
                Code.find({}, function (err, codes) {
                    if (err) {
                        req.flash("code not correct");
                    }

                    Unverified.find()
                    .populate('appointmentId')
                    .exec( ( err, unverified ) => {
                        if ( err ) {
                            req.flash("error", err.message);
                            res.redirect("back");
                        } else {
                            res.render('admin/index', {
                                users: allUsers,
                                noMatch,
                                codes,
                                unverified: unverified.filter(uv => uv.appointmentId !== null),
                            });
                        }
                    } );
                });

            }
        });
    }
});


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

module.exports = router;
